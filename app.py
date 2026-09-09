import pandas as pd
import streamlit as st


st.set_page_config(
    page_title="AquaSite Singapore",
    page_icon="💧",
    layout="wide",
)

# Official starting benchmark from Singapore's Green Data Centre Roadmap.
# The 2021 median WUE for large water-using data centres was 2.2 m3/MWh.
SINGAPORE_MEDIAN_WUE = 2.2

LOCATIONS = {
    "Jurong demonstration zone": {
        "lat": 1.3329,
        "lon": 103.7436,
        "context": "Western industrial area",
    },
    "Changi demonstration zone": {
        "lat": 1.3450,
        "lon": 103.9832,
        "context": "Eastern infrastructure area",
    },
    "Woodlands demonstration zone": {
        "lat": 1.4382,
        "lon": 103.7890,
        "context": "Northern urban area",
    },
    "Tuas demonstration zone": {
        "lat": 1.2949,
        "lon": 103.6364,
        "context": "Western industrial area",
    },
}


def evidence_label(value: str) -> str:
    return {
        "Confirmed": "Confirmed",
        "Not confirmed": "Not confirmed",
        "Unknown": "Unknown",
    }[value]


st.title("💧 AquaSite Singapore")
st.subheader("Water-first pre-siting screening for data centres")
st.write(
    "Test how facility design, cooling choice and unresolved water-system evidence "
    "change a preliminary siting decision."
)

st.sidebar.header("Proposed facility")

location = st.sidebar.selectbox("Demonstration location", list(LOCATIONS))
capacity_mw = st.sidebar.number_input(
    "IT capacity in MW", min_value=1.0, max_value=500.0, value=20.0, step=1.0
)
wue = st.sidebar.number_input(
    "Expected WUE in m³/MWh",
    min_value=0.0,
    max_value=10.0,
    value=SINGAPORE_MEDIAN_WUE,
    step=0.1,
    help="Water Usage Effectiveness measures water consumed per unit of IT energy.",
)
cooling_system = st.sidebar.selectbox(
    "Cooling approach",
    ["Evaporative cooling", "Hybrid cooling", "Air cooling", "Liquid cooling", "Unknown"],
)
water_source = st.sidebar.selectbox(
    "Primary cooling-water source",
    ["Potable water", "NEWater", "Mixed supply", "Closed-loop system", "Unknown"],
)
dry_season_factor = st.sidebar.slider(
    "Peak or dry-season demand factor",
    min_value=1.0,
    max_value=1.5,
    value=1.2,
    step=0.05,
    help="Illustrative scenario factor until a project-specific seasonal profile is available.",
)

st.sidebar.header("Evidence checks")
headroom_status = st.sidebar.selectbox(
    "Local utility headroom", ["Unknown", "Confirmed", "Not confirmed"]
)
cumulative_status = st.sidebar.selectbox(
    "Nearby cumulative demand assessed", ["Unknown", "Confirmed", "Not confirmed"]
)
community_safeguard = st.sidebar.checkbox(
    "Community or ecological safeguard triggered", value=False
)

# m3/MWh multiplied by MW and 24 hours gives m3/day.
daily_it_energy_mwh = capacity_mw * 24
annual_it_energy_mwh = capacity_mw * 8760
normal_water_m3_day = daily_it_energy_mwh * wue
peak_water_m3_day = normal_water_m3_day * dry_season_factor
annual_water_m3 = annual_it_energy_mwh * wue
benchmark_peak_m3_day = daily_it_energy_mwh * SINGAPORE_MEDIAN_WUE * dry_season_factor
water_difference_pct = (
    ((peak_water_m3_day - benchmark_peak_m3_day) / benchmark_peak_m3_day) * 100
    if benchmark_peak_m3_day > 0
    else 0
)

missing_evidence = []
if headroom_status != "Confirmed":
    missing_evidence.append("local utility headroom")
if cumulative_status != "Confirmed":
    missing_evidence.append("cumulative demand from nearby developments")
if water_source == "Unknown":
    missing_evidence.append("cooling-water source")
if cooling_system == "Unknown":
    missing_evidence.append("cooling approach")

if community_safeguard:
    decision = "EXCLUDE OR REDESIGN"
    decision_reason = "A community or ecological safeguard has been triggered."
    decision_type = "error"
elif missing_evidence:
    decision = "FURTHER EVIDENCE REQUIRED"
    decision_reason = "AquaSite does not treat missing or unconfirmed information as proof of safety."
    decision_type = "warning"
