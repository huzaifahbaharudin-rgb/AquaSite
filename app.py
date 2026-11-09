import math
from datetime import datetime, timezone

import pandas as pd
import pydeck as pdk
import streamlit as st

st.set_page_config(page_title='AquaSite', page_icon='💧', layout='wide')

COUNTRIES = {
    'Singapore': {
        'benchmark': 2.0,
        'benchmark_note': 'Illustrative comparison against Singapore Green Data Centre Roadmap ambition; not a statutory approval limit.',
        'locations': {
            'Jurong, Singapore': (1.3329, 103.7436, 'NoData', -1),
            'Changi, Singapore': (1.3450, 103.9832, 'NoData', -1),
            'Woodlands, Singapore': (1.4382, 103.7890, 'NoData', -1),
            'Tuas, Singapore': (1.2949, 103.6364, 'NoData', -1),
        },
    },
    'Malaysia': {
        'benchmark': 1.8,
        'benchmark_note': 'Illustrative AquaSite comparison value; not a Malaysian national WUE limit.',
        'locations': {
            'Johor Bahru, Malaysia': (1.4927, 103.7414, 'Low (<10%)', 0),
            'Iskandar Puteri, Malaysia': (1.4200, 103.6300, 'Low (<10%)', 0),
            'Cyberjaya, Malaysia': (2.9213, 101.6559, 'Low (<10%)', 0),
            'Kuala Lumpur, Malaysia': (3.1390, 101.6869, 'Low (<10%)', 0),
            'Kedah, Malaysia': (6.1184, 100.3685, 'High (40–80%)', 3),
            'Perlis, Malaysia': (6.4414, 100.1986, 'Medium-high (20–40%)', 2),
        },
    },
}

CONDITION_FACTORS = {'Normal operation': 1.0, 'Peak season': 1.2, 'Dry-season stress test': 1.5}
SOURCES = ['Recycled or reclaimed water', 'Closed-loop system', 'Mixed supply', 'Potable water', 'Unknown']
COOLING = ['Hybrid cooling', 'Air cooling', 'Liquid cooling', 'Evaporative cooling', 'Unknown']
RECEPTORS = ['Hospitals', 'Schools', 'Public housing', 'Small businesses', 'Water-dependent livelihoods']

st.markdown('''<style>
.stApp {background:linear-gradient(145deg,#031426,#08233d 55%,#0b3152);color:#e6f4ff}
.block-container {max-width:1380px;padding-top:1.5rem;padding-bottom:3rem}
h1,h2,h3 {color:#d9f3ff!important}
.hero {padding:22px 26px;border:1px solid #286181;border-radius:20px;background:linear-gradient(120deg,#0b3654,#09243c);margin-bottom:20px}
.hero small {color:#7dd3fc;letter-spacing:.12em;font-weight:800}
.hero h2 {margin:8px 0;font-size:1.55rem}
.hero p {color:#dbeafe;margin:0}
.status {border-radius:16px;padding:17px 22px;margin:10px 0 18px;font-weight:700}
.red {background:#521b28;border:1px solid #f87171;color:#fee2e2}
.amber {background:#513a17;border:1px solid #fbbf24;color:#fef3c7}
.green {background:#124b3d;border:1px solid #4ade80;color:#dcfce7}
[data-testid="stMetric"] {border:1px solid #286181;background:#0b2b46;border-radius:14px;padding:12px}
</style>''', unsafe_allow_html=True)

DEFAULTS = {
    'aq_country': 'Singapore', 'aq_location': 'Jurong, Singapore',
    'aq_capacity': 20.0, 'aq_wue': 1.6, 'aq_pue': 1.3,
    'aq_grid_water_intensity': 0.7, 'aq_cooling': 'Hybrid cooling',
    'aq_source': 'Recycled or reclaimed water', 'aq_condition': 'Peak season',
    'aq_headroom': 'Unknown', 'aq_cumulative': 'Unknown', 'aq_safeguard': 'Unknown',
    'aq_numeric_headroom': False, 'aq_headroom_capacity': 0.0,
    'aq_existing_cluster_demand': 0.0, 'aq_committed_demand': 0.0,
    'aq_basin_evidence': 'Regional proxy only', 'aq_population': 100000,
    'aq_dependence': 'Unknown', 'aq_receptors': [], 'aq_consultation': 'Not started',
    'aq_screen': '1 · Command Centre',
}
for key, value in DEFAULTS.items():
    st.session_state.setdefault(key, value)


