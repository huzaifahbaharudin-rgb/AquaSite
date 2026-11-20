/** Straight-line distance from a point to GeoJSON geometries (km). Local equirectangular projection; fine at Johor scale. */
type Pos = number[]; // [lon, lat]

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const r = Math.PI / 180;
  const a = Math.sin(((lat2 - lat1) * r) / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(((lon2 - lon1) * r) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(a));
}

function project(lat0: number) {
  const kx = 111.32 * Math.cos((lat0 * Math.PI) / 180);
  const ky = 110.574;
  return (p: Pos, lon0: number) => [(p[0] - lon0) * kx, (p[1] - lat0) * ky];
}

function segDist(px: number, py: number, a: number[], b: number[]) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const l = dx * dx + dy * dy;
  let t = l ? ((px - a[0]) * dx + (py - a[1]) * dy) / l : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - a[0] - t * dx, py - a[1] - t * dy);
}

function inRing(x: number, y: number, ring: number[][]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export interface Geom {
  type: string;
  coordinates: unknown;
}

/** Returns { km, nearest: [lat, lon] } — km = 0 when the point lies inside a polygon. */
export function distanceToGeometry(lat: number, lon: number, g: Geom): { km: number; nearest: [number, number] } {
  const P = project(lat);
  const toXY = (p: Pos) => P(p, lon);
  let best = Infinity;
  let bestPt: Pos = [lon, lat];
  const consider = (line: Pos[], closed: boolean) => {
    const xy = line.map(toXY);
    if (xy.length === 1) {
      const d = Math.hypot(xy[0][0], xy[0][1]);
      if (d < best) { best = d; bestPt = line[0]; }
      return;
    }
    for (let i = 1; i < xy.length + (closed ? 0 : 0); i++) {
      const d = segDist(0, 0, xy[i - 1], xy[i]);
      if (d < best) { best = d; bestPt = line[i]; }
    }
  };
  const polys: Pos[][][] = [];
  switch (g.type) {
    case "Point":
      consider([g.coordinates as Pos], false);
      break;
    case "LineString":
      consider(g.coordinates as Pos[], false);
      break;
    case "MultiLineString":
      (g.coordinates as Pos[][]).forEach((l) => consider(l, false));
      break;
    case "Polygon":
      polys.push(g.coordinates as Pos[][]);
      break;
    case "MultiPolygon":
      polys.push(...(g.coordinates as Pos[][][]));
      break;
  }
  for (const poly of polys) {
    const outer = poly[0].map(toXY);
    if (inRing(0, 0, outer)) return { km: 0, nearest: [lat, lon] };
    poly.forEach((r) => consider(r, true));
  }
  return { km: best, nearest: [bestPt[1], bestPt[0]] };
}
