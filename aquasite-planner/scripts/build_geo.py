"""Turn the compact OSM extracts + Natural Earth boundaries into bundled GeoJSON for the app."""
import json, sys
from pathlib import Path

HERE = Path(__file__).parent.parent / "data" / "raw"
OUT = Path(sys.argv[1])
OUT.mkdir(parents=True, exist_ok=True)
OSM_SRC = "© OpenStreetMap contributors (ODbL), Overpass API extract 16–17 Nov 2026"

KIND_LABEL = {"reservoir": "Reservoir", "dam": "Dam", "water_works": "Water treatment plant", "river": "River",
              "nature_reserve": "Nature reserve / park", "protected_area": "Protected area", "national_park": "National / state park"}


def parse(path, layer, precision_for):
    feats = []
    for line in Path(path).read_text().strip().splitlines():
        fid, kind, name, extra, gtype, coords = line.split("|", 5)
        rings = [[[float(a) for a in pt.split()] for pt in ring.split(",")] for ring in coords.split(";") if ring.strip()]
        if gtype == "P":
            geom = {"type": "Point", "coordinates": rings[0][0]}
        elif gtype == "L":
            geom = {"type": "MultiLineString", "coordinates": rings} if len(rings) > 1 else {"type": "LineString", "coordinates": rings[0]}
        else:
            for r in rings:
                if r[0] != r[-1]:
                    r.append(r[0])
            geom = {"type": "MultiPolygon", "coordinates": [[r] for r in rings]} if len(rings) > 1 else {"type": "Polygon", "coordinates": rings}
        name_en = extra if extra and not extra.endswith("ways") and extra not in ("SAJ", "Ranhill SAJ") else None
        operator = extra if extra in ("SAJ", "Ranhill SAJ") else None
        osm_id = None if fid == "riv" else {"n": "node", "w": "way", "r": "relation"}[fid[0]] + "/" + fid[1:]
        feats.append({
            "type": "Feature",
            "properties": {
                "id": osm_id or f"river/{name}",
                "name": name,
                "nameEn": name_en,
                "kind": kind_for(name, kind),
                "layer": layer,
                "operator": operator,
                "source": OSM_SRC + (f" · {osm_id}" if osm_id else " · named waterway=river ways, merged by name"),
                "precision": precision_for(gtype, kind),
            },
            "geometry": geom,
        })
    return feats


def kind_for(name, kind):
    if name.startswith("Hutan Rizab"): return "Forest reserve"
    if name.startswith("Hutan Lipur"): return "Recreational forest (Hutan Lipur)"
    if name.startswith("Taman Negara"): return "State / national park"
    if "Elephant" in name: return "Wildlife sanctuary (IUCN IV)"
    return KIND_LABEL.get(kind, kind)


def water_precision(gtype, kind):
    if gtype == "P" and kind == "dam":
        return "OSM dam feature, centroid point"
    if gtype == "P":
        return "OSM site outline, centroid point"
    if gtype == "L":
        return "OSM river centreline, simplified (~250 m tolerance)"
    return "OSM water-body outline, simplified (~130 m tolerance)"


def prot_precision(gtype, kind):
    return "OSM boundary, simplified (~200 m tolerance)" if gtype == "A" else "OSM point (no boundary mapped)"


water = parse(HERE / "raw_water.txt", "water", water_precision) + parse(HERE / "raw_rivers.txt", "water", water_precision)
json.dump({"type": "FeatureCollection", "features": water}, open(OUT / "water.geojson", "w"), separators=(",", ":"))

if (HERE / "raw_protected.txt").exists():
    prot = parse(HERE / "raw_protected.txt", "protected", prot_precision)
    extra = json.load(open(HERE / "protected_extra.json")) if (HERE / "protected_extra.json").exists() else []
    json.dump({"type": "FeatureCollection", "features": prot + extra}, open(OUT / "protected.geojson", "w"), separators=(",", ":"))

if (HERE / "datacentres.json").exists():
    json.dump(json.load(open(HERE / "datacentres.json")), open(OUT / "datacentres.geojson", "w"), separators=(",", ":"))

# Offline basemap: Natural Earth 10m admin-1 (Johor + neighbours + Singapore + Riau Islands).
adm = json.load(open(HERE / "admin_sel.geojson"))
for f in adm["features"]:
    f["properties"]["source"] = "Natural Earth 10m admin-1 states/provinces (public domain)"
json.dump(adm, open(OUT / "basemap.geojson", "w"), separators=(",", ":"))
print("water", len(water))
