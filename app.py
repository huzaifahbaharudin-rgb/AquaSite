from pathlib import Path

import streamlit as st
import streamlit.components.v1 as components

st.set_page_config(
    page_title="AquaSite — Water Compliance Platform",
    page_icon="💧",
    layout="wide",
    initial_sidebar_state="collapsed",
)

# Hide Streamlit chrome and remove padding so the app fills the page.
st.markdown(
    """
    <style>
      #MainMenu, header, footer {visibility: hidden;}
      .block-container {padding: 0 !important; max-width: 100% !important;}
      .stApp {background: #0A0F1D;}
    </style>
    """,
    unsafe_allow_html=True,
)

# index.html must sit in the same folder as app.py
html = (Path(__file__).parent / "index.html").read_text(encoding="utf-8")

# Increase height if the bottom of the page is cut off.
components.html(html, height=2800, scrolling=True)
