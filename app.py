import pandas as pd
import pydeck as pdk
import streamlit as st
from math import asin, cos, radians, sin, sqrt

st.set_page_config(page_title="AquaSite", page_icon="💧", layout="wide")

st.markdown(
    """
    <style>
    .stApp {
        background:
          radial-gradient(circle at 85% 8%, rgba(14,165,233,.18), transparent 28%),
          linear-gradient(145deg, #031426 0%, #08233d 52%, #0b3152 100%);
        color: #e6f4ff;
    }
    [data-testid="stHeader"] { background: rgba(3,20,38,.88); }
    [data-testid="stToolbar"] { color: #dbeafe !important; }
    h1 { color: #7dd3fc !important; font-size: 3rem !important; }
    h2, h3 { color: #bae6fd !important; }
    p, label, li, .stMarkdown, [data-testid="stCaptionContainer"] {
        color: #dbeafe !important;
    }
    a { color: #38bdf8 !important; }
    [data-baseweb="tab"] { color: #bfdbfe !important; }
    [aria-selected="true"][data-baseweb="tab"] {
        color: #38bdf8 !important; border-bottom-color: #38bdf8 !important;
    }
    [data-testid="stWidgetLabel"] p { color: #e0f2fe !important; font-weight: 650; }
    [data-testid="stRadio"] label p { color: #e0f2fe !important; }
    [data-baseweb="select"] > div,
    [data-testid="stNumberInput"] input,
    [data-testid="stExpander"] details {
        background: #0b2945 !important; color: #f0f9ff !important;
        border-color: #1d4f73 !important;
    }
    [data-testid="stExpander"] summary { color: #e0f2fe !important; }
    div[data-testid="stMetric"] {
        background: linear-gradient(145deg, rgba(12,49,82,.98), rgba(8,35,61,.98));
        border: 1px solid #2474a6;
        border-radius: 16px; padding: 16px;
        box-shadow: 0 10px 28px rgba(0,0,0,.24);
    }
    div[data-testid="stMetric"] label,
    div[data-testid="stMetric"] [data-testid="stMetricValue"] {
        color: #f0f9ff !important;
    }
    div[data-testid="stAlert"] { border-radius: 14px; }
    div[data-testid="stAlert"] p { color: inherit !important; }
    .mission-card {
        padding: 18px 22px; border-radius: 18px;
        background: linear-gradient(120deg, #075985, #0369a1, #0284c7); color: white;
        box-shadow: 0 14px 32px rgba(2,132,199,.24); margin: 8px 0 18px 0;
    }
    .mission-card h3 { color: white !important; margin: 0 0 5px 0; }
    .mission-card p { margin: 0; font-size: 1.02rem; }
    .map-key {
        background: #0b2945; border-left: 6px solid #38bdf8; padding: 12px 16px;
        border-radius: 10px; color: #e0f2fe; margin: 8px 0;
    }
    [data-testid="stDataFrame"] { border: 1px solid #1d4f73; border-radius: 12px; }
    hr { border-color: #1d4f73 !important; }
    </style>
    """,
    unsafe_allow_html=True,
)

COUNTRIES = {
    "Singapore": {
        "locations": {
            "Jurong demonstration zone": (1.3329, 103.7436, "NoData", -1),
            "Changi demonstration zone": (1.3450, 103.9832, "NoData", -1),
            "Woodlands demonstration zone": (1.4382, 103.7890, "NoData", -1),
            "Tuas demonstration zone": (1.2949, 103.6364, "NoData", -1),
        },
        "benchmark": 2.0,
        "benchmark_name": "IMDA and PUB 10-year WUE ambition",
        "source_note": (
            "Singapore's roadmap reports a 2021 sector median of 2.2 m³/MWh and "
            "aims to help data centres reach 2.0 m³/MWh or lower over 10 years."
        ),
        "authority": "PUB and relevant Singapore planning agencies",
    },
    "Malaysia": {
        "locations": {
            "Johor Bahru demonstration zone": (1.4927, 103.7414, "Low (<10%)", 0),
            "Iskandar Puteri demonstration zone": (1.4200, 103.6300, "Low (<10%)", 0),
            "Cyberjaya demonstration zone": (2.9213, 101.6559, "Low (<10%)", 0),
            "Kuala Lumpur demonstration zone": (3.1390, 101.6869, "Low (<10%)", 0),
            "Kedah stress-test zone": (6.1184, 100.3685, "High (40–80%)", 3),
            "Perlis stress-test zone": (6.4414, 100.1986, "Medium-high (20–40%)", 2),
        },
        "benchmark": 1.8,
        "benchmark_name": "Illustrative AquaSite comparison value",
        "source_note": (
            "Malaysia's planning guideline requires continuous minimum daily water supply "
            "to be considered and encourages efficient and renewable water technologies, "
            "but it does not prescribe one national numerical WUE limit."
        ),
        "authority": "relevant state water supplier, SPAN and planning authority",
    },
}

