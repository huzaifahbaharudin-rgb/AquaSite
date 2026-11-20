"use client";
import { useEffect, useState } from "react";
import type { NearbyFeature } from "@/lib/scenario/schema";
import { distanceToGeometry } from "./distance";

export type LayerKey = "water" | "protected" | "datacentre";

export interface GeoFeature {
  type: "Feature";
  properties: {
    id: string;
    name: string;
    nameEn: string | null;
    kind: string;
    layer: LayerKey;
    operator: string | null;
    source: string;
    precision: string;
    note?: string;
    areaHa?: number;
  };
  geometry: { type: string; coordinates: unknown };
}

export interface GeoData {
  basemap: { type: "FeatureCollection"; features: unknown[] };
  features: GeoFeature[];
}

let cache: Promise<GeoData> | null = null;

/** All geography is bundled in /public/geo, so the map works with no network access to tile servers. */
export function loadGeo(): Promise<GeoData> {
  if (!cache) {
    const get = (n: string) => fetch(`/geo/${n}.geojson`).then((r) => r.json());
    cache = Promise.all([get("basemap"), get("water"), get("protected"), get("datacentres")]).then(([basemap, w, p, d]) => ({
      basemap,
      features: [...w.features, ...p.features, ...d.features],
    }));
  }
  return cache;
}

export function useGeo() {
  const [data, setData] = useState<GeoData | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    loadGeo().then(setData).catch((e) => setError(String(e)));
  }, []);
  return { data, error };
}

export const LAYER_META: Record<LayerKey, { label: string; swatch: string; desc: string }> = {
  water: { label: "Water bodies", swatch: "water", desc: "Reservoirs, rivers, dams, treatment plants" },
  protected: { label: "Protected areas", swatch: "protected", desc: "Ramsar sites, parks, forest reserves" },
  datacentre: { label: "Existing data centres", swatch: "dc", desc: "OSM-mapped and publicly reported sites" },
};

export function distanceKm(lat: number, lon: number, f: GeoFeature) {
  return distanceToGeometry(lat, lon, f.geometry).km;
}

export function nearbyFeatures(lat: number, lon: number, features: GeoFeature[], perLayer = 3): NearbyFeature[] {
  const out: NearbyFeature[] = [];
  (["water", "protected", "datacentre"] as LayerKey[]).forEach((layer) => {
    features
      .filter((f) => f.properties.layer === layer)
      .map((f) => ({ f, km: distanceKm(lat, lon, f) }))
      .sort((a, b) => a.km - b.km)
      .slice(0, perLayer)
      .forEach(({ f, km }) =>
        out.push({
          id: f.properties.id,
          name: f.properties.name,
          layer,
          kind: f.properties.kind,
          distanceKm: Math.round(km * 100) / 100,
          source: f.properties.source,
          precision: f.properties.precision,
        }),
      );
  });
  return out;
}