elif wue > SINGAPORE_MEDIAN_WUE and water_source == "Potable water":
    decision = "REDESIGN BEFORE REVIEW"
    decision_reason = (
        "Expected WUE is above the starting Singapore benchmark while the proposal relies on potable water."
    )
    decision_type = "error"
else:
    decision = "PROCEED WITH CONDITIONS"
    decision_reason = (
        "The proposal passes this preliminary screen, subject to verification by the relevant authorities."
    )
    decision_type = "success"

tab_overview, tab_evidence, tab_method = st.tabs(
    ["Screening result", "Evidence and map", "Method and limitations"]
)

with tab_overview:
    st.header("Estimated water demand")
    col1, col2, col3, col4 = st.columns(4)
    col1.metric("Normal-day demand", f"{normal_water_m3_day:,.0f} m³/day")
    col2.metric("Peak scenario", f"{peak_water_m3_day:,.0f} m³/day")
    col3.metric("Annual demand", f"{annual_water_m3:,.0f} m³/year")
    col4.metric(
        "Against 2.2 benchmark",
        f"{abs(water_difference_pct):.1f}% {'higher' if water_difference_pct > 0 else 'lower'}"
        if water_difference_pct != 0
        else "At benchmark",
    )

    st.header("AquaSite decision")
    message = f"**{decision}** — {decision_reason}"
    if decision_type == "error":
        st.error(message)
    elif decision_type == "warning":
        st.warning(message)
    else:
        st.success(message)

    if missing_evidence:
        st.write("**Evidence still needed**")
        for item in missing_evidence:
            st.write(f"- {item.capitalize()}")

    st.subheader("Water Capacity Impact Statement")
    source_phrase = water_source.lower() if water_source != "Unknown" else "an unconfirmed source"
    st.write(
        f"The proposed **{capacity_mw:.0f} MW** facility in the **{location}** "
        f"is estimated to require **{normal_water_m3_day:,.0f} m³/day** under normal conditions "
        f"and **{peak_water_m3_day:,.0f} m³/day** in the selected peak scenario. "
        f"The estimate uses a WUE of **{wue:.1f} m³/MWh** and {source_phrase}. "
        f"The preliminary outcome is **{decision.lower()}**."
    )

with tab_evidence:
    st.header("Location and evidence status")
    selected = LOCATIONS[location]
    map_data = pd.DataFrame(
        [{"lat": selected["lat"], "lon": selected["lon"], "marker_size": 120}]
    )
    st.map(
        map_data,
        latitude="lat",
        longitude="lon",
        size="marker_size",
        zoom=10,
    )
    st.caption(
        "The marker identifies a demonstration area, not an actual data-centre site or a PUB network assessment."
    )

    evidence_rows = pd.DataFrame(
        {
            "Evidence item": [
                "Facility IT capacity",
                "Expected WUE",
                "Cooling-water source",
                "Local utility headroom",
                "Nearby cumulative demand",
                "Community and ecological safeguards",
            ],
            "Current status": [
                "Scenario input",
                "Scenario input",
                water_source,
                evidence_label(headroom_status),
                evidence_label(cumulative_status),
                "Triggered" if community_safeguard else "Not triggered in scenario",
            ],
            "Validation owner": [
                "Developer",
                "Developer and operator",
                "Developer and PUB",
                "PUB",
                "Planning agencies and utilities",
                "Regulators and affected communities",
            ],
        }
    )
    st.dataframe(evidence_rows, use_container_width=True, hide_index=True)

with tab_method:
    st.header("Calculation")
    st.latex(
        r"\text{Daily water demand} = \text{IT capacity} \times 24 \times \text{WUE}"
    )
    st.latex(
        r"\text{Peak scenario demand} = \text{Daily water demand} \times \text{Scenario factor}"
    )

    st.subheader("Current limitations")
    st.write(
        "- The 2.2 m³/MWh value is a sector benchmark, not a mandatory approval threshold.\n"
        "- The selected locations are demonstration zones and do not represent confirmed projects.\n"
        "- Local network headroom and NEWater availability require confirmation from PUB.\n"
        "- The dry-season factor is illustrative until a project-specific demand profile is available.\n"
        "- The prototype does not grant planning or regulatory approval."
    )

    st.subheader("Source")
    st.markdown(
        "Singapore's Green Data Centre Roadmap reports a 2021 median WUE of "
        "2.2 m³/MWh for data centres classified as large water users. "
        "[Read the IMDA roadmap](https://www.imda.gov.sg/-/media/imda/files/news-and-events/"
        "media-room/media-releases/2024/05/green-dc-roadmap.pdf)."
    )

st.caption("AquaSite Singapore prototype — demonstration purposes only.")