# Curated public examples, not a complete market inventory. Locations described as
# approximate represent the operator's published campus or district.
DATA_CENTRES = [
    {"name": "SG1", "operator": "Equinix", "country": "Singapore", "lat": 1.2947, "lon": 103.7870, "place": "20 Ayer Rajah Crescent", "precision": "Published address"},
    {"name": "SG3", "operator": "Equinix", "country": "Singapore", "lat": 1.2949, "lon": 103.7876, "place": "26A Ayer Rajah Crescent", "precision": "Published address"},
    {"name": "SG4", "operator": "Equinix", "country": "Singapore", "lat": 1.3343, "lon": 103.8884, "place": "7 Tai Seng Drive", "precision": "Published address"},
    {"name": "SG5", "operator": "Equinix", "country": "Singapore", "lat": 1.3270, "lon": 103.6965, "place": "6 Sunview Drive", "precision": "Published address"},
    {"name": "SIN10", "operator": "Digital Realty", "country": "Singapore", "lat": 1.3284, "lon": 103.7474, "place": "29A International Business Park", "precision": "Published address"},
    {"name": "SIN11", "operator": "Digital Realty", "country": "Singapore", "lat": 1.3750, "lon": 103.9710, "place": "3 Loyang Way", "precision": "Published address"},
    {"name": "SIN12", "operator": "Digital Realty", "country": "Singapore", "lat": 1.3740, "lon": 103.9690, "place": "11 Loyang Close", "precision": "Published address"},
    {"name": "Serangoon DC", "operator": "NTT", "country": "Singapore", "lat": 1.3500, "lon": 103.8700, "place": "Serangoon", "precision": "Approximate district"},
    {"name": "JHB1", "operator": "AirTrunk", "country": "Malaysia", "lat": 1.4550, "lon": 103.6250, "place": "Johor Bahru area", "precision": "Approximate district"},
    {"name": "Cyberjaya 4", "operator": "NTT", "country": "Malaysia", "lat": 2.9185, "lon": 101.6530, "place": "Cyberjaya campus", "precision": "Approximate campus"},
    {"name": "Cyberjaya 5", "operator": "NTT", "country": "Malaysia", "lat": 2.9213, "lon": 101.6559, "place": "Cyberjaya campus", "precision": "Approximate campus"},
    {"name": "Cyberjaya 6", "operator": "NTT", "country": "Malaysia", "lat": 2.9240, "lon": 101.6588, "place": "Cyberjaya campus", "precision": "Approximate campus"},
    {"name": "KVDC", "operator": "TM One", "country": "Malaysia", "lat": 2.9360, "lon": 101.6610, "place": "Cyberjaya", "precision": "Approximate district"},
    {"name": "IPDC", "operator": "TM One", "country": "Malaysia", "lat": 1.4200, "lon": 103.6300, "place": "Iskandar Puteri", "precision": "Approximate district"},
]

SCENARIOS = {
    "Efficient design": {
        "capacity": 20.0,
        "wue_delta": -0.4,
        "cooling": "Hybrid cooling",
        "source": "Recycled or reclaimed water",
        "peak_factor": 1.10,
    },
    "Starting benchmark": {
        "capacity": 20.0,
        "wue_delta": 0.0,
        "cooling": "Evaporative cooling",
        "source": "Potable water",
        "peak_factor": 1.20,
    },
    "Water-intensive design": {
        "capacity": 50.0,
        "wue_delta": 0.8,
        "cooling": "Evaporative cooling",
        "source": "Potable water",
        "peak_factor": 1.35,
    },
}


def calculate_demand(capacity_mw, wue, peak_factor):
    normal_m3_day = capacity_mw * 24 * wue
    peak_m3_day = normal_m3_day * peak_factor
    annual_m3 = capacity_mw * 8760 * wue
    return normal_m3_day, peak_m3_day, annual_m3


def distance_km(lat1, lon1, lat2, lon2):
    """Great-circle distance for the exploratory cluster prompt."""
    earth_radius_km = 6371
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    return 2 * earth_radius_km * asin(sqrt(a))


st.title("💧 AquaSite")
st.write(
    "A transparent first screen for the water implications of proposed data centres "
    "in Singapore and Malaysia."
)
st.info(
    "Your mission: design a lower-water data centre without hiding local risk. "
    "Change the proposal and try to unlock Proceed with conditions."
)
st.markdown(
    """
    <div class="mission-card">
      <h3>🎮 The AquaSite Siting Challenge</h3>
      <p>Reduce water demand, close the evidence gaps and unlock the Water Guardian badge.</p>
    </div>
    """,
    unsafe_allow_html=True,
)

st.header("1  Choose a place")
place_col1, place_col2 = st.columns(2)
with place_col1:
    country = st.selectbox("Country", list(COUNTRIES))
