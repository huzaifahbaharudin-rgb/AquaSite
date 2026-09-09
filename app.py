import pandas as pd
import pydeck as pdk
import streamlit as st
from math import asin, cos, radians, sin, sqrt

st.set_page_config(page_title="AquaSite", page_icon="💧", layout="wide")

# -----------------------------
# Premium AquaSite visual system
# -----------------------------
st.markdown(
    """
    <style>
    .stApp {
        background:
          radial-gradient(circle at 84% 7%, rgba(14,165,233,.14), transparent 28%),
          linear-gradient(145deg, #031426 0%, #08233d 52%, #0b3152 100%);
        color: #e6f4ff;
        font-size: 17px;
    }
    .block-container {
        max-width: 1380px;
        padding-top: 2.2rem;
        padding-bottom: 4rem;
        padding-left: 2.4rem;
        padding-right: 2.4rem;
    }
    [data-testid="stHeader"] {
        background: rgba(3,20,38,.72) !important;
        backdrop-filter: blur(18px);
        border-bottom: 1px solid rgba(125,211,252,.08);
    }
    [data-testid="stToolbar"] { color: #dbeafe !important; }
    #MainMenu, footer { visibility: hidden; }

    h1 {
        font-size: clamp(2.8rem, 5vw, 4.8rem) !important;
        line-height: .98 !important;
        letter-spacing: -.045em !important;
        margin-bottom: .6rem !important;
        background: linear-gradient(90deg, #f0f9ff 0%, #7dd3fc 48%, #38bdf8 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
    }
    h2 {
        color: #bae6fd !important;
        font-size: 1.65rem !important;
        letter-spacing: -.025em;
        margin-top: 2.1rem !important;
        margin-bottom: 1rem !important;
    }
    h3 { color: #bae6fd !important; letter-spacing: -.015em; }
    p, label, li, .stMarkdown, [data-testid="stCaptionContainer"] {
        color: #dbeafe !important;
        line-height: 1.55;
    }
    a { color: #38bdf8 !important; }

    .hero-card {
        position: relative;
        overflow: hidden;
        padding: 30px 34px;
        border-radius: 24px;
        background:
          radial-gradient(circle at 90% 10%, rgba(56,189,248,.20), transparent 30%),
          linear-gradient(135deg, rgba(8,47,73,.95), rgba(6,32,55,.84));
        border: 1px solid rgba(125,211,252,.22);
        box-shadow: 0 24px 70px rgba(0,0,0,.28);
        margin-bottom: 1.15rem;
    }
    .hero-card:after {
        content: '';
        position: absolute;
        width: 180px; height: 180px;
        right: -55px; bottom: -80px;
        border-radius: 50%;
        border: 1px solid rgba(125,211,252,.18);
        box-shadow: 0 0 0 26px rgba(56,189,248,.025), 0 0 0 54px rgba(56,189,248,.018);
    }
    .hero-card .eyebrow {
        text-transform: uppercase;
        letter-spacing: .14em;
        font-size: .74rem;
        font-weight: 800;
        color: #7dd3fc !important;
        margin-bottom: 7px;
    }
    .hero-card h3 {
        font-size: 1.95rem !important;
        margin: 0 0 .55rem 0 !important;
        color: #f0f9ff !important;
    }
    .hero-card p {
        max-width: 920px;
        font-size: 1.06rem !important;
        color: #cfeeff !important;
        margin: 0 !important;
    }

    .command-card {
        padding: 18px 22px;
        border-radius: 18px;
        background: linear-gradient(135deg, rgba(8,47,73,.94), rgba(6,32,55,.88));
        border: 1px solid rgba(56,189,248,.23);
        box-shadow: 0 16px 45px rgba(0,0,0,.22);
        margin: 4px 0 14px 0;
    }
    .command-card .eyebrow {
        text-transform: uppercase;
        letter-spacing: .12em;
        font-size: .72rem;
        font-weight: 800;
        color: #7dd3fc;
        margin-bottom: 4px;
    }
    .command-card h3 { margin: 0 0 4px 0 !important; color: #f0f9ff !important; }
    .command-card p { margin: 0 !important; color: #bfdbfe !important; }

    .decision-signal {
        padding: 22px 24px;
        border-radius: 20px;
        background: linear-gradient(135deg, rgba(4,25,43,.97), rgba(7,36,60,.94));
        box-shadow: 0 20px 55px rgba(0,0,0,.25);
        margin: 8px 0 16px 0;
    }
    .decision-kicker {
        letter-spacing: .09em;
        text-transform: uppercase;
        font-size: .76rem;
        font-weight: 800;
        color: #94a3b8;
    }
    .decision-title {
        font-size: clamp(1.45rem, 3vw, 2rem);
        font-weight: 850;
        letter-spacing: -.025em;
        margin: 5px 0 7px 0;
    }
    .confidence-row {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        margin-top: 14px;
    }
    .confidence-pill {
        padding: 8px 12px;
        border-radius: 999px;
        background: rgba(15,23,42,.72);
        border: 1px solid rgba(148,163,184,.18);
        color: #e2e8f0;
        font-size: .88rem;
        font-weight: 700;
    }

    .map-key {
        background: rgba(8,38,64,.82);
        border-left: 4px solid #38bdf8;
        border-radius: 12px;
        padding: 12px 15px;
        color: #e0f2fe;
        margin: 8px 0;
    }

    div[data-testid="stMetric"] {
        min-height: 118px;
        padding: 18px !important;
        border-radius: 18px !important;
        background: linear-gradient(145deg, rgba(10,42,70,.93), rgba(6,28,49,.96)) !important;
        border: 1px solid rgba(56,189,248,.18) !important;
        box-shadow: 0 14px 34px rgba(0,0,0,.20) !important;
        transition: transform .18s ease, border-color .18s ease;
    }
    div[data-testid="stMetric"]:hover {
        transform: translateY(-2px);
        border-color: rgba(125,211,252,.42) !important;
    }
    div[data-testid="stMetric"] label {
        font-size: .78rem !important;
        text-transform: uppercase;
        letter-spacing: .06em;
        color: #93c5fd !important;
    }
    div[data-testid="stMetric"] [data-testid="stMetricValue"] {
        color: #f0f9ff !important;
        font-size: 1.6rem !important;
        letter-spacing: -.025em;
    }

    [data-baseweb="select"] > div,
    [data-testid="stNumberInput"] input,
    [data-testid="stMultiSelect"] > div {
        border-radius: 13px !important;
        border: 1px solid rgba(125,211,252,.18) !important;
        background: rgba(8,38,64,.86) !important;
    }
    [data-testid="stWidgetLabel"] p {
        color: #d8efff !important;
        font-weight: 700;
        font-size: .92rem !important;
    }
    [data-testid="stRadio"] > div { gap: 10px; }
    [data-testid="stRadio"] label {
        border-radius: 14px !important;
        border: 1px solid rgba(125,211,252,.16) !important;
        background: rgba(8,38,64,.72) !important;
        padding: 12px 16px !important;
        transition: all .18s ease;
    }
    [data-testid="stRadio"] label:hover {
        transform: translateY(-1px);
        border-color: rgba(56,189,248,.5) !important;
        background: rgba(10,49,82,.88) !important;
    }
    [data-testid="stSlider"] [role="slider"] {
        width: 28px !important;
        height: 28px !important;
        background: #38bdf8 !important;
        border: 3px solid #e0f2fe !important;
        box-shadow: 0 0 0 7px rgba(56,189,248,.13), 0 5px 18px rgba(0,0,0,.28) !important;
    }
    [data-testid="stExpander"] details {
        border-radius: 18px !important;
        border: 1px solid rgba(125,211,252,.15) !important;
        background: rgba(7,31,53,.72) !important;
        box-shadow: 0 10px 30px rgba(0,0,0,.12);
        overflow: hidden;
    }
    [data-testid="stExpander"] summary {
        min-height: 58px;
        font-weight: 750;
        color: #e0f2fe !important;
    }
    [data-testid="stAlert"] {
        border-radius: 16px !important;
        border-width: 1px !important;
        box-shadow: 0 10px 28px rgba(0,0,0,.12);
    }
    [data-testid="stAlert"] p { color: inherit !important; }
    [data-testid="stDataFrame"] {
        border-radius: 16px !important;
        overflow: hidden;
        border: 1px solid rgba(125,211,252,.16) !important;
        box-shadow: 0 12px 36px rgba(0,0,0,.16);
    }
    [data-testid="stDeckGlJsonChart"] {
        border-radius: 22px;
        overflow: hidden;
        border: 1px solid rgba(125,211,252,.19);
        box-shadow: 0 22px 60px rgba(0,0,0,.26);
    }
    hr {
        border: 0 !important;
        height: 1px !important;
        background: linear-gradient(90deg, transparent, rgba(125,211,252,.20), transparent) !important;
        margin: 2rem 0 !important;
    }
    @media (max-width: 900px) {
        .block-container { padding-left: 1rem; padding-right: 1rem; }
        .hero-card { padding: 22px; }
        div[data-testid="stMetric"] { min-height: 104px; }
    }
    </style>
    """,
    unsafe_allow_html=True,
)