def change_country():
    available = COUNTRIES[st.session_state.aq_country]['locations']
    if st.session_state.aq_location not in available:
        st.session_state.aq_location = next(iter(available))


def calculate(country, location, capacity, wue, pue, grid_intensity, condition,
              source, headroom, cumulative, safeguard, numeric_enabled,
              numeric_capacity, existing, committed, basin_evidence,
              dependence, receptors, consultation):
    data = COUNTRIES[country]
    lat, lon, stress_label, stress_category = data['locations'][location]
    factor = CONDITION_FACTORS[condition]
    direct_normal = capacity * 24 * wue
    indirect_normal = capacity * 24 * pue * grid_intensity
    direct_condition = direct_normal * factor
    indirect_condition = indirect_normal * factor
    direct_system_load = direct_condition + existing + committed
    # Indirect electricity generation water is NOT necessarily drawn from the local utility.
    combined_footprint = direct_condition + indirect_condition
    annual_direct = capacity * 8760 * wue
    annual_indirect = capacity * 8760 * pue * grid_intensity
    stress_points = 20 if stress_category >= 3 else 12 if stress_category == 2 else 8 if stress_category == -1 else 0
    score_parts = {
        'Potable-water reliance': 25 if source == 'Potable water' else 10 if source == 'Mixed supply' else 8 if source == 'Unknown' else 0,
        'Utility headroom': 25 if headroom == 'Not adequate' else 15 if headroom == 'Unknown' else 0,
        'Regional stress / missing coverage': stress_points,
        'Cumulative-demand gap': 12 if cumulative != 'Assessed' else 0,
        'Sensitive users': min(10, len(receptors) * 2),
        'Engagement gap': 8 if consultation == 'Not started' else 4 if consultation in ('Planned', 'In progress') else 0,
    }
    score = min(100, sum(score_parts.values()))
    gaps = []
    if headroom != 'Confirmed': gaps.append('Verified utility headroom')
    if not numeric_enabled or numeric_capacity <= 0: gaps.append('Numeric constrained-period utility capacity')
    if cumulative != 'Assessed': gaps.append('Cumulative-demand assessment')
    if safeguard != 'No known trigger': gaps.append('Community/ecological safeguard clearance')
    if stress_label == 'NoData': gaps.append('Local water-stress evidence')
    if dependence == 'Unknown': gaps.append('Shared-system community dependence')
    if consultation != 'Completed and documented': gaps.append('Documented community engagement')
    if basin_evidence != 'Verified basin and seasonal data': gaps.append('Verified basin and seasonal dataset')
    if source == 'Unknown': gaps.append('Verified primary water source')
    capacity_breach = numeric_enabled and numeric_capacity > 0 and direct_system_load > numeric_capacity
    if safeguard == 'Triggered' or headroom == 'Not adequate' or capacity_breach or score >= 70 or (stress_category >= 3 and source in ('Potable water', 'Mixed supply')):
        signal, decision = 'RED', 'STOP — redesign or reconsider the site'
    elif gaps or score >= 40 or (wue > data['benchmark'] and source == 'Potable water'):
        signal, decision = 'AMBER', 'MITIGATE — resolve safeguards before proceeding'
    else:
        signal, decision = 'GREEN', 'PROCEED — subject to formal verification'
    return locals()


def current_result():
    s = st.session_state
    return calculate(s.aq_country, s.aq_location, s.aq_capacity, s.aq_wue,
                     s.aq_pue, s.aq_grid_water_intensity, s.aq_condition,
                     s.aq_source, s.aq_headroom, s.aq_cumulative,
                     s.aq_safeguard, s.aq_numeric_headroom,
                     s.aq_headroom_capacity, s.aq_existing_cluster_demand,
                     s.aq_committed_demand, s.aq_basin_evidence,
                     s.aq_dependence, s.aq_receptors, s.aq_consultation)


st.title('💧 AquaSite')
st.markdown('''<div class="hero"><small>PRE-DEVELOPMENT WATER SAFEGUARD SCREENING</small>
<h2>Where—and under what conditions—should this data centre proceed?</h2>
<p>Explore candidate areas, test design assumptions, and identify evidence and community safeguards before siting decisions.</p></div>''', unsafe_allow_html=True)
st.radio('AquaSite journey', ['1 · Command Centre', '2 · Community & Evidence', '3 · Decision Brief'],
         horizontal=True, label_visibility='collapsed', key='aq_screen')

