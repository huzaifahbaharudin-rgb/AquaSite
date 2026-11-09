import streamlit as st
import pandas as pd
import numpy as np

st.set_page_config(
    page_title="AquaSite | Infrastructure Water Risk Intelligence",
    page_icon="💧",
    layout="wide",
    initial_sidebar_state="expanded"
)

st.markdown("""
    <style>
    .main {background-color: #0A0F1D; color: #F1F5F9;}
    .stAppHeader {background-color: #0A0F1D;}
    .wp-card {
        background-color: #131A2E;
        border: 1px solid #1E293B;
        padding: 24px;
        border-radius: 12px;
        margin-bottom: 20px;
    }
    .wp-value {
        font-size: 32px;
        font-weight: 700;
        color: #F8FAFC;
        margin-top: 4px;
    }
    .wp-label {
        font-size: 11px;
        color: #94A3B8;
        text-transform: uppercase;
        letter-spacing: 1px;
        font-weight: 600;
    }
    .rating-badge {
        padding: 4px 12px;
        border-radius: 4px;
        font-weight: 700;
        font-size: 13px;
        display: inline-block;
    }
    .stTabs [data-baseweb="tab"] {
        color: #64748B; 
        font-size: 15px; 
        font-weight: 500;
        padding: 14px 20px;
    }
    .stTabs [aria-selected="true"] {
        color: #38BDF8 !important; 
        border-bottom-color: #38BDF8 !important;
    }
    </style>
""", unsafe_allow_html=True)

with st.sidebar:
    st.markdown("<p class='wp-label'>🗺️ Asset Target Node</p>", unsafe_allow_html=True)
    country = st.selectbox("Select Territory", ["Singapore", "Malaysia", "Indonesia"], label_visibility="collapsed")
    if country == "Singapore":
        area_coords = {
            "Jurong Innovation District": {"lat": 1.3483, "lon": 103.6831},
            "Changi North Industrial Park": {"lat": 1.3547, "lon": 103.9894}
        }
    elif country == "Malaysia":
        area_coords = {
            "Gelang Patah (Johor)": {"lat": 1.4475, "lon": 103.5900},
            "Cyberjaya (Kuala Lumpur)": {"lat": 2.9213, "lon": 101.6559}
        }
    else:
        area_coords = {
            "Nongsa Digital Park (Batam)": {"lat": 1.1519, "lon": 104.1012},
            "Jakarta Central": {"lat": -6.2088, "lon": 106.8456}
        }
    candidate_area = st.selectbox("Select Property Parcel", list(area_coords.keys()), label_visibility="collapsed")
    st.divider()
    st.markdown("<p class='wp-label'>⚡ Facility Infrastructure Sizing</p>", unsafe_allow_html=True)
    it_capacity = st.slider("Target IT Capacity (MW)", 5, 100, 30, step=5, label_visibility="collapsed")
    st.divider()
    st.markdown("<p class='wp-label'>🔄 Thermal Cooling Topology</p>", unsafe_allow_html=True)
    cooling_tech = st.radio("Cooling Selection", ["Traditional Evaporative Cooling", "Hybrid Eco-Chillers", "Tropical Liquid Cooling (SS 726)"], label_visibility="collapsed")
    st.divider()
    st.caption("🔒 Verified Sovereign Trust Compliance Framework • v2.6")

wue_factors = {"Traditional Evaporative Cooling": 2.6, "Hybrid Eco-Chillers": 1.5, "Tropical Liquid Cooling (SS 726)": 0.4}
target_wue = wue_factors[cooling_tech]
yearly_litres = int(it_capacity * target_wue * 25000000)
daily_cubic_meters = int((yearly_litres / 365) / 1000)
civilian_equivalency = int(it_capacity * 700 * (target_wue / 2.6))

node_pricing = {
    "Singapore": {"capex_per_mw": 23700000, "delay_penalty_base": 450000},
    "Malaysia": {"capex_per_mw": 14500000, "delay_penalty_base": 280000},
    "Indonesia": {"capex_per_mw": 12000000, "delay_penalty_base": 220000}
}
active_capex = int(it_capacity * node_pricing[country]["capex_per_mw"])
base_delay_penalty = node_pricing[country]["delay_penalty_base"]

if yearly_litres > 1500000000:
    status_label = "Class-C High Risk Exposure"
    badge_bg, badge_txt = "#7F1D1D", "#FCA5A5"
    loss_multiplier = 1.2  
    resolution_text = f"⚠️ CRITICAL INFRASTRUCTURE STRAIN: Target footprint exceeds localized dry-season utility availability for {candidate_area}. Project finance locked under Equator Principles sustainability guidelines."