with place_col2:
    location = st.selectbox("Demonstration location", list(COUNTRIES[country]["locations"]))

country_data = COUNTRIES[country]
selected_location_data = country_data["locations"][location]
water_stress_label = selected_location_data[2]
water_stress_category = selected_location_data[3]

st.header("2  Choose a starting scenario")
scenario_name = st.radio(
    "Facility scenario",
    list(SCENARIOS),
    horizontal=True,
    help="Choose a preset, then adjust it below if needed.",
)
scenario = SCENARIOS[scenario_name]

with st.expander("Adjust facility assumptions", expanded=True):
    input_col1, input_col2, input_col3 = st.columns(3)
    with input_col1:
        capacity_mw = st.number_input(
            "IT capacity in MW",
            min_value=1.0,
            max_value=500.0,
            value=scenario["capacity"],
            step=1.0,
            format="%.0f",
            help="The electrical capacity used by computing equipment.",
        )
        wue_default = max(0.0, country_data["benchmark"] + scenario["wue_delta"])
        wue = st.number_input(
            "Water Usage Effectiveness in m³/MWh",
            min_value=0.0,
            max_value=10.0,
            value=wue_default,
            step=0.1,
            format="%.1f",
            help="Lower WUE means greater water efficiency.",
        )
    with input_col2:
        cooling_choices = [
            "Hybrid cooling",
            "Air cooling",
            "Liquid cooling",
            "Evaporative cooling",
            "Unknown",
        ]
        cooling_system = st.selectbox(
            "Cooling approach",
            cooling_choices,
            index=cooling_choices.index(scenario["cooling"]),
        )
        source_choices = [
            "Recycled or reclaimed water",
            "Closed-loop system",
            "Mixed supply",
            "Potable water",
            "Unknown",
        ]
        water_source = st.selectbox(
            "Primary water source",
            source_choices,
            index=source_choices.index(scenario["source"]),
        )
    with input_col3:
        peak_factor = st.slider(
            "Peak-demand factor",
            min_value=1.0,
            max_value=1.5,
            value=scenario["peak_factor"],
            step=0.05,
            help="Illustrative uplift for a peak or constrained operating period.",
        )

st.header("3  Confirm the available evidence")
st.caption("Choose Unknown unless a utility, regulator or project document has confirmed the information.")
evidence_col1, evidence_col2, evidence_col3 = st.columns(3)
with evidence_col1:
    headroom_status = st.selectbox(
        "Local water-system headroom", ["Unknown", "Confirmed", "Not adequate"]
    )
with evidence_col2:
    cumulative_status = st.selectbox(
        "Nearby cumulative demand", ["Unknown", "Assessed", "Not assessed"]
    )
with evidence_col3:
    safeguard_status = st.selectbox(
        "Community or ecological safeguard",
        ["No known trigger", "Unknown", "Triggered"],
    )

with st.expander("👥 Add community context", expanded=False):
    st.caption(
        "Use the population connected to the same local water system—not the total national population. "
        "These inputs create a screening prompt, not a social-impact assessment."
    )
    community_col1, community_col2 = st.columns(2)
    with community_col1:
        shared_population = st.number_input(
            "Population sharing the local water system",
            min_value=1_000,
            max_value=5_000_000,
            value=100_000,
            step=10_000,
            help="Enter a utility service-area or local planning estimate where available.",
        )
        water_dependence = st.selectbox(
            "Dependence on the same potable-water supply",
            ["Unknown", "High", "Moderate", "Low"],
        )
    with community_col2:
        sensitive_receptors = st.multiselect(
            "Water-sensitive users nearby",
            ["Hospitals", "Schools", "Public housing", "Small businesses", "Water-dependent livelihoods"],
            help="Select only users identified within the relevant service area.",
        )
        consultation_status = st.selectbox(
            "Community engagement status",
            ["Not started", "Planned", "In progress", "Completed and documented"],
        )

normal_m3_day, peak_m3_day, annual_m3 = calculate_demand(capacity_mw, wue, peak_factor)
benchmark_peak = capacity_mw * 24 * country_data["benchmark"] * peak_factor
difference_pct = ((peak_m3_day - benchmark_peak) / benchmark_peak * 100) if benchmark_peak else 0
community_litres_per_person = peak_m3_day * 1000 / shared_population

# A transparent screening index. It prioritises conditions that could intensify
# competition for shared water; it is not a measured health or welfare impact.
community_pressure_score = 0
community_pressure_score += 25 if water_source == "Potable water" else 10 if water_source == "Mixed supply" else 0
community_pressure_score += 25 if headroom_status == "Not adequate" else 15 if headroom_status == "Unknown" else 0
community_pressure_score += 20 if water_stress_category >= 3 else 12 if water_stress_category == 2 else 8 if water_stress_category == -1 else 0
community_pressure_score += 12 if cumulative_status != "Assessed" else 0
community_pressure_score += min(10, len(sensitive_receptors) * 2)
community_pressure_score += 8 if consultation_status == "Not started" else 4 if consultation_status == "Planned" else 0
community_pressure_score = min(100, community_pressure_score)
if community_pressure_score >= 70:
    community_pressure_level = "High priority"
