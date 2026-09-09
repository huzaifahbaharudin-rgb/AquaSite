import streamlit as st

st.set_page_config(
    page_title="AquaSite",
    page_icon="💧",
    layout="wide"
)

st.title("💧 AquaSite")
st.subheader("Water-first screening for responsible data-centre siting")

st.info(
    "This early prototype estimates a proposed data centre's water demand "
    "and checks whether the location passes basic water safeguards."
)

st.sidebar.header("Proposed data centre")

capacity_mw = st.sidebar.number_input(
    "IT capacity in MW",
    min_value=1.0,
    value=20.0,
    step=1.0
)

cooling_wue = st.sidebar.number_input(
    "Cooling water use in L/kWh",
    min_value=0.0,
    value=1.8,
    step=0.1
)

grid_water_intensity = st.sidebar.number_input(
    "Electricity-related water use in L/kWh",
    min_value=0.0,
    value=0.4,
    step=0.1
)

stress_level = st.sidebar.selectbox(
    "Seasonal basin stress",
    ["Low", "Medium", "High", "Extremely high"]
)

utility_headroom = st.sidebar.number_input(
    "Available utility headroom in million L/day",
    min_value=0.0,
    value=5.0,
    step=0.5
)

critical_data_available = st.sidebar.checkbox(
    "Critical water data are available",
    value=True
)

stress_multipliers = {
    "Low": 1.0,
    "Medium": 1.5,
    "High": 2.0,
    "Extremely high": 3.0
}

annual_energy_kwh = capacity_mw * 1000 * 8760

direct_water_l_year = annual_energy_kwh * cooling_wue
indirect_water_l_year = annual_energy_kwh * grid_water_intensity

total_water_l_year = direct_water_l_year + indirect_water_l_year
direct_water_l_day = direct_water_l_year / 365

stress_adjusted_score = (
    total_water_l_year * stress_multipliers[stress_level]
)

available_headroom_l_day = utility_headroom * 1_000_000

st.header("Estimated water impact")

column_1, column_2, column_3 = st.columns(3)

column_1.metric(
    "Direct cooling water",
    f"{direct_water_l_year / 1_000_000:,.1f} million L/year"
)

column_2.metric(
    "Electricity-related water",
    f"{indirect_water_l_year / 1_000_000:,.1f} million L/year"
)

column_3.metric(
    "Stress-adjusted impact",
    f"{stress_adjusted_score / 1_000_000:,.1f}",
    help="An illustrative impact score, not a physical volume of water."
)

st.header("AquaSite screening decision")

if not critical_data_available:
    st.warning(
        "FURTHER EVIDENCE REQUIRED: Critical water data are missing. "
        "AquaSite does not treat missing information as proof of safety."
    )

elif stress_level == "Extremely high":
    st.error(
        "EXCLUDE OR REDESIGN: The location fails the basin-stress safeguard."
    )

elif direct_water_l_day > available_headroom_l_day:
    st.error(
        "EXCLUDE OR REDESIGN: Estimated daily cooling-water demand "
        "exceeds available utility headroom."
    )

else:
    remaining_headroom_l_day = (
        available_headroom_l_day - direct_water_l_day
    )

    st.success(
        "PROCEED WITH CONDITIONS: The proposal passes this preliminary screen."
    )

    st.write(
        "Estimated remaining utility headroom after direct cooling demand: "
        f"**{remaining_headroom_l_day / 1_000_000:,.2f} million L/day**"
    )

st.header("Water Capacity Impact Statement")

st.write(
    f"""
    The proposed **{capacity_mw:.0f} MW** data centre is estimated to consume
    **{direct_water_l_day / 1_000_000:,.2f} million litres per day**
    for cooling under the selected assumptions.

    The location has **{stress_level.lower()} seasonal basin stress** and
    reported utility headroom of **{utility_headroom:.2f} million litres
    per day**.

    This result is intended for preliminary screening. The input data,
    assumptions and thresholds must be validated with the relevant utility,
    regulator and affected communities before a siting decision is made.
    """
)

with st.expander("View assumptions and limitations"):
    st.write(
        """
        - The facility is assumed to operate for 8,760 hours per year.
        - Water-use values are illustrative inputs selected by the user.
        - The stress-adjusted result is an impact score, not a water volume.
        - The prototype does not grant regulatory approval.
        - Community and ecological thresholds will be added after validation.
        """
    )

st.caption(
    "AquaSite prototype — demonstration purposes only."
)