# -----------------------------
# Data and assumptions
# -----------------------------
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
            "to be considered and encourages efficient and renewable-water technologies, "
            "but it does not prescribe one national numerical WUE limit."
        ),
        "authority": "relevant state water supplier, SPAN and planning authority",
    },
}

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
    earth_radius_km = 6371
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    return 2 * earth_radius_km * asin(sqrt(a))

# -----------------------------
# Hero / site controls
# -----------------------------
st.title("💧 AquaSite")
st.markdown(
    """
    <div class="hero-card">
      <div class="eyebrow">Pre-development water safeguard screening</div>
      <h3>Should this data centre be built here?</h3>
      <p>AquaSite screens proposed sites for water demand, local system capacity,
      regional water stress and community safeguards — before development decisions
      are locked in.</p>
    </div>
    """,
    unsafe_allow_html=True,
)
st.caption("Adjust the proposal below and see whether the site should PROCEED, MITIGATE or STOP.")

st.header("1  Select the site")
place_col1, place_col2 = st.columns(2)
with place_col1:
    country = st.selectbox("Country", list(COUNTRIES))
with place_col2:
    location = st.selectbox("Demonstration location", list(COUNTRIES[country]["locations"]))

country_data = COUNTRIES[country]
selected_location_data = country_data["locations"][location]
water_stress_label = selected_location_data[2]
water_stress_category = selected_location_data[3]
live_map_placeholder = st.empty()