elif community_pressure_score >= 40:
    community_pressure_level = "Needs safeguards"
else:
    community_pressure_level = "Lower concern"

evidence_gaps = []
if headroom_status == "Unknown":
    evidence_gaps.append("local water-system headroom")
if cumulative_status != "Assessed":
    evidence_gaps.append("cumulative demand from nearby developments")
if safeguard_status == "Unknown":
    evidence_gaps.append("community and ecological safeguards")
if water_source == "Unknown":
    evidence_gaps.append("primary water source")
if cooling_system == "Unknown":
    evidence_gaps.append("cooling approach")
if water_stress_label == "NoData":
    evidence_gaps.append("Aqueduct 4.0 baseline water-stress coverage")
if water_dependence == "Unknown":
    evidence_gaps.append("community dependence on the shared potable-water system")
if consultation_status != "Completed and documented":
    evidence_gaps.append("documented community engagement")

if safeguard_status == "Triggered" or headroom_status == "Not adequate":
    decision = "Exclude or redesign"
    explanation = "A binding water, community or ecological safeguard has failed."
    decision_type = "error"
elif evidence_gaps:
    decision = "Further evidence required"
    explanation = "Critical evidence is missing. AquaSite does not interpret missing data as safety."
    decision_type = "warning"
elif wue > country_data["benchmark"] and water_source == "Potable water":
    decision = "Redesign before review"
    explanation = "The design exceeds the comparison benchmark and relies primarily on potable water."
    decision_type = "error"
else:
    decision = "Proceed with conditions"
    explanation = "The proposal passes this first screen, subject to formal verification."
    decision_type = "success"

# Turn the full interface into an immediate decision signal.
if decision_type == "error" or community_pressure_score >= 70:
    page_signal = "RED"
    signal_title = "Do not proceed without redesign"
    signal_explanation = "A binding safeguard, capacity failure or high-priority community concern is present."
    page_background = "radial-gradient(circle at 85% 8%, rgba(239,68,68,.28), transparent 30%), linear-gradient(145deg, #21070b 0%, #451018 52%, #67151d 100%)"
    signal_colour = "#fca5a5"
elif decision_type == "warning" or community_pressure_score >= 40:
    page_signal = "AMBER"
    signal_title = "Pause and resolve the evidence gaps"
    signal_explanation = "The site may be viable, but water and community safeguards are not yet demonstrated."
    page_background = "radial-gradient(circle at 85% 8%, rgba(245,158,11,.25), transparent 30%), linear-gradient(145deg, #211303 0%, #3f2608 52%, #55340a 100%)"
    signal_colour = "#fcd34d"
else:
    page_signal = "GREEN"
    signal_title = "Proceed with verified conditions"
    signal_explanation = "This first screen shows lower concern, subject to formal validation and monitoring."
    page_background = "radial-gradient(circle at 85% 8%, rgba(34,197,94,.22), transparent 30%), linear-gradient(145deg, #031b16 0%, #073b2b 52%, #07533a 100%)"
    signal_colour = "#86efac"

st.markdown(
    f"""
    <style>
    .stApp {{ background: {page_background} !important; }}
    .decision-signal {{
        border: 2px solid {signal_colour}; border-radius: 18px; padding: 18px 22px;
        background: rgba(3, 12, 24, .72); box-shadow: 0 12px 30px rgba(0,0,0,.25);
        margin: 6px 0 18px 0;
    }}
    .decision-signal strong {{ color: {signal_colour}; font-size: 1.25rem; }}
    .decision-signal span {{ color: #f8fafc; }}
    </style>
    """,
    unsafe_allow_html=True,
)

st.divider()
st.header("Screening result")
st.markdown(
    f'<div class="decision-signal"><strong>{page_signal}: {signal_title}</strong><br>'
    f'<span>{signal_explanation}</span></div>',
    unsafe_allow_html=True,
)
message = f"**{decision}**\n\n{explanation}"
if decision_type == "error":
    st.error(message)
elif decision_type == "warning":
    st.warning(message)
else:
    st.success(message)

# The mission score is an engagement aid, separate from the screening decision.
mission_score = 100
mission_score -= min(30, max(0, int((wue - country_data["benchmark"]) * 25)))
mission_score -= int(max(0, peak_factor - 1.0) * 40)
mission_score -= 15 if water_source == "Potable water" else 0
mission_score -= 10 * len(evidence_gaps)
mission_score -= 20 if water_stress_category >= 3 else 0
if safeguard_status == "Triggered" or headroom_status == "Not adequate":
    mission_score = min(mission_score, 25)
mission_score = max(0, min(100, mission_score))