if st.session_state.aq_screen == '1 · Command Centre':
    controls, display = st.columns([0.85, 1.55], gap='large')
    with controls:
        st.subheader('Design levers')
        st.selectbox('Country', list(COUNTRIES), key='aq_country', on_change=change_country)
        change_country()
        st.selectbox('Candidate area', list(COUNTRIES[st.session_state.aq_country]['locations']), key='aq_location')
        st.number_input('IT capacity (MW)', min_value=1.0, max_value=500.0, step=1.0, key='aq_capacity')
        st.number_input('WUE (m³/MWh)', min_value=0.0, max_value=10.0, step=0.1, key='aq_wue')
        st.selectbox('Cooling approach', COOLING, key='aq_cooling')
        st.selectbox('Water source', SOURCES, key='aq_source')
        st.selectbox('Operating condition', list(CONDITION_FACTORS), key='aq_condition')
        with st.expander('Electricity-related water', expanded=True):
            st.number_input('Power Usage Effectiveness (PUE)', min_value=1.0, max_value=3.0, step=0.05, key='aq_pue')
            st.number_input('Grid water intensity (m³/MWh)', min_value=0.0, max_value=5.0, step=0.05,
                            key='aq_grid_water_intensity', help='Illustrative until verified against the actual electricity supply.')
    with display:
        r = current_result()
        st.markdown(f'<div class="status {r["signal"].lower()}">{r["signal"]} · {r["location"]}<br>{r["decision"]}</div>', unsafe_allow_html=True)
        a, b, c = st.columns(3)
        a.metric('Direct facility water', f'{r["direct_condition"]:,.0f} m³/day')
        b.metric('Electricity-related water', f'{r["indirect_condition"]:,.0f} m³/day')
        c.metric('Combined footprint', f'{r["combined_footprint"]:,.0f} m³/day')
        st.caption('The combined footprint is not a local utility withdrawal estimate. Local utility load uses direct water plus entered nearby demand.')
        point = pd.DataFrame([{'lat': r['lat'], 'lon': r['lon'], 'Name': r['location'], 'Status': r['decision']}])
        rgb = {'RED': [239, 68, 68, 240], 'AMBER': [245, 158, 11, 240], 'GREEN': [34, 197, 94, 240]}[r['signal']]
        layers = [pdk.Layer('ScatterplotLayer', data=point, get_position='[lon, lat]',
                            get_radius=3000, radius_min_pixels=10, radius_max_pixels=22,
                            get_fill_color=rgb, get_line_color=[255,255,255,255], stroked=True, pickable=True)]
        view = pdk.ViewState(latitude=r['lat'], longitude=r['lon'], zoom=9 if r['country']=='Singapore' else 7, pitch=0)
        st.pydeck_chart(pdk.Deck(layers=layers, initial_view_state=view,
                                 map_style='https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
                                 tooltip={'html': '<b>{Name}</b><br/>{Status}'}), height=460, use_container_width=True)
        st.caption(f'Regional stress proxy: {r["stress_label"]}. Demonstration coordinates are not verified project parcels.')

    st.subheader('Decision Lab')
    compare_tab, optimise_tab = st.tabs(['Compare sites', 'Find a safer configuration'])
    with compare_tab:
        all_candidates = [(country, location) for country, data in COUNTRIES.items() for location in data['locations']]
        default_picks = list(dict.fromkeys([st.session_state.aq_location, 'Johor Bahru, Malaysia', 'Kedah, Malaysia']))
        picks = st.multiselect('Candidate shortlist', [loc for _, loc in all_candidates], default=default_picks, max_selections=4)
        rows = []
        for country, location in all_candidates:
            if location not in picks: continue
            s = st.session_state
            candidate = calculate(country, location, s.aq_capacity, s.aq_wue, s.aq_pue,
                                  s.aq_grid_water_intensity, s.aq_condition, s.aq_source,
                                  'Unknown', 'Unknown', 'Unknown', False, 0, 0, 0,
                                  'Regional proxy only', 'Unknown', [], 'Not started')
            rows.append({'Candidate': location, 'Water stress': candidate['stress_label'],
                         'Direct demand (m³/day)': round(candidate['direct_condition']),
                         'Community index': candidate['score'], 'Verdict': candidate['signal']})
        if rows:
            st.dataframe(pd.DataFrame(rows), hide_index=True, use_container_width=True)
            st.caption('Each candidate is independently screened with unknown local evidence. These are not approval-ready site rankings.')
        else:
            st.info('Select at least one candidate.')
    with optimise_tab:
        if st.button('Test lower-water design', type='primary'):
            st.session_state.aq_optimised = True
        if st.session_state.get('aq_optimised'):
            s = st.session_state
            rec_wue = min(s.aq_wue, max(0.8, COUNTRIES[s.aq_country]['benchmark'] - 0.4))
            rec_pue = min(s.aq_pue, 1.2)
            improved = calculate(s.aq_country, s.aq_location, s.aq_capacity, rec_wue,
                                 rec_pue, s.aq_grid_water_intensity, s.aq_condition,
                                 'Recycled or reclaimed water', s.aq_headroom,
                                 s.aq_cumulative, s.aq_safeguard, s.aq_numeric_headroom,
                                 s.aq_headroom_capacity, s.aq_existing_cluster_demand,
                                 s.aq_committed_demand, s.aq_basin_evidence,
                                 s.aq_dependence, s.aq_receptors, s.aq_consultation)
            st.write(f'**Illustrative redesign:** hybrid cooling, reclaimed water, WUE {rec_wue:.2f}, PUE {rec_pue:.2f}.')
            x, y, z = st.columns(3)
            x.metric('New safeguard', improved['signal'])
            y.metric('New direct demand', f'{improved["direct_condition"]:,.0f} m³/day')
            z.metric('Annual direct saving', f'{max(0, r["annual_direct"]-improved["annual_direct"]):,.0f} m³')
            st.caption('This tests a design assumption; it does not verify water-source availability or resolve missing evidence.')