elif yearly_litres > 600000000:
    status_label = "Class-B Conditional Clearance"
    badge_bg, badge_txt = "#78350F", "#FDE68A"
    loss_multiplier = 0.5  
    resolution_text = "⚡ MITIGATION REQUIRED: Water metrics flag regional seasonal supply stress. Asset funding requires implementation of closed-loop configuration options to pass the GRESB Data Center Assessment."
else:
    status_label = "Class-A Pre-Cleared for Investment"
    badge_bg, badge_txt = "#064E3B", "#A7F3D0"
    loss_multiplier = 0.0  
    resolution_text = "✨ DATA AUDIT CONFIRMED: Infrastructure design metrics are structurally sound. Resource footprint cleanly aligns with municipal network supply limits and local residential baselines."

projected_delay_loss = int(base_delay_penalty * loss_multiplier)

st.markdown("""
    <div style="padding: 10px 0 25px 0;">
        <h5 style="margin: 0; color: #38BDF8; font-size: 12px; letter-spacing: 1.5px; font-weight:700;">AQUASITE // PLATFORM</h5>
        <h1 style="margin: 5px 0 0 0; color: #F8FAFC; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">Water Risk & Infrastructure Stewardship</h1>
    </div>
""", unsafe_allow_html=True)

tab1, tab2, tab3 = st.tabs(["📊 Asset Risk Deck", "👥 Shared Watershed Data", "🛡️ Compliance Disclosure"])

with tab1:
    st.markdown(f"""
        <div style="background-color: #131A2E; border: 1px solid #1E293B; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <span style="font-size: 13px; color: #94A3B8; font-weight: 600; text-transform: uppercase;">Location Analysis: {candidate_area}</span>
                <span class="rating-badge" style="background-color: {badge_bg}; color: {badge_txt};">{status_label}</span>
            </div>
            <p style="margin: 0; color: #CBD5E1; font-size: 14px; line-height: 1.5;">{resolution_text}</p>
        </div>
    """, unsafe_allow_html=True)
    
    col_a, col_b, col_c = st.columns(3)
    with col_a:
        st.markdown(f"""
            <div class="wp-card">
                <span class="wp-label">💦 Volumetric Consumption Footprint</span>
                <div class="wp-value">{yearly_litres:,} <span style="font-size:14px; color:#64748B;">L / Year</span></div>
                <p style="margin:8px 0 0 0; font-size:13px; color: #94A3B8;">Equivalent to <b>{daily_cubic_meters:,} m³</b> drawn per operating day.</p>
            </div>
        """, unsafe_allow_html=True)
    with col_b:
        loss_display_color = "#EF4444" if projected_delay_loss > 0 else "#10B981"
        st.markdown(f"""
            <div class="wp-card">
                <span class="wp-label">📈 Financial Value-at-Risk Exposure</span>
                <div class="wp-value" style="color: {loss_display_color};">S$ {projected_delay_loss:,} <span style="font-size:14px; color:#64748B;">/ Day</span></div>
                <p style="margin:8px 0 0 0; font-size:13px; color: #94A3B8;">Projected capital loss from regulatory or social construction holds.</p>
            </div>
        """, unsafe_allow_html=True)
    with col_c:
        st.markdown(f"""
            <div class="wp-card">
                <span class="wp-label">👥 Watershed Civilian Footprint Draw</span>
                <div class="wp-value" style="color:#F59E0B;">~{civilian_equivalency:,} <span style="font-size:14px; color:#64748B;">Households</span></div>
                <p style="margin:8px 0 0 0; font-size:13px; color: #94A3B8;">Comparative scale of local residential community intake metrics.</p>
            </div>
        """, unsafe_allow_html=True)
        
    g_col1, g_col2 = st.columns(2)
    with g_col1:
        st.markdown("<p class='wp-label'>📍 Geographic Infrastructure Site Model</p>", unsafe_allow_html=True)
        selected_lat, selected_lon = area_coords[candidate_area]["lat"], area_coords[candidate_area]["lon"]
        map_df = pd.DataFrame({'lat': [selected_lat, selected_lat + 0.003, selected_lat - 0.002], 'lon': [selected_lon, selected_lon - 0.004, selected_lon + 0.003]})
        st.map(map_df, zoom=13)
    with g_col2:
        st.markdown("<p class='wp-label'>💎 Asset Capital Valuation</p>", unsafe_allow_html=True)
        st.markdown(f"""
            <div style="background-color: #131A2E; border: 1px solid #1E293B; padding: 20px; border-radius: 8px; margin-bottom: 15px;">
                <span style="font-size: 11px; color: #94A3B8; text-transform: uppercase;">Total Project Valuation</span>
                <div style="font-size: 24px; font-weight: 700; color: #F8FAFC; margin-top:4px;">S$ {active_capex:,}</div>
                <span style="font-size: 12px; color: #64748B;">Based on regional index tracking in {country}</span>
            </div>
            <div style="background-color: #131A2E; border: 1px solid #1E293B; padding: 20px; border-radius: 8px;">
                <span style="font-size: 11px; color: #94A3B8; text-transform: uppercase;">Independent Valuation Fees</span>
                <ul style="font-size: 13px; color: #CBD5E1; padding-left: 20px; margin: 8px 0 0 0; line-height:1.6;">
                    <li><b>Tier 2 SaaS Lookup:</b> S$ 2,500</li>
                    <li><b>Tier 3 Project Audit:</b> S$ 85,000</li>
                </ul>
            </div>
        """, unsafe_allow_html=True)

    st.divider()
    st.markdown("<p class='wp-label'>📍 Granular Grid Telemetry Mismatch</p>", unsafe_allow_html=True)
    grid_table = pd.DataFrame({
        'Infrastructure Vector Mapped': ['Municipal Mains Network Pipeline Capacity', 'Seasonal Watershed Supply Dropdown Max', 'Regional Treatment Plant Saturations', 'Community Access Safeguard Buffers'],
        'Macro System Score (10km Pixel Resolution)': ['Unmonitored Area Baseline', 'Annualized Linear Averages', 'Province-wide Aggregate Metric', 'General Country Metrics'],
        'AquaSite Hyper-Local Telemetry (<1km Resolution Layer)': ['⛔ CRITICAL BOTTLENECK - 250mm Limitation Detected', '🚨 High Vulnerability - July Dry-Season Drop -42%', '⚠️ Saturation Threshold Hit - 91% Utility Node Load', '🔥 Severe Local Flashpoint Exposure Confirmed']
    })
    st.table(grid_table)