if mission_score >= 80:
    mission_badge = "🏆 Water Guardian"
elif mission_score >= 60:
    mission_badge = "🌊 Responsible Planner"
elif mission_score >= 40:
    mission_badge = "🛠️ Redesign in progress"
else:
    mission_badge = "🚧 Safeguard alert"

score_col1, score_col2 = st.columns([1, 2])
with score_col1:
    st.metric("AquaSite mission score", f"{mission_score}/100")
with score_col2:
    st.write(f"### {mission_badge}")
    st.progress(mission_score / 100)
    st.caption("The score encourages exploration. It is not a regulatory approval score.")

metric1, metric2, metric3 = st.columns(3)
metric1.metric("Normal-day demand", f"{normal_m3_day:,.0f} m³/day")
metric2.metric("Peak scenario", f"{peak_m3_day:,.0f} m³/day")
metric3.metric(
    "Against comparison value",
    "At benchmark"
    if abs(difference_pct) < 0.05
    else f"{abs(difference_pct):.0f}% {'above' if difference_pct > 0 else 'below'}",
)

st.write("**Try your next move**")
next_moves = []
if water_source == "Potable water":
    next_moves.append("Switch to recycled or reclaimed water.")
if wue > country_data["benchmark"]:
    next_moves.append("Lower WUE by changing the cooling design.")
if evidence_gaps:
    next_moves.append("Confirm the missing evidence shown below.")
if not next_moves:
    next_moves.append("Stress-test the proposal with a higher peak-demand factor.")
for move in next_moves[:3]:
    st.write(f"- {move}")

if evidence_gaps:
    st.write("**What must be checked next**")
    for item in evidence_gaps:
        st.write(f"- Confirm {item} with the appropriate authority or project evidence.")

result_tab, community_tab, map_tab, method_tab = st.tabs(
    ["📄 Plain-language result", "👥 Community impact", "🗺️ Water-stress map", "🧪 Method and sources"]
)

with result_tab:
    st.subheader("Water Capacity Impact Statement")
    st.write(
        f"A proposed **{capacity_mw:.0f} MW** data centre in the **{location}** is estimated to use "
        f"**{normal_m3_day:,.0f} m³/day** under normal conditions and **{peak_m3_day:,.0f} m³/day** "
        f"under the selected peak scenario. The estimate assumes a WUE of **{wue:.1f} m³/MWh**, "
        f"**{cooling_system.lower()}** and **{water_source.lower()}**. AquaSite's preliminary outcome "
        f"is **{decision.lower()}**. Validation is required from the {country_data['authority']}."
    )
    st.caption(
        f"Comparison reference: {country_data['benchmark_name']} at "
        f"{country_data['benchmark']:.1f} m³/MWh."
    )

with community_tab:
    st.subheader("Community Water Impact Screen")
    st.write(
        "This screen asks whether the proposed facility could intensify competition for water "
        "shared with residents and essential services. It does not claim that the facility will "
        "remove this amount from household supply."
    )
    community_metric1, community_metric2, community_metric3 = st.columns(3)
    community_metric1.metric("Community pressure score", f"{community_pressure_score}/100")
    community_metric2.metric("Screening level", community_pressure_level)
    community_metric3.metric(
        "Peak demand ÷ shared population",
        f"{community_litres_per_person:,.1f} L/person/day",
        help="A scale comparison using your population input—not predicted household water loss.",
    )
    st.progress(community_pressure_score / 100)
    if community_pressure_score >= 70:
        st.error("🚨 High-priority community review: pause siting until shared-system capacity, vulnerable users and drought protections are verified.")
    elif community_pressure_score >= 40:
        st.warning("⚠️ Safeguards required: resolve the highlighted evidence and engagement gaps before approval.")
    else:
        st.success("✅ Lower screening concern, subject to verification and continuing community safeguards.")

    impact_col1, impact_col2 = st.columns(2)
    with impact_col1:
        st.write("**Who may be affected**")
        if sensitive_receptors:
            for receptor in sensitive_receptors:
                st.write(f"- {receptor}")
        else:
            st.write("- No sensitive users entered yet—confirm this through local mapping and engagement.")
        st.write(f"- Shared-system population used: **{shared_population:,} people**")
        st.write(f"- Potable-water dependence: **{water_dependence}**")
    with impact_col2:
        st.write("**Community safeguards to unlock**")
        safeguard_actions = []
        if water_source in ["Potable water", "Mixed supply"]:
            safeguard_actions.append("Demonstrate how potable-water use will be reduced or substituted.")
        if headroom_status != "Confirmed":
            safeguard_actions.append("Obtain written utility confirmation of normal and drought-period headroom.")
        if cumulative_status != "Assessed":
            safeguard_actions.append("Assess combined demand from existing and approved developments.")
        if consultation_status != "Completed and documented":
            safeguard_actions.append("Document engagement, concerns raised and how the design changed in response.")
        if not sensitive_receptors:
            safeguard_actions.append("Map hospitals, schools, housing and water-dependent livelihoods in the service area.")
        for action in safeguard_actions or ["Maintain disclosure and a drought-response operating plan."]:
            st.write(f"- {action}")

    st.info(
        f"**Community narrative:** At peak operation, the proposed facility's modelled demand is "
        f"**{peak_m3_day:,.0f} m³/day**. Dividing that by the entered shared-system population gives "
        f"**{community_litres_per_person:,.1f} litres per person per day** as a scale comparison. "
        f"The current community screen is **{community_pressure_level.lower()}** and requires local validation."
    )