elif st.session_state.aq_screen == '2 · Community & Evidence':
    st.header('Community & Evidence')
    st.caption('Only mark evidence as verified when you have supporting documentation. Unknown is not a safe result.')
    a, b, c = st.columns(3)
    with a: st.selectbox('Local water-system headroom', ['Unknown', 'Confirmed', 'Not adequate'], key='aq_headroom')
    with b: st.selectbox('Nearby cumulative demand', ['Unknown', 'Assessed', 'Not assessed'], key='aq_cumulative')
    with c: st.selectbox('Community/ecological safeguard', ['Unknown', 'No known trigger', 'Triggered'], key='aq_safeguard')
    st.subheader('Capacity and basin evidence')
    a, b, c = st.columns(3)
    with a:
        st.checkbox('Verified numeric utility capacity available', key='aq_numeric_headroom')
        st.number_input('Constrained-period utility capacity (m³/day)', min_value=0.0,
                        max_value=10000000.0, step=100.0, key='aq_headroom_capacity',
                        disabled=not st.session_state.aq_numeric_headroom)
    with b:
        st.number_input('Nearby operating-facility demand (m³/day)', min_value=0.0,
                        max_value=10000000.0, step=100.0, key='aq_existing_cluster_demand')
        st.number_input('Approved or committed demand (m³/day)', min_value=0.0,
                        max_value=10000000.0, step=100.0, key='aq_committed_demand')
    with c:
        st.selectbox('Basin and seasonal evidence', ['Regional proxy only', 'Verified basin data',
                     'Verified basin and seasonal data'], key='aq_basin_evidence')
    a, b = st.columns(2)
    with a:
        st.number_input('Population sharing the water system', min_value=1000, max_value=5000000,
                        step=10000, key='aq_population')
        st.selectbox('Dependence on shared potable supply', ['Unknown', 'High', 'Moderate', 'Low'], key='aq_dependence')
    with b:
        st.multiselect('Water-sensitive users nearby', RECEPTORS, key='aq_receptors')
        st.selectbox('Community engagement', ['Not started', 'Planned', 'In progress',
                     'Completed and documented'], key='aq_consultation')
    r = current_result()
    st.markdown(f'<div class="status {r["signal"].lower()}">Community Water Pressure Screening Index: {r["score"]}/100 · {r["signal"]}</div>', unsafe_allow_html=True)
    st.caption('Heuristic priority index only; not a measured health, social-impact, or household water-loss score.')
    a, b = st.columns(2)
    with a:
        st.subheader('Score contributions')
        st.dataframe(pd.DataFrame([{'Factor': k, 'Points': v} for k, v in r['score_parts'].items()]),
                     hide_index=True, use_container_width=True)
    with b:
        st.subheader('Evidence gaps')
        if r['gaps']:
            for item in r['gaps']: st.write(f'☐ {item}')
        else: st.success('Core evidence inputs completed; external review still required.')
    st.metric('Local direct-water system load', f'{r["direct_system_load"]:,.0f} m³/day')
    if st.session_state.aq_numeric_headroom and st.session_state.aq_headroom_capacity > 0:
        st.metric('Remaining entered capacity', f'{st.session_state.aq_headroom_capacity-r["direct_system_load"]:,.0f} m³/day')