st.header("2  Choose a starting scenario")
scenario_name = st.radio(
    "Facility scenario",
    list(SCENARIOS),
    horizontal=True,
    help="Choose a preset, then adjust it below.",
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
            "Hybrid cooling", "Air cooling", "Liquid cooling",
            "Evaporative cooling", "Unknown",
        ]
        cooling_system = st.selectbox(
            "Cooling approach",
            cooling_choices,
            index=cooling_choices.index(scenario["cooling"]),
        )
        source_choices = [
            "Recycled or reclaimed water", "Closed-loop system",
            "Mixed supply", "Potable water", "Unknown",
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
    headroom_status = st.selectbox("Local water-system headroom", ["Unknown", "Confirmed", "Not adequate"])
with evidence_col2:
    cumulative_status = st.selectbox("Nearby cumulative demand", ["Unknown", "Assessed", "Not assessed"])
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
        )
        water_dependence = st.selectbox(
            "Dependence on the same potable-water supply",
            ["Unknown", "High", "Moderate", "Low"],
        )
    with community_col2:
        sensitive_receptors = st.multiselect(
            "Water-sensitive users nearby",
            ["Hospitals", "Schools", "Public housing", "Small businesses", "Water-dependent livelihoods"],
        )
        consultation_status = st.selectbox(
            "Community engagement status",
            ["Not started", "Planned", "In progress", "Completed and documented"],
        )

# -----------------------------
# Calculations and screening
# -----------------------------
normal_m3_day, peak_m3_day, annual_m3 = calculate_demand(capacity_mw, wue, peak_factor)
benchmark_peak = capacity_mw * 24 * country_data["benchmark"] * peak_factor
difference_pct = ((peak_m3_day - benchmark_peak) / benchmark_peak * 100) if benchmark_peak else 0
benchmark_annual_m3 = capacity_mw * 8760 * country_data["benchmark"]
annual_water_difference = benchmark_annual_m3 - annual_m3
community_litres_per_person = peak_m3_day * 1000 / shared_population

