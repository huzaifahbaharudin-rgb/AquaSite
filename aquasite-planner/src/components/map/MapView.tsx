"use client";
import L from "leaflet";
import { useEffect, useRef } from "react";
import type { GeoFeature, GeoData, LayerKey } from "@/lib/geo/data";

export type TileStatus = "loading" | "ok" | "failed" | "off";

interface Props {
  data: GeoData;
  site: { lat: number; lon: number; name: string };
  siteSelected: boolean;
  layers: Record<LayerKey, boolean>;
  offline: boolean;
  focus: { id: string; nonce: number } | null;
  distanceTo: (f: GeoFeature) => number;
  onMapClick: (lat: number, lon: number) => void;
  onSiteClick: () => void;
  onFeatureClick: (id: string) => void;
  onTileStatus: (s: TileStatus) => void;
}

const SOUTH_JOHOR: L.LatLngBoundsExpression = [
  [1.26, 103.3],
  [1.86, 104.25],
];

const COLORS = {
  water: "#38a8ff",
  waterFill: "#2b82bd",
  protected: "#4ade80",
  protectedFill: "#28a862",
  dc: "#a78bfa",
  site: "#f4b860",
};

function popupHtml(f: GeoFeature, km: number) {
  const p = f.properties;
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
  return `<div class="pop">
    <div class="pop-kind">${esc(p.kind)}</div>
    <div class="pop-name">${esc(p.name)}</div>
    ${p.nameEn && p.nameEn !== p.name ? `<div class="pop-en">${esc(p.nameEn)}</div>` : ""}
    <div class="pop-dist"><b>${km < 0.05 ? "Site is inside this area" : km.toFixed(1) + " km"}</b> ${km < 0.05 ? "" : "straight-line from selected site"}</div>
    ${p.note ? `<div class="pop-note">${esc(p.note)}</div>` : ""}
    <dl><dt>Source</dt><dd>${esc(p.source)}</dd><dt>Precision</dt><dd>${esc(p.precision)}</dd></dl>
  </div>`;
}