else:
    r = current_result()
    st.header('Decision Brief')
    st.markdown(f'<div class="status {r["signal"].lower()}">{r["signal"]} · {r["location"]}<br>{r["decision"]}</div>', unsafe_allow_html=True)
    a, b, c, d = st.columns(4)
    a.metric('Direct water', f'{r["direct_condition"]:,.0f} m³/day')
    b.metric('Electricity-related', f'{r["indirect_condition"]:,.0f} m³/day')
    c.metric('Local direct system load', f'{r["direct_system_load"]:,.0f} m³/day')
    d.metric('Community index', f'{r["score"]}/100')
    st.subheader('Water Capacity Impact Statement')
    st.write(f'A proposed **{r["capacity"]:.0f} MW** data centre in **{r["location"]}** is modelled under '
             f'**{r["condition"].lower()}** at **{r["direct_condition"]:,.0f} m³/day** of direct facility water '
             f'and **{r["indirect_condition"]:,.0f} m³/day** of electricity-related water. '
             f'Including entered nearby direct demand, local water-system load is **{r["direct_system_load"]:,.0f} m³/day**. '
             f'The preliminary safeguard signal is **{r["signal"]}**.')
    st.subheader('Conditions to resolve')
    for gap in r['gaps'] or ['Maintain monitoring and obtain formal technical and regulatory validation.']:
        st.write(f'- {gap}')
    gap_lines = '\n'.join(f'- {gap}' for gap in r['gaps']) or '- Continue formal validation and monitoring.'
    brief = f'''# AquaSite Decision Brief

Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}

**Candidate:** {r['location']}
**Decision:** {r['signal']} — {r['decision']}
**Operating condition:** {r['condition']}

## Facility assumptions
- IT capacity: {r['capacity']:.1f} MW
- WUE: {r['wue']:.2f} m³/MWh
- PUE: {r['pue']:.2f}
- Grid water intensity: {r['grid_intensity']:.2f} m³/MWh
- Cooling: {st.session_state.aq_cooling}
- Water source: {r['source']}

## Modelled water demand
- Direct water (selected condition): {r['direct_condition']:,.0f} m³/day
- Electricity-related water (selected condition): {r['indirect_condition']:,.0f} m³/day
- Combined water footprint: {r['combined_footprint']:,.0f} m³/day
- Annual direct water: {r['annual_direct']:,.0f} m³/year
- Annual electricity-related water: {r['annual_indirect']:,.0f} m³/year
- Local direct system load incl. entered nearby demand: {r['direct_system_load']:,.0f} m³/day

## Screening
- Regional stress proxy: {r['stress_label']}
- Community pressure index: {r['score']}/100
- Utility headroom: {r['headroom']}
- Cumulative assessment: {r['cumulative']}
- Safeguard: {r['safeguard']}

## Outstanding evidence
{gap_lines}

## Limitations
Illustrative demonstration screening only. Indirect electricity-related water may be consumed outside the local utility system. No approval, measured community impact, verified utility capacity, or certified financial audit is implied.
'''
    st.download_button('Download decision brief (.md)', data=brief,
                       file_name='AquaSite_decision_brief.md', mime='text/markdown', use_container_width=True)
    with st.expander('Method and sources'):
        st.write('Direct water = IT MW × 24 × WUE × condition factor.')
        st.write('Electricity-related water = IT MW × 24 × PUE × grid water intensity × condition factor.')
        st.write('Local direct system load = direct facility water + entered existing + committed direct demand.')
        st.write(COUNTRIES[r['country']]['benchmark_note'])
        st.markdown('[Singapore Green Data Centre Roadmap](https://www.imda.gov.sg/-/media/imda/files/news-and-events/media-room/media-releases/2024/05/green-dc-roadmap.pdf) · [Malaysia Data Centre Planning Guideline](https://jpbd.penang.gov.my/images/faris/pdf/2025/GARIS%20PANDUAN/GPP%20PUSAT%20DATA%20-%20ENG.pdf) · [WRI Aqueduct](https://www.wri.org/data/aqueduct-40-country-rankings)')

st.caption('AquaSite prototype · Demonstration assumptions only · Not regulatory approval')