community_score_components = {
    "Potable-water reliance": 25 if water_source == "Potable water" else 10 if water_source == "Mixed supply" else 0,
    "Utility headroom": 25 if headroom_status == "Not adequate" else 15 if headroom_status == "Unknown" else 0,
    "Regional water stress / missing coverage": 20 if water_stress_category >= 3 else 12 if water_stress_category == 2 else 8 if water_stress_category == -1 else 0,
    "Cumulative demand not assessed": 12 if cumulative_status != "Assessed" else 0,
    "Sensitive users identified": min(10, len(sensitive_receptors) * 2),
    "Community engagement gap": 8 if consultation_status == "Not started" else 4 if consultation_status == "Planned" else 0,
}
community_pressure_score = min(100, sum(community_score_components.values()))

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
    decision = "STOP"
    explanation = "A binding water, community or ecological safeguard has failed."
    decision_type = "error"
elif wue > country_data["benchmark"] and water_source == "Potable water":
    decision = "STOP"
    explanation = "The design exceeds the comparison value while relying primarily on potable water."
    decision_type = "error"
elif evidence_gaps or community_pressure_score >= 40:
    decision = "MITIGATE"
    explanation = "The site may be viable, but evidence or design safeguards remain unresolved."
    decision_type = "warning"
else:
    decision = "PROCEED"
    explanation = "This first screen shows lower concern, subject to formal verification and monitoring."
    decision_type = "success"

evidence_checks = {
    "Utility headroom": headroom_status != "Unknown",
    "Cumulative demand": cumulative_status == "Assessed",
    "Community/ecological safeguard": safeguard_status != "Unknown",
    "Primary water source": water_source != "Unknown",
    "Cooling approach": cooling_system != "Unknown",
    "Regional water-stress coverage": water_stress_label != "NoData",
    "Community water dependence": water_dependence != "Unknown",
    "Community engagement": consultation_status == "Completed and documented",
}
evidence_verified = sum(evidence_checks.values())
evidence_total = len(evidence_checks)
evidence_confidence = round(evidence_verified / evidence_total * 100)

if decision_type == "error" or community_pressure_score >= 70:
    page_signal = "RED"
    signal_title = "STOP — redesign or reconsider the site"
    signal_explanation = "A binding safeguard, capacity failure or high-priority community concern is present."
    signal_colour = "#fca5a5"
elif decision_type == "warning" or community_pressure_score >= 40:
    page_signal = "AMBER"
    signal_title = "MITIGATE — resolve safeguards before proceeding"
    signal_explanation = "The site may be viable, but water or community safeguards are not yet demonstrated."
    signal_colour = "#fcd34d"
else:
    page_signal = "GREEN"
    signal_title = "PROCEED — with verified conditions"
    signal_explanation = "This first screen shows lower concern, subject to formal validation and monitoring."
    signal_colour = "#86efac"

st.markdown(
    f"""
    <style>
    .decision-signal {{
        border: 2px solid {signal_colour};
        border-left: 9px solid {signal_colour};
    }}
    .decision-title {{ color: {signal_colour}; }}
    </style>
    """,
    unsafe_allow_html=True,
)

# -----------------------------
# Live command map
# -----------------------------
signal_rgb = {
    "RED": [239, 68, 68, 245],
    "AMBER": [245, 158, 11, 245],
    "GREEN": [34, 197, 94, 245],
}[page_signal]

live_lat, live_lon = selected_location_data[0], selected_location_data[1]
live_site_data = pd.DataFrame([{
    "lat": live_lat,
    "lon": live_lon,
    "Name": f"Proposed {capacity_mw:.0f} MW site",
    "Type": f"{page_signal}: {signal_title}",
    "Layer meaning": f"Peak demand {peak_m3_day:,.0f} m³/day · Community priority {community_pressure_score}/100",
    "Country": location,
}])

