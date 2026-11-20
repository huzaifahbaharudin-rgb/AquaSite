"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DEFAULT_SITE } from "@/lib/scenario/defaults";
import { distanceKm, LAYER_META, nearbyFeatures, useGeo, type GeoFeature, type LayerKey } from "@/lib/geo/data";
import { useScenario } from "@/lib/state/store";
import type { TileStatus } from "@/components/map/MapView";

const MapView = dynamic(() => import("@/components/map/MapView"), { ssr: false, loading: () => <div className="map map-loading">Loading map…</div> });

const fmtCoord = (lat: number, lon: number) => `${lat.toFixed(4)}° N, ${lon.toFixed(4)}° E`;

export default function SiteStep() {
  const { state, dispatch, hydrated } = useScenario();
  const { data, error } = useGeo();
  const [tile, setTile] = useState<TileStatus>("loading");
  const [focus, setFocus] = useState<{ id: string; nonce: number } | null>(null);
  const { site, siteSelected, layers, offlineMap } = state;

  const nearby = useMemo(() => (data ? nearbyFeatures(site.lat, site.lon, data.features, 3) : []), [data, site.lat, site.lon]);

  // Keep the handoff's nearby list in sync with the current pin.
  useEffect(() => {
    if (!data) return;
    const same = JSON.stringify(nearby) === JSON.stringify(site.nearby);
    if (!same) dispatch({ type: "setNearby", nearby });
  }, [nearby, data, site.nearby, dispatch]);

  const counts10 = useMemo(() => {
    if (!data) return null;
    const c: Record<LayerKey, number> = { water: 0, protected: 0, datacentre: 0 };
    data.features.forEach((f) => {
      if (distanceKm(site.lat, site.lon, f) <= 10) c[f.properties.layer]++;
    });
    return c;
  }, [data, site.lat, site.lon]);

  const onMapClick = useCallback(
    (lat: number, lon: number) => {
      dispatch({
        type: "setSite",
        site: { ...DEFAULT_SITE, name: `Custom site · ${lat.toFixed(3)}° N, ${lon.toFixed(3)}° E`, lat: +lat.toFixed(5), lon: +lon.toFixed(5), placement: "user-placed", nearby: [] },
      });
      dispatch({ type: "selectSite", selected: true });
    },
    [dispatch],
  );

  const distanceTo = useCallback((f: GeoFeature) => distanceKm(site.lat, site.lon, f), [site.lat, site.lon]);

  if (!hydrated) return <div className="page-loading">Loading…</div>;

  return (
    <div className="site-step">
      <section className="map-wrap" aria-label="Site map">
        {error && <div className="map map-loading">Could not load bundled geography: {error}</div>}
        {data && (
          <MapView
            data={data}
            site={site}
            siteSelected={siteSelected}
            layers={layers}
            offline={offlineMap}
            focus={focus}
            distanceTo={distanceTo}
            onMapClick={onMapClick}
            onSiteClick={() => dispatch({ type: "selectSite", selected: true })}
            onFeatureClick={(id) => setFocus({ id, nonce: Date.now() })}
            onTileStatus={setTile}
          />
        )}

        <div className="map-overlay top-left">
          <div className="layer-card" role="group" aria-label="Map layers">
            <div className="card-eyebrow">Map layers</div>
            <div className="layer-pills">
            {(Object.keys(LAYER_META) as LayerKey[]).map((k) => (
              <label key={k} className={`layer-toggle ${layers[k] ? "active" : ""}`} title={LAYER_META[k].desc}>
                <input type="checkbox" checked={layers[k]} onChange={() => dispatch({ type: "toggleLayer", layer: k })} />
                <span className={`swatch ${LAYER_META[k].swatch}`} aria-hidden />
                <b>{LAYER_META[k].label}</b>
              </label>
            ))}
            </div>
            <div className="legend-extra">
              <span><i className="lg site" /> Candidate site</span>
              <span><i className="lg dashed" /> Approximate extent</span>
            </div>
          </div>
        </div>

        <div className="map-overlay bottom-left">
          <div className={`tile-status ${tile}`}>
            {tile === "ok" && "Basemap: OpenStreetMap"}
            {tile === "loading" && "Loading basemap tiles…"}
            {tile === "failed" && "Tiles unavailable · showing bundled offline map"}
            {tile === "off" && "Offline map (bundled geography only)"}
            <button type="button" className="link-btn" onClick={() => dispatch({ type: "setOffline", offline: !offlineMap })}>
              {offlineMap ? "Use online tiles" : "Use offline map"}
            </button>
          </div>
        </div>

        {!siteSelected && (
          <div className="map-overlay top-center">
            <div className="hint-chip">Click the orange pin to select the illustrative site, or click anywhere on the map to place your own</div>
          </div>
        )}
      </section>

      <aside className="side-panel" aria-label="Selected site">
        <div className="panel-head">
          <div className="eyebrow">Step 1 · Select a site</div>
          <h1>Choose a location</h1>
          <p>Explore the surrounding water and environmental context, then confirm the site.</p>
        </div>

        {!siteSelected ? (
          <div className="panel-body">
            <div className="site-card idle">
              <div className="site-card-kind">Suggested demo location</div>
              <div className="site-card-name">{site.name}</div>
              <div className="mono muted">{fmtCoord(site.lat, site.lon)}</div>
              <button type="button" className="btn primary block" onClick={() => dispatch({ type: "selectSite", selected: true })}>
                Select this location
              </button>
            </div>
            <p className="map-instruction"><span aria-hidden>＋</span> Click anywhere on the map to evaluate another location.</p>
          </div>
        ) : (
          <div className="panel-body">
            <div className="site-card selected">
              <div className="site-card-kind">{site.placement === "illustrative-candidate" ? "Illustrative candidate · selected" : "Your placed site · selected"}</div>
              <div className="site-card-name">{site.name}</div>
              <div className="mono">{fmtCoord(site.lat, site.lon)}</div>
              {site.placement === "user-placed" && (
                <button type="button" className="link-btn" onClick={() => dispatch({ type: "setSite", site: DEFAULT_SITE })}>
                  ↺ Back to illustrative candidate
                </button>
              )}
            </div>

            {counts10 && (
              <div className="context-block">
                <div className="context-heading"><span>Site context</span><small>Within a 10 km radius</small></div>
                <div className="within10" aria-label="Mapped features within 10 km">
                <div><b>{counts10.water}</b><span>water features</span></div>
                <div><b>{counts10.protected}</b><span>protected areas</span></div>
                <div><b>{counts10.datacentre}</b><span>data centres</span></div>
                </div>
              </div>
            )}

            <div className="nearby">
              {(["water", "protected", "datacentre"] as LayerKey[]).map((layer) => (
                <div key={layer} className="nearby-group">
                  <div className="nearby-title">
                    <span className={`swatch ${LAYER_META[layer].swatch}`} aria-hidden /> Nearest {LAYER_META[layer].label.toLowerCase()}
                  </div>
                  <ul>
                    {nearby
                      .filter((n) => n.layer === layer)
                      .map((n) => (
                        <li key={n.id}>
                          <button type="button" className="nearby-item" onClick={() => setFocus({ id: n.id, nonce: Date.now() })}>
                            <span className="ni-name">{n.name}</span>
                            <span className="ni-kind">{n.kind}</span>
                            <span className="ni-dist">{n.distanceKm < 0.05 ? "inside" : `${n.distanceKm.toFixed(1)} km`}</span>
                          </button>
                        </li>
                      ))}
                  </ul>
                </div>
              ))}
            </div>
            <p className="caveat">
              Straight-line distances to mapped features are geographic context only. They do not show a water-supply connection, a permit constraint or an official restriction.
            </p>
          </div>
        )}

        <div className="panel-foot">
          {siteSelected ? (
            <Link href="/configure" className="btn primary block large" aria-label="Use this site and configure the data centre">
              Use this site <span aria-hidden>→</span>
            </Link>
          ) : (
            <button type="button" className="btn primary block large" disabled>Select a location to continue</button>
          )}
          <details className="sources">
            <summary>Data coverage and methodology</summary>
            <ul>
              <li>Water bodies, rivers, dams, treatment plants, parks and forest reserves: © OpenStreetMap contributors (ODbL), simplified.</li>
              <li>Ramsar sites: Ramsar Sites Information Service centre coordinates (±2 km); dashed circle = equal-area indicative extent.</li>
              <li>Data centres: OSM-mapped buildings/sites, plus operator sites reported by Bernama (Jul 2026), pinned at town level (±3–5 km).</li>
              <li>Offline basemap: Natural Earth 10m state boundaries.</li>
            </ul>
          </details>
        </div>
      </aside>
    </div>
  );
}