with map_tab:
    st.subheader("AquaSite Explorer")
    st.write(
        "Scout the region, reveal infrastructure clusters and test whether a proposed site "
        "needs a water-risk alert. Hover over any marker for details."
    )
    control1, control2, control3 = st.columns([1, 1, 2])
    with control1:
        show_stress = st.checkbox("Show stress overlay", value=True)
    with control2:
        show_centres = st.checkbox("Show data centres", value=True)
    with control3:
        overlay_strength = st.slider("Overlay visibility", 80, 230, 180, 10)

    selected_lat, selected_lon = selected_location_data[0], selected_location_data[1]
    nearby_centres = []
    for centre in DATA_CENTRES:
        proximity = distance_km(selected_lat, selected_lon, centre["lat"], centre["lon"])
        if proximity <= 35:
            nearby_centres.append({**centre, "distance_km": proximity})

    alert1, alert2, alert3 = st.columns(3)
    alert1.metric("Operating examples shown", len(DATA_CENTRES))
    alert2.metric("Within 35 km", len(nearby_centres))
    alert3.metric("Selected stress signal", water_stress_label)
    if water_stress_category >= 3:
        st.error("🚨 WATER-STRESS ALERT — High baseline-stress signal. Redesign freshwater-intensive cooling and verify basin, utility and seasonal conditions.")
    elif water_stress_category == 2:
        st.warning("⚠️ WATER-STRESS WATCH — Medium-high baseline signal. Test a lower-water design and obtain local supply evidence.")
    elif water_stress_label == "NoData":
        st.warning("🟣 EVIDENCE-GAP ALERT — NoData does not mean no risk. Local water-capacity evidence is required.")
    else:
        st.success("🟢 REGIONAL SCREEN — Baseline stress is low, but local headroom and cumulative demand still need verification.")
    if len(nearby_centres) >= 2:
        st.info(f"🏙️ CLUSTER WATCH — {len(nearby_centres)} documented facilities are within 35 km. Ask the utility to assess their combined demand.")

    st.caption("The map now zooms to your selected site. Scroll to zoom, drag to pan and hover for details.")

    selected_site_data = pd.DataFrame(
        [{
            "lat": selected_lat,
            "lon": selected_lon,
            "Name": "Proposed site",
            "Type": location,
            "Layer meaning": f"Water-stress signal: {water_stress_label}",
            "Country": country,
        }]
    )
    site_layer = pdk.Layer(
        "ScatterplotLayer",
        data=selected_site_data,
        get_position="[lon, lat]",
        get_radius=2200 if country == "Singapore" else 6500,
        radius_min_pixels=10,
        radius_max_pixels=18,
        get_fill_color=[14, 165, 233, 255],
        stroked=True,
        get_line_color=[255, 255, 255, 255],
        line_width_min_pixels=3,
        pickable=True,
    )

    malaysia_boundary_url = (
        "https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/9469f09/"
        "releaseData/gbOpen/MYS/ADM1/geoBoundaries-MYS-ADM1_simplified.geojson"
    )
    singapore_boundary_url = (
        "https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/main/"
        "releaseData/gbOpen/SGP/ADM0/geoBoundaries-SGP-ADM0_simplified.geojson"
    )
    if country == "Malaysia":
        stress_polygon_layer = pdk.Layer(
            "GeoJsonLayer",
            data=malaysia_boundary_url,
            opacity=overlay_strength / 255,
            stroked=True,
            filled=True,
            get_fill_color=(
                "properties.shapeName === 'Kedah' ? [249,115,22,190] : "
                "properties.shapeName === 'Perlis' ? [250,204,21,190] : "
                "properties.shapeName === 'Johor' ? [34,197,94,160] : "
                "properties.shapeName === 'Selangor' ? [34,197,94,160] : "
                "properties.shapeName === 'Kuala Lumpur' ? [34,197,94,160] : [34,197,94,115]"
            ),
            get_line_color=[186, 230, 253, 210],
            line_width_min_pixels=1,
            pickable=False,
        )
        risk_label_data = pd.DataFrame(
            [
                {"lat": 6.10, "lon": 100.52, "label": "KEDAH · HIGH"},
                {"lat": 6.47, "lon": 100.20, "label": "PERLIS · MED-HIGH"},
                {"lat": 5.35, "lon": 100.46, "label": "PENANG · LOW"},
                {"lat": 4.72, "lon": 101.05, "label": "PERAK · LOW"},
                {"lat": 5.35, "lon": 102.05, "label": "KELANTAN · LOW"},
                {"lat": 5.05, "lon": 103.02, "label": "TERENGGANU · LOW"},
                {"lat": 3.85, "lon": 102.35, "label": "PAHANG · LOW"},
                {"lat": 3.35, "lon": 101.38, "label": "SELANGOR · LOW"},
                {"lat": 3.14, "lon": 101.69, "label": "KUALA LUMPUR · LOW"},
                {"lat": 2.92, "lon": 101.70, "label": "PUTRAJAYA · LOW"},
                {"lat": 2.75, "lon": 102.22, "label": "NEGERI SEMBILAN · LOW"},
                {"lat": 2.25, "lon": 102.25, "label": "MELAKA · LOW"},
                {"lat": 2.05, "lon": 103.35, "label": "JOHOR · LOW"},
                {"lat": 3.10, "lon": 113.15, "label": "SARAWAK · LOW"},
                {"lat": 5.45, "lon": 117.05, "label": "SABAH · LOW"},
                {"lat": 5.30, "lon": 115.23, "label": "LABUAN · LOW"},
            ]
        )
        risk_label_layer = pdk.Layer(
            "TextLayer",
            data=risk_label_data,
            get_position="[lon, lat]",
            get_text="label",
            get_size=16,
            get_color=[255, 255, 255, 255],
            get_angle=0,
            get_text_anchor="'middle'",
            get_alignment_baseline="'center'",
            billboard=True,
            pickable=False,
        )
    else:
        stress_polygon_layer = pdk.Layer(
            "GeoJsonLayer",
            data=singapore_boundary_url,
            opacity=overlay_strength / 255,
            stroked=True,
            filled=True,
            get_fill_color=[147, 51, 234, 150],
            get_line_color=[216, 180, 254, 235],
            line_width_min_pixels=2,
            pickable=False,
        )

    scope = st.radio(
        "Data-centre view",
        ["Selected country", "Singapore + Malaysia"],
        horizontal=True,
        help="Use the regional view to explore cross-border clustering.",
    )
    visible_centres = [
        centre for centre in DATA_CENTRES
        if scope == "Singapore + Malaysia" or centre["country"] == country
    ]
    centre_data = pd.DataFrame(
        [
            {
                **centre,
                "Name": f"{centre['operator']} {centre['name']}",
                "Type": "Operating data centre (public example)",
                "Country": centre["country"],
                "Layer meaning": f"{centre['place']} · {centre['precision']}",
            }
            for centre in visible_centres
        ]
    )
    centre_layer = pdk.Layer(
        "ScatterplotLayer",
        data=centre_data,
        get_position="[lon, lat]",
        get_radius=1600 if country == "Singapore" else 3800,
        radius_min_pixels=6,
        radius_max_pixels=13,
        get_fill_color=[250, 204, 21, 245],
        stroked=True,
        get_line_color=[120, 53, 15, 255],
        line_width_min_pixels=2,
        pickable=True,
    )
    active_layers = []
    if show_stress:
        active_layers.append(stress_polygon_layer)
        if country == "Malaysia":
            active_layers.append(risk_label_layer)
    active_layers.append(site_layer)
    if show_centres:
        active_layers.append(centre_layer)

    if country == "Malaysia":
        map_focus = st.radio(
            "Map focus",
            ["Malaysia stress overview", "Selected site"],
            horizontal=True,
            help="Overview reveals the stressed northern states; Selected site zooms into your proposal.",
        )
    else:
        map_focus = "Selected site"
    if map_focus == "Malaysia stress overview":
        map_latitude, map_longitude, map_zoom = 4.45, 101.55, 5.25
    else:
        map_latitude, map_longitude = selected_lat, selected_lon
        map_zoom = 9.4 if country == "Singapore" else 7.0
    view_state = pdk.ViewState(
        latitude=map_latitude,
        longitude=map_longitude,
        zoom=map_zoom,
        pitch=12,
    )
    deck = pdk.Deck(
        layers=active_layers,
        initial_view_state=view_state,
        tooltip={
            "html": "<b>{Name}</b><br/>{Type}<br/>{Layer meaning}<br/>{Country}",
            "style": {"backgroundColor": "#102A43", "color": "white"},
        },
        map_style="https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
    )
    st.pydeck_chart(deck, width="stretch", height=540)

    legend1, legend2, legend3, legend4, legend5 = st.columns(5)
    legend1.markdown("🟢 **Low**")
    legend2.markdown("🟡 **Medium-high**")
    legend3.markdown("🟠 **High**")
    legend4.markdown("🟣 **NoData**")
    legend5.markdown("🟡 **Existing centre** · 🔵 **Proposed site**")

    if country == "Malaysia":
        stress_card1, stress_card2 = st.columns(2)
        stress_card1.warning("🟠 **Kedah — High (40–80%)**\n\nPriority area for deeper seasonal and basin-level review.")
        stress_card2.warning("🟡 **Perlis — Medium-high (20–40%)**\n\nRequire local supply and cumulative-demand verification.")

    st.write("**Nearest documented facilities**")
    if nearby_centres:
        nearest_table = pd.DataFrame(sorted(nearby_centres, key=lambda item: item["distance_km"])[:5])
        nearest_table["Distance"] = nearest_table["distance_km"].map(lambda value: f"{value:.1f} km")
        nearest_table["Facility"] = nearest_table["operator"] + " " + nearest_table["name"]
        st.dataframe(
            nearest_table[["Facility", "place", "Distance", "precision"]].rename(
                columns={"place": "Public location", "precision": "Location precision"}
            ),
            hide_index=True,
            width="stretch",
        )
    else:
        st.caption("No facility in this curated public sample is within 35 km.")

    st.markdown(
        """
        <div class="map-key"><b>Map guide</b> — coloured state polygons show the available
        province-level WRI screening result. Select Kedah or Perlis above to jump directly to
        a stressed area. A green regional result still requires a local utility check.</div>
        """,
        unsafe_allow_html=True,
    )

    st.caption(
        "Source: WRI Aqueduct 4.0 country and province rankings, total-use weighting. "
        "Singapore is shown as NoData because the 2023 rankings file does not return a baseline "
        "water-stress category for it. Malaysian colours follow administrative boundaries and "
        "represent province-level aggregates, not sub-basin or utility-service boundaries."
    )
    st.caption(
        "Facility markers are a curated, non-exhaustive set of operator-reported operating sites. "
        "Markers labelled approximate show a campus or district, not an exact facility footprint."
    )
    st.warning(
        "A low regional category does not establish local utility headroom. Aqueduct is a "
        "prioritisation layer and must be combined with local water-system evidence."
    )

