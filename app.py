import streamlit as st
import pandas as pd
import numpy as np

# 1. PAGE CONFIGURATION & NEON INDUSTRIAL THEME
st.set_page_config(
    page_title="AquaSite | Water Safeguard Simulator",
    page_icon="⚡",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Premium Terminal Styling
st.markdown("""
    <style>
    /* Dark Mode Core Workspace */
    .main {background-color: #030712; color: #F3F4F6;}
    .stAppHeader {background-color: #030712;}
    
    /* Neomorphic & Glowing Card Components */
    .glow-card {
        background: radial-gradient(circle at top left, #1F2937, #111827);
        border: 1px solid #374151;
        padding: 24px;
        border-radius: 16px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        margin-bottom: 20px;
    }
    
    /* Neon Status Pill Badges */
    .status-badge {
        padding: 6px 14px;
        border-radius: 50px;
        font-weight: 800;
        font-size: 14px;
        text-transform: uppercase;
        letter-spacing: 1px;
        display: inline-block;
    }
    
    /* Custom Scannable Metrics Styling */
    .metric-value {
        font-size: 34px;
        font-weight: 800;
        font-family: 'Courier New', Courier, monospace;
        margin: 5px 0;
    }
    .metric-label {
        font-size: 13px;
        color: #9CA3AF;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    
    /* Custom Navigation Tabs */
    .stTabs [data-baseweb="tab"] {
        color: #6B7280; 
        font-size: 16px; 
        font-weight: 600;
        padding: 12px 24px;
    }
    .stTabs [aria-selected="true"] {
        color: #38BDF8 !important; 
        border-bottom-color: #38BDF8 !important;
    }
    </style>
""", unsafe_allow_html=True)

# 2. INTERACTIVE SIDEBAR NAVIGATION (THE DESIGN LEVERS)
with st.sidebar:
    st.markdown("### 🛠️ CONFIGURATION LEVERS")
    st.caption("Adjust engineering parameters in real-time to clear regional environmental constraints.")
    st.divider()
    
    country = st.selectbox("🌐 Target Territory", ["Singapore", "Malaysia", "Indonesia"])
    
    # Context-aware area selection with simulated geographic coordinate mapping
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
    else:  # Indonesia
        area_coords = {
            "Nongsa Digital Park (Batam)": {"lat": 1.1519, "lon": 104.1012},
            "Jakarta Central": {"lat": -6.2088, "lon": 106.8456}
        }
        
    candidate_area = st.selectbox("📍 Project Parcel Node", list(area_coords.keys()))
    
    st.markdown("#### ⚡ Infrastructure Scaling")
    it_capacity = st.slider("Target IT Capacity (MW)", 5, 100, 30, step=5)
    
    st.markdown("#### 🔄 Thermal Management System")
    cooling_tech = st.radio(
        "Planned Cooling Topology",
        ["Traditional Evaporative Cooling", "Hybrid Eco-Chillers", "Tropical Liquid Cooling (SS 726)"]
    )
    
    st.divider()
    st.caption("🔒 AquaSite Sovereign Trust Platform • v2.6 Open-Source Architecture")

# 3. ADVANCED BACKEND LOGIC: REGIONAL METRICS & CONSTRAINTS FORMULAS
wue_factors = {
    "Traditional Evaporative Cooling": 2.6, 
    "Hybrid Eco-Chillers": 1.5, 
    "Tropical Liquid Cooling (SS 726)": 0.4
}
target_wue = wue_factors[cooling_tech]

# Dynamic consumption mathematics
yearly_litres = int(it_capacity * target_wue * 25000000)
daily_cubic_meters = int((yearly_litres / 365) / 1000)
civilian_equivalency = int(it_capacity * 700 * (target_wue / 2.6))

# Node-Specific Asset Cost Variables (CAPEX/MW & Daily Delay Burn Risk mapped to real-world market costs)
node_pricing = {
    "Singapore": {"capex_per_mw": 23700000, "delay_penalty_base": 450000},
    "Malaysia": {"capex_per_mw": 14500000, "delay_penalty_base": 280000},
    "Indonesia": {"capex_per_mw": 12000000, "delay_penalty_base": 220000}
}

active_capex = int(it_capacity * node_pricing[country]["capex_per_mw"])
base_delay_penalty = node_pricing[country]["delay_penalty_base"]

# Dynamic Threshold Evaluator (Simulating hyper-local water pipeline load parameters)
if yearly_litres > 1500000000:
    status_label = "CRITICAL RED - ASSET BLOCKED"
    bg_color = "rgba(239, 68, 68, 0.15)"
    border_color = "#EF4444"
    glow_color = "rgba(239, 68, 68, 0.4)"
    loss_multiplier = 1.2  
    resolution_text = f"⚠️ PROJECT FINANCE TERMINATED. Peak cooling footprint exceeds the local carrying capacity of {candidate_area}. Capital allocation frozen under Equator Principles criteria until design adjustments drop demand thresholds."
elif yearly_litres > 600000000:
    status_label = "CONDITIONAL AMBER - UNDER OPTIMIZATION"
    bg_color = "rgba(245, 158, 11, 0.15)"
    border_color = "#F59E0B"
    glow_color = "rgba(245, 158, 11, 0.4)"
    loss_multiplier = 0.5  
    resolution_text = "⚡ MITIGATION STRATEGY COMPULSORY. To satisfy GRESB Data Center Assessment guidelines and unlock institutional green bonds, alter design levers to transition to liquid cooling frameworks."
else:
    status_label = "SECURE GREEN - PRE-CLEARED FOR DEPLOYMENT"
    bg_color = "rgba(16, 185, 129, 0.15)"
    border_color = "#10B981"
    glow_color = "rgba(16, 185, 129, 0.4)"
    loss_multiplier = 0.0  
    resolution_text = "✨ PRE-CLEARANCE CERTIFICATE VALID. Core infrastructure design is mathematically compatible with local municipal pipeline safety parameters and baseline civilian household needs."

projected_delay_loss = int(base_delay_penalty * loss_multiplier)

# 4. APP VIEWHEADER WITH GRADIENT BRANDING
st.markdown("""
    <div style="background: linear-gradient(90deg, #0284C7, #0EA5E9); padding: 2px; border-radius: 12px; margin-bottom: 25px;">
        <div style="background-color: #0B0F19; padding: 20px; border-radius: 10px;">
            <h1 style="margin: 0; color: #FFF; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">💧 AQUASITE // <span style="color: #38BDF8;">SIMULATOR</span></h1>
            <p style="margin: 5px 0 0 0; color: #9CA3AF; font-size: 14px;">Hyper-local Pre-Development Resource Modeling Framework for Sustainable Data Center Infrastructure</p>
        </div>
    </div>
""", unsafe_allow_html=True)

# THE NAVIGATION TABS
tab1, tab2, tab3 = st.tabs(["🚀 SIMULATION DECK", "📢 COMMUNITY EVIDENCE INDEX", "🛡️ INVESTOR DUE DILIGENCE REPORT"])

with tab1:
    # ⚡ Real-Time Diagnostic Evaluation Alert Window
    st.markdown(f"""
        <div style="background-color: {bg_color}; border: 1px solid {border_color}; padding: 20px; border-radius: 12px; box-shadow: 0 0 15px {glow_color}; margin-bottom: 25px;">
            <span class="status-badge" style="background-color: {border_color}; color: #000;">{status_label}</span>
            <h4 style="margin: 12px 0 6px 0; color: #F3F4F6;">PARCEL NODE DIALOGUE: {candidate_area} ({country.upper()})</h4>
            <p style="margin: 0; color: #D1D5DB; font-size: 14px; line-height: 1.5;">{resolution_text}</p>
        </div>
    """, unsafe_allow_html=True)
    
    # 🗺️ GEOGRAPHIC VISUALIZATION MODULE (SPLIT VIEW)
    map_col, text_col = st.columns()
    
    with map_col:
        st.markdown("#### 🗺️ Hyper-Local Parcel Telemetry Map")
        selected_lat = area_coords[candidate_area]["lat"]
        selected_lon = area_coords[candidate_area]["lon"]
        
        map_df = pd.DataFrame({
            'lat': [selected_lat, selected_lat + 0.004, selected_lat - 0.003],
            'lon': [selected_lon, selected_lon - 0.005, selected_lon + 0.004],
            'type': ['Target Site', 'Municipal Reservoir Hub', 'Residential Sector Intake']
        })
        st.map(map_df, size=40, zoom=13)
        
    with text_col:
        st.markdown("#### 💎 Asset Valuation Model")
        st.markdown(f"""
            <div style="background-color:#111827; border: 1px solid #374151; padding:18px; border-radius:12px; margin-bottom:15px;">
                <span style="font-size:11px; color:#9CA3AF; text-transform:uppercase; letter-spacing:0.5px;">Total Facility CAPEX</span>
                <div style="font-size:24px; font-weight:800; color:#F3F4F6; font-family:monospace;">S$ {active_capex:,}</div>
                <span style="font-size:12px; color:#6B7280;">Based on regional index scaling of S$ {node_pricing[country]["capex_per_mw"]:,} per MW</span>
            </div>
            <div style="background-color:#111827; border: 1px solid #374151; padding:18px; border-radius:12px;">
                <span style="font-size:11px; color:#9CA3AF; text-transform:uppercase; letter-spacing:0.5px;">B2B Audit Validation Tier Fees</span>
                <ul style="font-size:13px; color:#CBD5E1; padding-left:20px; margin:5px 0 0 0;">
                    <li><b>Tier 2 Single Lookup:</b> S$ 2,500</li>
                    <li><b>Tier 3 Project Audit:</b> S$ 85,000</li>
                </ul>
            </div>
        """, unsafe_allow_html=True)

    st.divider()

    # 📊 Immersive Metric Control Matrix
    m_col1, m_col2, m_col3 = st.columns(3)
    
    with m_col1:
        st.markdown(f"""
            <div class="glow-card">
                <div class="metric-label">💦 Total Footprint Load</div>
                <div class="metric-value" style="color: #38BDF8;">{yearly_litres:,} <span style="font-size:16px;">L/Year</span></div>
                <p style="margin:0; font-size:13px; color: #9CA3AF;">Equivalent to <b>{daily_cubic_meters:,} m³</b> consumed per day.</p>
            </div>
        """, unsafe_allow_html=True)
        
    with m_col2:
        loss_color = "#EF4444" if projected_delay_loss > 0 else "#10B981"
        st.markdown(f"""
            <div class="glow-card">
                <div class="metric-label">📉 Unmitigated Capital Exposure Risk</div>
                <div class="metric-value" style="color: {loss_color};">S$ {projected_delay_loss:,} <span style="font-size:16px;">/Day</span></div>
                <p style="margin:0; font-size:13px; color: #9CA3AF;">Projected capital burn from construction gridlock delays.</p>
            </div>
        """, unsafe_allow_html=True)

    with m_col3:
        st.markdown(f"""
            <div class="glow-card">
                <div class="metric-label">👥 Grassroots Social Resource Draw</div>
                <div class="metric-value" style="color: #F59E0B;">~{civilian_equivalency:,} <span style="font-size:16px;">Households</span></div>
                <p style="margin:0; font-size:13px; color: #9CA3AF;">Civilian population volume drawing identical resource metrics.</p>
            </div>
        """, unsafe_allow_html=True)

    # 🗺️ Macro vs Micro Parcel Discrepancy Matrix
    st.markdown("### 📍 Hyper-Local Resolution Discrepancy Index")
    st.caption("Why generic solutions fail: AquaSite parcel telemetry vs Global Macro Maps (WRI Aqueduct 10km Scale Grid Deficit)")
    
    grid_data = pd.DataFrame({
        'Environmental Control Vector': ['Municipal Water Main Pipe Baseline Capacity', 'Seasonal Hydrological Water Drawdown Max', 'Local Treatment Plant Utility Strain Limit', 'Community Drinking Water Safety Margin'],
        'Macro-Satellite Baseline Rating (10km Pixel Grid)': ['Unmonitored Regional Target Area', 'Annualized Linear Average Calculation', 'Province-wide Aggregate Metric', 'General Country Metrics Only'],
        'AquaSite Hyper-Local Telemetry (<1km Real-world Scale)': ['⛔ CRITICAL BOTTLENECK - 250mm Limitation Found', '🚨 High Vulnerability - Peak July Drawdown Drop -42%', '⚠️ Saturation Threshold Hit - 91% Node Load', '🔥 Severe Local Flashpoint Exposure Risk Identified']
    })
    st.table(grid_data)

with tab2:
    st.markdown("### 👥 Community Transparency Registry")
    st.caption("Active decentralized tracking ensuring complete data visibility for local town councils and regional populations.")
    st.divider()
    
    st.markdown("""
        <div style="background-color: #111827; border-left: 4px solid #38BDF8; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
            <h4 style="margin:0 0 5px 0; color: #38BDF8;">📢 OPEN FRAMEWORK DISCLOSURE CLAUSE (TIER 1)</h4>
            <p style="margin:0; font-size:13px; color: #9CA3AF;">This log records verified plain-language translations and binding public answer records. It cannot be bought or edited by project developers.</p>
        </div>
    """, unsafe_allow_html=True)
    
    # Interactive Community Sim Input
    comm_q = st.text_input("💬 Submit Local Public Inquiry Entry", placeholder="Enter questions regarding seasonal water table impacts...")
    if comm_q:
        st.success("🔒 Request Logged. Forwarded to designated engineering review group for published, binding response within 48 hours.")
        
    st.markdown("#### 📜 Current Community Audit History")
    st.markdown("""
    *   **Notification Node Status:** 📡 Pre-Application Early Notice Broadcast Complete (English / Malay / Indonesian Documentation Uploaded)
    *   **Public Q&A Registry Logs:**
        *   *Inquiry (Resident Action Group):* "Will the peak evaporative cooling capacity lower municipal pressure for local agricultural zones?"
        *   *Audit Determination:* **YES.** Evaporative specifications will trigger network drops. Developer issued conditional update to transition to closed-loop chillers to retain social license profile.
    """)

with tab3:
    st.markdown("### 🛡️ Green Bond Project Finance Pre-Clearance Matrix")
    st.caption("Due diligence criteria built to satisfy the Equator Principles and GRESB Data Center Assessment metrics.")
    st.divider()
    
    st.markdown("""
        <div style="background-color: #064E3B; border: 1px solid #059669; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
            <h4 style="margin: 0 0 5px 0; color: #10B981;">🔒 INDEPENDENT VERIFIED IMPACT RATING</h4>
            <p style="margin: 0; color: #A7F3D0; font-size: 14px;">This asset evaluation was generated via firewall public utility and research grants. Financial independence from commercial project developers is certified.</p>
        </div>
    """, unsafe_allow_html=True)
    
    # Audit checklist visualization
    c1, c2, c3 = st.columns(3)
    c1.checkbox("Hydrological Network Clearance Passed", value=("GREEN" in status_label))
    c2.checkbox("Social License Plan Validated", value=("RED" not in status_label))
    c3.checkbox("Portfolio Stranded Asset Immunity Confirmed", value=("GREEN" in status_label))
    
    st.divider()
    if st.button("📥 GENERATE OFFICIAL AUDIT PDF REPORT FOR SUSTAINABLE LENDERS"):
        st.balloons()
        st.success("Report Generated. Document compiled with encrypted cryptographic signature for institutional investor submission.")