live_boundary_url = (
    "https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/9469f09/"
    "releaseData/gbOpen/MYS/ADM1/geoBoundaries-MYS-ADM1_simplified.geojson"
    if country == "Malaysia"
    else "https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/main/"
    "releaseData/gbOpen/SGP/ADM0/geoBoundaries-SGP-ADM0_simplified.geojson"
)
live_boundary_colour = (
    "properties.shapeName === 'Kedah' ? [249,115,22,175] : "
    "properties.shapeName === 'Perlis' ? [250,204,21,175] : [34,197,94,95]"
    if country == "Malaysia"
    else [147, 51, 234, 115]
)

live_boundary_layer = pdk.Layer(
    "GeoJsonLayer",
    data=live_boundary_url,
    stroked=True,
    filled=True,
    get_fill_color=live_boundary_colour,
    get_line_color=[186, 230, 253, 180],
    line_width_min_pixels=1,
    pickable=False,
)
live_ring_layer = pdk.Layer(
    "ScatterplotLayer",
    data=live_site_data,
    get_position="[lon, lat]",
    get_radius=max(5000, min(28000, peak_m3_day * 3.2)),
    get_fill_color=[signal_rgb[0], signal_rgb[1], signal_rgb[2], 55],
    get_line_color=signal_rgb,
    stroked=True,
    line_width_min_pixels=3,
    pickable=False,
)
live_site_layer = pdk.Layer(
    "ScatterplotLayer",
    data=live_site_data,
    get_position="[lon, lat]",
    get_radius=2200,
    radius_min_pixels=10,
    radius_max_pixels=18,
    get_fill_color=signal_rgb,
    get_line_color=[255, 255, 255, 255],
    stroked=True,
    line_width_min_pixels=3,
    pickable=True,
)

live_centre_data = pd.DataFrame([{
    **centre,
    "Name": f"{centre['operator']} {centre['name']}",
    "Type": "Existing data centre",
    "Layer meaning": centre["place"],
    "Country": centre["country"],
} for centre in DATA_CENTRES if centre["country"] == country])

live_centre_layer = pdk.Layer(
    "ScatterplotLayer",
    data=live_centre_data,
    get_position="[lon, lat]",
    get_radius=1600 if country == "Singapore" else 3800,
    radius_min_pixels=5,
    radius_max_pixels=10,
    get_fill_color=[250, 204, 21, 235],
    get_line_color=[120, 53, 15, 255],
    stroked=True,
    line_width_min_pixels=2,
    pickable=True,
)

live_view = pdk.ViewState(
    latitude=1.36 if country == "Singapore" else 4.15,
    longitude=103.82 if country == "Singapore" else 101.75,
    zoom=9.0 if country == "Singapore" else 5.45,
    pitch=12,
)
live_deck = pdk.Deck(
    layers=[live_boundary_layer, live_ring_layer, live_centre_layer, live_site_layer],
    initial_view_state=live_view,
    tooltip={
        "html": "<b>{Name}</b><br/>{Type}<br/>{Layer meaning}<br/>{Country}",
        "style": {"backgroundColor": "#07182b", "color": "white"},
    },
    map_style="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
)

with live_map_placeholder.container():
    st.markdown(
        f"""
        <div class="command-card">
          <div class="eyebrow">Live decision view</div>
          <h3>{page_signal} · {location}</h3>
          <p>{capacity_mw:.0f} MW proposed site · Adjust any facility or safeguard input below to update the map and decision.</p>
        </div>
        """,
        unsafe_allow_html=True,
    )
    live_metric1, live_metric2, live_metric3, live_metric4 = st.columns(4)
    live_metric1.metric("Live signal", page_signal)
    live_metric2.metric("Peak water demand", f"{peak_m3_day:,.0f} m³/day")
    live_metric3.metric("Community priority", f"{community_pressure_score}/100")
    live_metric4.metric(
        "Annual water vs benchmark",
        f"{abs(annual_water_difference):,.0f} m³",
        delta="saved" if annual_water_difference >= 0 else "additional",
        delta_color="normal" if annual_water_difference >= 0 else "inverse",
    )
    st.pydeck_chart(live_deck, width="stretch", height=460)
    st.markdown(
        '<div class="map-key">🔴 Stop / redesign &nbsp; · &nbsp; 🟠 Mitigate / verify &nbsp; · &nbsp; '
        '🟢 Proceed conditionally &nbsp; · &nbsp; 🟡 Existing data centre<br>'
        '<b>Live response:</b> marker colour follows the decision; halo size grows with peak water demand.</div>',
        unsafe_allow_html=True,
    )