export default function MapView(props: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const groups = useRef<Record<LayerKey, L.LayerGroup> | null>(null);
  const byId = useRef<Map<string, L.Layer & { openPopup?: () => void; getBounds?: () => L.LatLngBounds; getLatLng?: () => L.LatLng }>>(new Map());
  const siteLayer = useRef<L.LayerGroup | null>(null);
  const tiles = useRef<L.TileLayer | null>(null);
  const cb = useRef(props);
  cb.current = props;

  // Create map once.
  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, { zoomControl: true, attributionControl: true, minZoom: 8, maxZoom: 17, zoomSnap: 0.25 });
    m.fitBounds(SOUTH_JOHOR);
    m.createPane("basemap").style.zIndex = "150";
    m.createPane("areas").style.zIndex = "390";
    m.createPane("lines").style.zIndex = "400";
    m.createPane("points").style.zIndex = "610";
    m.createPane("site").style.zIndex = "650";

    // Bundled offline basemap (Natural Earth): always present underneath the tiles.
    L.geoJSON(props.data.basemap as never, {
      pane: "basemap",
      interactive: false,
      style: (f) => ({ color: "#27404f", weight: 1, fillColor: f?.properties?.name === "Johor" ? "#102633" : "#0a1822", fillOpacity: 1 }),
    }).addTo(m);
    m.attributionControl.addAttribution("Boundaries: Natural Earth · Features: © OpenStreetMap contributors, Ramsar RSIS");

    m.on("click", (e: L.LeafletMouseEvent) => cb.current.onMapClick(e.latlng.lat, e.latlng.lng));
    map.current = m;

    const g = { water: L.layerGroup(), protected: L.layerGroup(), datacentre: L.layerGroup() };
    groups.current = g;
    const bind = (layer: L.Layer, f: GeoFeature) => {
      layer.on("click", () => cb.current.onFeatureClick(f.properties.id));
      (layer as L.Path).bindTooltip(f.properties.name, { sticky: true, className: "tip" });
      byId.current.set(f.properties.id, layer as never);
    };

    for (const f of props.data.features) {
      const lay = f.properties.layer;
      const gt = f.geometry.type;
      let layer: L.Layer;
      if (gt === "Point") {
        const [lon, lat] = f.geometry.coordinates as number[];
        if (lay === "datacentre") {
          const approx = /Town-level/.test(f.properties.precision);
          layer = L.marker([lat, lon], {
            pane: "points",
            icon: L.divIcon({ className: "", html: `<div class="dc-pin${approx ? " approx" : ""}" aria-label="Data centre">DC</div>`, iconSize: [26, 26], iconAnchor: [13, 13] }),
            bubblingMouseEvents: false,
            keyboard: true,
            title: f.properties.name,
          });
          if (approx) L.circle([lat, lon], { radius: 3000, pane: "areas", color: COLORS.dc, weight: 1.5, dashArray: "4 4", fill: true, fillOpacity: 0.04, interactive: false }).addTo(g.datacentre);
        } else if (lay === "protected") {
          const areaHa = f.properties.areaHa;
          if (areaHa) {
            const r = Math.sqrt((areaHa * 10000) / Math.PI);
            L.circle([lat, lon], { radius: r, pane: "areas", color: COLORS.protected, weight: 2, dashArray: "6 5", fillColor: COLORS.protectedFill, fillOpacity: 0.12, interactive: false }).addTo(g.protected);
          }
          layer = L.circleMarker([lat, lon], { pane: "points", radius: 8, color: "#fff", weight: 2, fillColor: COLORS.protected, fillOpacity: 1, bubblingMouseEvents: false });
        } else {
          const wtp = /treatment/i.test(f.properties.kind);
          layer = L.circleMarker([lat, lon], { pane: "points", radius: wtp ? 6 : 5, color: wtp ? COLORS.water : "#fff", weight: 2, fillColor: wtp ? "#fff" : COLORS.water, fillOpacity: 1, bubblingMouseEvents: false });
        }
      } else if (gt === "LineString" || gt === "MultiLineString") {
        layer = L.geoJSON(f as never, { pane: "lines", style: { color: COLORS.water, weight: 2.5, opacity: 0.9 }, bubblingMouseEvents: false } as never);
      } else {
        const isWater = lay === "water";
        layer = L.geoJSON(f as never, {
          pane: "areas",
          style: { color: isWater ? COLORS.water : COLORS.protected, weight: 1.5, fillColor: isWater ? COLORS.waterFill : COLORS.protectedFill, fillOpacity: isWater ? 0.55 : 0.28 },
          bubblingMouseEvents: false,
        } as never);
      }
      bind(layer, f);
      layer.addTo(g[lay]);
    }

    siteLayer.current = L.layerGroup().addTo(m);
    setTimeout(() => m.invalidateSize(), 50);
    const registry = byId.current;
    return () => {
      m.remove();
      map.current = null;
      registry.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Basemap tiles (OpenStreetMap). If they fail, the bundled basemap remains.
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    tiles.current?.remove();
    tiles.current = null;
    if (props.offline) {
      cb.current.onTileStatus("off");
      return;
    }
    let loaded = 0;
    let errors = 0;
    cb.current.onTileStatus("loading");
    const t = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      className: "dark-map-tiles",
      opacity: 0.95,
    });
    t.on("tileload", () => {
      loaded++;
      if (loaded === 1) cb.current.onTileStatus("ok");
    });
    t.on("tileerror", () => {
      errors++;
      if (errors >= 3 && loaded === 0) cb.current.onTileStatus("failed");
    });
    const timer = setTimeout(() => {
      if (loaded === 0) cb.current.onTileStatus("failed");
    }, 6000);
    t.addTo(m);
    tiles.current = t;
    return () => clearTimeout(timer);
  }, [props.offline]);

  // Layer toggles.
  useEffect(() => {
    const m = map.current, g = groups.current;
    if (!m || !g) return;
    (Object.keys(g) as LayerKey[]).forEach((k) => (props.layers[k] ? g[k].addTo(m) : g[k].remove()));
  }, [props.layers]);

  // Site marker + 5/10 km rings.
  useEffect(() => {
    const s = siteLayer.current;
    if (!s) return;
    s.clearLayers();
    const { lat, lon } = props.site;
    [5, 10].forEach((km) => {
      L.circle([lat, lon], { radius: km * 1000, pane: "areas", color: COLORS.site, weight: 1.5, dashArray: "2 6", fill: false, interactive: false }).addTo(s);
      L.marker([lat + km / 110.574, lon], {
        pane: "areas",
        interactive: false,
        icon: L.divIcon({ className: "", html: `<span class="ring-label">${km} km</span>`, iconSize: [44, 18], iconAnchor: [22, 9] }),
      }).addTo(s);
    });
    const marker = L.marker([lat, lon], {
      pane: "site",
      icon: L.divIcon({
        className: "",
        html: `<div class="site-pin${props.siteSelected ? " selected" : ""}"><span></span></div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      }),
      bubblingMouseEvents: false,
      keyboard: true,
      title: props.site.name,
      zIndexOffset: 1000,
    });
    marker.on("click", () => cb.current.onSiteClick());
    marker.addTo(s);
  }, [props.site, props.siteSelected]);

  // Zoom to the site when it is selected (or moved while selected).
  useEffect(() => {
    const m = map.current;
    if (!m || !props.siteSelected) return;
    const target = L.latLng(props.site.lat, props.site.lon);
    if (m.getZoom() < 11) m.flyTo(target, 11.25, { duration: 0.8 });
    else if (!m.getBounds().pad(-0.15).contains(target)) m.panTo(target);
  }, [props.siteSelected, props.site.lat, props.site.lon]);

  // Focus a feature (from the side panel list).
  useEffect(() => {
    const m = map.current;
    if (!m || !props.focus) return;
    const layer = byId.current.get(props.focus.id);
    const f = props.data.features.find((x) => x.properties.id === props.focus!.id);
    if (!layer || !f) return;
    const km = cb.current.distanceTo(f);
    const target = layer.getLatLng ? layer.getLatLng() : layer.getBounds?.().getCenter();
    if (!target) return;
    const popup = L.popup({ maxWidth: 320, autoPanPadding: [40, 40] }).setLatLng(target).setContent(popupHtml(f, km));
    if (!m.getBounds().pad(-0.1).contains(target)) m.panTo(target);
    popup.openOn(m);
  }, [props.focus, props.data.features]);

  return <div ref={el} className="map" role="application" aria-label="Map of southern Johor. Click the map to move the candidate site." />;
}