with method_tab:
    st.subheader("How demand is calculated")
    st.latex(r"\text{Normal daily demand} = \text{IT capacity} \times 24 \times \text{WUE}")
    st.latex(r"\text{Peak demand} = \text{Normal daily demand} \times \text{peak factor}")
    st.write("**How the community screen works**")
    st.write(
        "The 0–100 screening score adds disclosed points for potable-water reliance, uncertain or "
        "inadequate utility headroom, water stress or missing stress data, unassessed cumulative "
        "demand, sensitive users and incomplete engagement. It is a prioritisation index—not a "
        "measured social impact, approval score or prediction of household water loss."
    )
    st.latex(
        r"\text{Scale comparison} = \frac{\text{facility peak demand}\times 1000}"
        r"{\text{population sharing the water system}}"
    )
    st.write(f"**Country context**\n\n{country_data['source_note']}")
    st.write(
        "**Important limitations**\n"
        "- AquaSite currently estimates direct operational water only.\n"
        "- Location markers do not show actual projects or confidential utility capacity.\n"
        "- The peak factor is illustrative until project-specific data are available.\n"
        "- A comparison benchmark is not automatically a statutory approval threshold.\n"
        "- The tool supports screening and does not grant regulatory approval."
    )
    st.markdown(
        "**Sources**\n\n"
        "- [Singapore Green Data Centre Roadmap](https://www.imda.gov.sg/-/media/imda/files/"
        "news-and-events/media-room/media-releases/2024/05/green-dc-roadmap.pdf)\n"
        "- [Malaysia Planning Guideline for Data Centre](https://jpbd.penang.gov.my/images/"
        "faris/pdf/2025/GARIS%20PANDUAN/GPP%20PUSAT%20DATA%20-%20ENG.pdf)\n"
        "- [WRI Aqueduct 4.0 country rankings](https://www.wri.org/data/"
        "aqueduct-40-country-rankings)\n"
        "- [Equinix Singapore facilities](https://www.equinix.com/data-centers/"
        "asia-pacific-colocation/singapore-colocation)\n"
        "- [Digital Realty Singapore facilities](https://www.digitalrealty.com/"
        "data-centers/asia-pacific/singapore)\n"
        "- [NTT Asia-Pacific data centres](https://services.global.ntt/en-us/services-and-products/"
        "global-data-centers/global-locations/asia-pacific)\n"
        "- [AirTrunk JHB1](https://airtrunk.com/airtrunk-opens-ai-ready-data-centre-in-malaysia-"
        "accelerating-innovation-and-the-energy-transition/)\n"
        "- [TM One data-centre overview](https://www.tmone.com.my/think-tank/"
        "accelerate-digital-transformation-in-bfsi-energy-and-industry/)"
    )

st.caption("AquaSite prototype — demonstration purposes only.")