# -----------------------------
# Decision + mitigation
# -----------------------------
st.divider()
st.header("AquaSite decision")
st.markdown(
    f"""
    <div class="decision-signal">
      <div class="decision-kicker">AquaSite safeguard decision</div>
      <div class="decision-title">{signal_title}</div>
      <div>{signal_explanation}</div>
      <div class="confidence-row">
        <span class="confidence-pill">Evidence confidence: {evidence_confidence}%</span>
        <span class="confidence-pill">{evidence_verified}/{evidence_total} inputs verified</span>
        <span class="confidence-pill">Community priority: {community_pressure_level}</span>
      </div>
    </div>
    """,
    unsafe_allow_html=True,
)
st.progress(evidence_confidence / 100)
st.caption("Evidence confidence is separate from risk: a low-data site is never treated as safe by default.")

metric1, metric2, metric3 = st.columns(3)
metric1.metric("Normal-day demand", f"{normal_m3_day:,.0f} m³/day")
metric2.metric("Peak scenario", f"{peak_m3_day:,.0f} m³/day")
metric3.metric(
    "Against comparison value",
    "At benchmark"
    if abs(difference_pct) < 0.05
    else f"{abs(difference_pct):.0f}% {'above' if difference_pct > 0 else 'below'}",
)

st.subheader("What would make this site viable?")
mitigation_actions = []
if water_source == "Potable water":
    mitigation_actions.append(("Reduce freshwater dependency", "Switch to recycled or reclaimed water where technically and regulatorily feasible."))
elif water_source == "Mixed supply":
    mitigation_actions.append(("Reduce potable-water share", "Increase the reclaimed-water fraction and document the potable-water fallback case."))
if wue > country_data["benchmark"]:
    mitigation_actions.append(("Improve water efficiency", f"Reduce WUE toward or below the {country_data['benchmark']:.1f} m³/MWh comparison value."))
if headroom_status != "Confirmed":
    mitigation_actions.append(("Verify utility headroom", "Obtain written confirmation of normal and drought-period capacity from the relevant water authority."))
if cumulative_status != "Assessed":
    mitigation_actions.append(("Assess cumulative demand", "Include existing, approved and proposed nearby developments in the local water-capacity assessment."))
if consultation_status != "Completed and documented":
    mitigation_actions.append(("Close the community safeguard", "Document affected users, engagement, concerns raised and how the design changed in response."))

if mitigation_actions:
    for i, (title, detail) in enumerate(mitigation_actions[:4], 1):
        st.markdown(f"**{i}. {title}**  \n{detail}")
else:
    st.success("No immediate mitigation trigger is identified in this first screen. Maintain monitoring and formal verification.")

if evidence_gaps:
    with st.expander("Evidence still required"):
        for item in evidence_gaps:
            st.write(f"- Confirm {item} with the appropriate authority or project evidence.")

# -----------------------------
# Detailed tabs
# -----------------------------
result_tab, community_tab, map_tab, method_tab = st.tabs(
    ["📄 Decision summary", "👥 Community impact", "🗺️ Water-stress map", "🧪 Method and sources"]
)

with result_tab:
    st.subheader("Water Capacity Impact Statement")
    st.write(
        f"A proposed **{capacity_mw:.0f} MW** data centre in the **{location}** is estimated to use "
        f"**{normal_m3_day:,.0f} m³/day** under normal conditions and **{peak_m3_day:,.0f} m³/day** "
        f"under the selected peak scenario. The estimate assumes a WUE of **{wue:.1f} m³/MWh**, "
        f"**{cooling_system.lower()}** and **{water_source.lower()}**. AquaSite's preliminary outcome "
        f"is **{decision}**. Validation is required from the {country_data['authority']}."
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
    community_metric1.metric("Community screening priority", f"{community_pressure_score}/100")
    community_metric2.metric("Screening level", community_pressure_level)
    community_metric3.metric(
        "Facility-demand scale equivalent",
        f"{community_litres_per_person:,.1f} L/person/day",
        help="Scale comparison only. This is not predicted household water loss or displacement.",
    )
    st.progress(community_pressure_score / 100)

    with st.expander("Why did this site receive this community screening score?"):
        for label, points in community_score_components.items():
            st.write(f"- {label}: **+{points}**")
        st.caption("This is a transparent screening index, not a measured social-impact or health score.")

    if community_pressure_score >= 70:
        st.error("🚨 High-priority review: pause siting until shared-system capacity, vulnerable users and drought protections are verified.")
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
        f"**{community_litres_per_person:,.1f} litres per person per day** as a facility-demand scale equivalent. "
        f"This is not predicted household water loss. The current community screen is "
        f"**{community_pressure_level.lower()}** and requires local validation."
    )