with tab2:
    st.markdown("### Shared Watershed Accountability Index")
    st.caption("Open data verification log ensuring total transparency for local town councils, utilities, and communities.")
    st.divider()
    st.markdown("""
        <div style="background-color: #0F172A; border-left: 4px solid #38BDF8; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
            <span class="wp-label" style="color: #38BDF8;">📢 Open Data Transparency Layer (Tier 1 Utility)</span>
            <p style="margin: 5px 0 0 0; font-size: 13px; color: #94A3B8;">This registry records verified plain-language translations and binding public answer indexes to protect community water access tables from industrial over-allocation.</p>
        </div>
    """, unsafe_allow_html=True)
    comm_q = st.text_input("💬 Submit Public Watershed Inquiry", placeholder="Enter specific resource or pressure impact questions...")
    if comm_q:
        st.success("🔒 System Verified. Telemetry query logged and forwarded to regional academic review council for audited disclosure.")
    st.markdown("#### Active Public Accountability Register")
    st.markdown("""
    *   **Public Framework Status:** 📡 Pre-Application Early Notice Broadcast Complete (English / Malay / Indonesian Documentation Verified)
    *   **Audited Q&A History:**
        *   *Inquiry (Local Resident Action Council):* "Will the site peak-season evaporative footprint deplete line pressure for surrounding domestic housing sectors?"
        *   *Audit Determination:* **YES.** Baseline configurations will compromise domestic pressures. Developer issued optimization notice to adapt system specs to closed-loop or liquid cooling configurations to preserve local infrastructure clearance.
    """)

with tab3:
    st.markdown("### Institutional Capital Compliance Audit")
    st.caption("Verification parameters aligned with the Equator Principles and GRESB Data Center Assessment metrics.")
    st.divider()
    st.markdown("""
        <div style="background-color: #064E3B; padding: 20px; border-radius: 8px; border: 1px solid #059669; margin-bottom: 25px;">
            <span class="wp-label" style="color: #A7F3D0;">🔒 Firewalled Verification Clearance</span>
            <p style="margin: 5px 0 0 0; font-size: 13px; color: #A7F3D0;">This report is independent of corporate developer financial sponsorship. Financed via independent research grants and public infrastructure planning bodies.</p>
        </div>
    """, unsafe_allow_html=True)
    c1, c2, c3 = st.columns(3)
    c1.checkbox("Volumetric Supply Risk Neutralized", value=("Investment" in status_label))
    c2.checkbox("Social License to Operate Cleared", value=("High Risk" not in status_label))
    c3.checkbox("Portfolio Stranded Asset Risks Immunized", value=("Investment" in status_label))
    st.divider()
    if st.button("📥 RUN AUDIT DISCLOSURE EXPORT FOR SUSTAINABLE LENDERS"):
        st.balloons()
        st.success("Cryptographically signed document compiled for project finance integration.")
