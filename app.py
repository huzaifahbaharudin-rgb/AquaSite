import pandas as pd
import pydeck as pdk
import streamlit as st
from math import asin, cos, radians, sin, sqrt

st.set_page_config(page_title="AquaSite", page_icon="💧", layout="wide")

st.markdown(
    """
    <style>
    .stApp { background: linear-gradient(145deg, #effcf9 0%, #f7fbff 52%, #fff8e8 100%); }
    [data-testid="stHeader"] { background: rgba(239,252,249,.88); }
    h1 { color: #0f766e !important; font-size: 3rem !important; }
    h2, h3 { color: #164e63 !important; }
    div[data-testid="stMetric"] {
        background: rgba(255,255,255,.94); border: 1px solid #b7e4dc;
        border-radius: 16px; padding: 16px;
        box-shadow: 0 8px 20px rgba(15,118,110,.09);
    }
    div[data-testid="stAlert"] { border-radius: 14px; }
    .mission-card {
        padding: 18px 22px; border-radius: 18px;
        background: linear-gradient(120deg, #0f766e, #0891b2); color: white;
        box-shadow: 0 12px 28px rgba(15,118,110,.20); margin: 8px 0 18px 0;
    }
    .mission-card h3 { color: white !important; margin: 0 0 5px 0; }
    .mission-card p { margin: 0; font-size: 1.02rem; }
    .map-key {
        background: white; border-left: 6px solid #7c3aed; padding: 12px 16px;
        border-radius: 10px; color: #334155; margin: 8px 0;
    }
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

normal_m3_day, peak_m3_day, annual_m3 = calculate_demand(capacity_mw, wue, peak_factor)
benchmark_peak = capacity_mw * 24 * country_data["benchmark"] * peak_factor
difference_pct = ((peak_m3_day - benchmark_peak) / benchmark_peak * 100) if benchmark_peak else 0

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

st.divider()
st.header("Screening result")
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

result_tab, map_tab, method_tab = st.tabs(
    ["📄 Plain-language result", "🗺️ Water-stress map", "🧪 Method and sources"]
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

    map_rows = []
    for map_country, details in COUNTRIES.items():
        for map_location, coordinates in details["locations"].items():
            is_selected = map_country == country and map_location == location
            stress_label = coordinates[2]
            stress_category = coordinates[3]
            if stress_category == -1:
                stress_color = [124, 58, 237, overlay_strength]
                layer_meaning = "NoData — local evidence required"
            elif stress_category == 0:
                stress_color = [34, 197, 94, overlay_strength]
                layer_meaning = "Low baseline water stress"
            elif stress_category == 1:
                stress_color = [163, 230, 53, overlay_strength]
                layer_meaning = "Low-medium baseline water stress"
            elif stress_category == 2:
                stress_color = [250, 204, 21, overlay_strength]
                layer_meaning = "Medium-high baseline water stress"
            elif stress_category == 3:
                stress_color = [249, 115, 22, overlay_strength]
                layer_meaning = "High baseline water stress"
            else:
                stress_color = [220, 38, 38, overlay_strength]
                layer_meaning = "Extremely high baseline water stress"
            map_rows.append(
                {
                    "lat": coordinates[0],
                    "lon": coordinates[1],
                    "Location": map_location,
                    "Name": map_location,
                    "Type": "Water-stress screening zone",
                    "Country": map_country,
                    "Water stress": stress_label,
                    "Layer meaning": layer_meaning,
                    "Selected": "Selected site" if is_selected else "Other zone",
                    "overlay_radius": 47000 if map_country == "Malaysia" else 22000,
                    "stress_color": stress_color,
                    "site_radius": 9500 if is_selected else 3800,
                    "site_color": [6, 182, 212, 255] if is_selected else [30, 41, 59, 230],
                }
            )
    map_data = pd.DataFrame(map_rows)
    overlay_layer = pdk.Layer(
        "ScatterplotLayer",
        data=map_data,
        get_position="[lon, lat]",
        get_radius="overlay_radius",
        get_fill_color="stress_color",
        stroked=True,
        get_line_color=[255, 255, 255, 220],
        line_width_min_pixels=2,
        pickable=True,
    )
    site_layer = pdk.Layer(
        "ScatterplotLayer",
        data=map_data,
        get_position="[lon, lat]",
        get_radius="site_radius",
        get_fill_color="site_color",
        stroked=True,
        get_line_color=[255, 255, 255, 255],
        line_width_min_pixels=3,
        pickable=True,
    )
    centre_data = pd.DataFrame(
        [
            {
                **centre,
                "Name": f"{centre['operator']} {centre['name']}",
                "Type": "Operating data centre (public example)",
                "Country": centre["country"],
                "Layer meaning": f"{centre['place']} · {centre['precision']}",
            }
            for centre in DATA_CENTRES
        ]
    )
    centre_layer = pdk.Layer(
        "ScatterplotLayer",
        data=centre_data,
        get_position="[lon, lat]",
        get_radius=3600,
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
        active_layers.append(overlay_layer)
    active_layers.append(site_layer)
    if show_centres:
        active_layers.append(centre_layer)

    view_state = pdk.ViewState(latitude=3.35, longitude=102.2, zoom=5.45, pitch=28)
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

    legend1, legend2, legend3, legend4, legend5, legend6 = st.columns(6)
    legend1.markdown("🟢 **Low**")
    legend2.markdown("🟡 **Medium-high**")
    legend3.markdown("🟠 **High**")
    legend4.markdown("🔴 **Extremely high**")
    legend5.markdown("🟣 **NoData**")
    legend6.markdown("🟡 **Data centre**")

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
        <div class="map-key"><b>How to play</b> — change the country and location above, then
        return to this map. Cyan is your proposed site; gold beacons are operating facilities.
        Try Kedah or Perlis to activate a stress warning.</div>
        """,
        unsafe_allow_html=True,
    )

    st.caption(
        "Source: WRI Aqueduct 4.0 country and province rankings, total-use weighting. "
        "Singapore is shown as NoData because the 2023 rankings file does not return a baseline "
        "water-stress category for it. The circles visualise screening areas, not basin boundaries."
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