with map_tab:
    st.subheader("AquaSite Explorer")
    st.write(
        "Explore regional water-stress signals, existing data-centre clusters and the selected proposal. "
        "Hover over markers for details."
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

    selected_site_data = pd.DataFrame([{
        "lat": selected_lat,
        "lon": selected_lon,
        "Name": "Proposed site",
        "Type": location,
        "Layer meaning": f"Water-stress signal: {water_stress_label}",
        "Country": country,
    }])

    site_layer = pdk.Layer(
        "ScatterplotLayer",
        data=selected_site_data,
        get_position="[lon, lat]",
        get_radius=2200 if country == "Singapore" else 6500,
        radius_min_pixels=10,
        radius_max_pixels=18,
        get_fill_color=signal_rgb,
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
        risk_label_data = pd.DataFrame([
            {"lat": 6.10, "lon": 100.52, "label": "KEDAH · HIGH"},
            {"lat": 6.47, "lon": 100.20, "label": "PERLIS · MED-HIGH"},
            {"lat": 3.35, "lon": 101.38, "label": "SELANGOR · LOW"},
            {"lat": 3.14, "lon": 101.69, "label": "KUALA LUMPUR · LOW"},
            {"lat": 2.05, "lon": 103.35, "label": "JOHOR · LOW"},
            {"lat": 3.10, "lon": 113.15, "label": "SARAWAK · LOW"},
            {"lat": 5.45, "lon": 117.05, "label": "SABAH · LOW"},
        ])
        risk_label_layer = pdk.Layer(
            "TextLayer",
            data=risk_label_data,
            get_position="[lon, lat]",
            get_text="label",
            get_size=16,
            get_color=[255,255,255,255],
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
            get_fill_color=[147,51,234,150],
            get_line_color=[216,180,254,235],
            line_width_min_pixels=2,
            pickable=False,
        )
        risk_label_layer = None

    scope = st.radio(
        "Data-centre view",
        ["Selected country", "Singapore + Malaysia"],
        horizontal=True,
    )
    visible_centres = [
        centre for centre in DATA_CENTRES
        if scope == "Singapore + Malaysia" or centre["country"] == country
    ]
    centre_data = pd.DataFrame([{
        **centre,
        "Name": f"{centre['operator']} {centre['name']}",
        "Type": "Operating data centre (public example)",
        "Country": centre["country"],
        "Layer meaning": f"{centre['place']} · {centre['precision']}",
    } for centre in visible_centres])

    centre_layer = pdk.Layer(
        "ScatterplotLayer",
        data=centre_data,
        get_position="[lon, lat]",
        get_radius=1600 if country == "Singapore" else 3800,
        radius_min_pixels=6,
        radius_max_pixels=13,
        get_fill_color=[250,204,21,245],
        stroked=True,
        get_line_color=[120,53,15,255],
        line_width_min_pixels=2,
        pickable=True,
    )

    active_layers = []
    if show_stress:
        active_layers.append(stress_polygon_layer)
        if risk_label_layer is not None:
            active_layers.append(risk_label_layer)
    active_layers.append(site_layer)
    if show_centres:
        active_layers.append(centre_layer)

    if country == "Malaysia":
        map_focus = st.radio(
            "Map focus",
            ["Malaysia stress overview", "Selected site"],
            horizontal=True,
        )
    else:
        map_focus = "Selected site"

    if map_focus == "Malaysia stress overview":
        map_latitude, map_longitude, map_zoom = 4.45, 101.55, 5.25
    else:
        map_latitude, map_longitude = selected_lat, selected_lon
        map_zoom = 9.4 if country == "Singapore" else 7.0

    deck = pdk.Deck(
        layers=active_layers,
        initial_view_state=pdk.ViewState(
            latitude=map_latitude,
            longitude=map_longitude,
            zoom=map_zoom,
            pitch=12,
        ),
        tooltip={
            "html": "<b>{Name}</b><br/>{Type}<br/>{Layer meaning}<br/>{Country}",
            "style": {"backgroundColor": "#07182b", "color": "white"},
        },
        map_style="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
    )
    st.pydeck_chart(deck, width="stretch", height=540)

    legend1, legend2, legend3, legend4, legend5 = st.columns(5)
    legend1.markdown("🟢 **Low**")
    legend2.markdown("🟡 **Medium-high**")
    legend3.markdown("🟠 **High**")
    legend4.markdown("🟣 **NoData**")
    legend5.markdown("🟡 **Existing centre** · 🔵 **Proposed site**")

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
        province-level WRI screening result. A green regional result still requires a
        local utility headroom and cumulative-demand check.</div>
        """,
        unsafe_allow_html=True,
    )
    st.caption(
        "Source: WRI Aqueduct 4.0 country and province rankings, total-use weighting. "
        "Singapore is shown as NoData because the cited rankings file does not return a baseline "
        "water-stress category for it. Malaysian colours are province-level screening signals."
    )

with method_tab:
    st.subheader("How demand is calculated")
    st.latex(r"\text{Normal daily demand} = \text{IT capacity} \times 24 \times \text{WUE}")
    st.latex(r"\text{Peak demand} = \text{Normal daily demand} \times \text{peak factor}")
    st.write("**How the community screen works**")
    st.write(
        "The 0–100 screening priority adds disclosed points for potable-water reliance, uncertain "
        "or inadequate utility headroom, water stress or missing stress data, unassessed cumulative "
        "demand, sensitive users and incomplete engagement. It is a prioritisation index—not a "
        "measured social impact, approval score or prediction of household water loss."
    )
    st.latex(
        r"\text{Facility-demand scale equivalent} = "
        r"\frac{\text{facility peak demand}\times 1000}{\text{population sharing the water system}}"
    )
    st.write(f"**Country context**\n\n{country_data['source_note']}")
    st.write(
        "**Important limitations**\n"
        "- AquaSite currently estimates direct operational water only.\n"
        "- Location markers do not show actual projects or confidential utility capacity.\n"
        "- The peak factor is illustrative until project-specific data are available.\n"
        "- A comparison benchmark is not automatically a statutory approval threshold.\n"
        "- AquaSite supports screening and does not grant regulatory approval."
    )
    st.markdown(
        "**Sources**\n\n"
        "- [Singapore Green Data Centre Roadmap](https://www.imda.gov.sg/-/media/imda/files/"
        "news-and-events/media-room/media-releases/2024/05/green-dc-roadmap.pdf)\n"
        "- [Malaysia Planning Guideline for Data Centre](https://jpbd.penang.gov.my/images/"
        "faris/pdf/2025/GARIS%20PANDUAN/GPP%20PUSAT%20DATA%20-%20ENG.pdf)\n"
        "- [WRI Aqueduct 4.0 country rankings](https://www.wri.org/data/aqueduct-40-country-rankings)\n"
        "- [Equinix Singapore facilities](https://www.equinix.com/data-centers/asia-pacific-colocation/singapore-colocation)\n"
        "- [Digital Realty Singapore facilities](https://www.digitalrealty.com/data-centers/asia-pacific/singapore)\n"
        "- [NTT Asia-Pacific data centres](https://services.global.ntt/en-us/services-and-products/global-data-centers/global-locations/asia-pacific)\n"
        "- [AirTrunk JHB1](https://airtrunk.com/airtrunk-opens-ai-ready-data-centre-in-malaysia-accelerating-innovation-and-the-energy-transition/)\n"
        "- [TM One data-centre overview](https://www.tmone.com.my/think-tank/accelerate-digital-transformation-in-bfsi-energy-and-industry/)"
    )

st.caption("AquaSite prototype — demonstration purposes only.")
