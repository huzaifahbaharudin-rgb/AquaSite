/**
 * Port of the NIMBY prototype's "world model" (NIMBY.html), kept faithful on purpose so the
 * community tool and the NIMBY demo give the same answers. Everything here is illustrative:
 * a fictional Johor-inspired catchment, 64 × 64 tiles of ~47 m. Nothing is a site assessment.
 *
 * Differences from the original: costs and sensor feeds are dropped, the site is always "placed",
 * and only the aggregates the community tool needs are returned.
 */
export const SIZE = 64;
export const METRES = 3000 / SIZE;
export const HA = (METRES * METRES) / 10000;

export type Cooling = "evaporative" | "hybrid" | "air";
export type WaterSource = "river" | "reservoir" | "recycled";
export type InterventionKey = "trees" | "wetland" | "roof" | "recycled" | "reuse" | "corridor";
export const INTERVENTION_KEYS: InterventionKey[] = ["trees", "wetland", "roof", "recycled", "reuse", "corridor"];

type Land = "water" | "wetland" | "road" | "homes" | "utility" | "forest" | "farm" | "grass";
interface Tile { i: number; j: number; x: number; z: number; land: Land; base: number; reservoir: boolean }
interface Point { x: number; z: number }

export interface Placement { on: boolean; x: number; z: number; angle: number }
export interface WorldState {
  x: number; z: number;
  capacity: number; pue: number; util: number;
  cooling: Cooling; waterSource: WaterSource;
  grid: number; wind: number; year: number;
  peoplePerHomeTile: number;
  interventions: Record<InterventionKey, Placement>;
}

export const clamp = (n: number, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.z - b.z);

const riverX = (z: number) => -3 + 4 * Math.sin(z * 0.115) + 0.14 * z;
const originalRoute = (x: number) => 2 + 4 * Math.sin((x + 8) * 0.08);
const habitatBase: Record<Land, number> = { forest: 94, grass: 67, farm: 58, wetland: 93, water: 82, homes: 24, road: 8, utility: 12 };

function landAt(x: number, z: number): Land {
  if (((x - 5) / 10) ** 2 + ((z - 24) / 7.5) ** 2 < 1) return "water";
  if (Math.abs(x - riverX(z)) < 1.6 && z < 25) return "water";
  if (x > -13 && x < -3 && z > 16 && z < 28) return "wetland";
  if ((Math.abs(z - 18) < 0.8 && x > -25) || (Math.abs(x - 27) < 0.85 && z > -20 && z < 19) || (z < -13 && z > -14.6 && x > 9)) return "road";
  if (x > 14 && x < 26 && z > 5 && z < 17) return "homes";
  if (x > 18 && x < 25 && z > -13 && z < -7) return "utility";
  if ((x < -12 && z < 9) || (z < -16 && x < 7)) return "forest";
  if (x < -12 && x > -29 && z > 12 && z < 28) return "farm";
  return "grass";
}

const tiles: Tile[] = [];
for (let j = 0; j < SIZE; j++) {
  for (let i = 0; i < SIZE; i++) {
    const x = i - 31.5, z = j - 31.5, land = landAt(x, z);
    tiles.push({ i, j, x, z, land, base: habitatBase[land], reservoir: land === "water" && z > 17 && ((x - 5) / 10) ** 2 + ((z - 24) / 7.5) ** 2 < 1 });
  }
}
const homes = tiles.filter((t) => t.land === "homes");
const riverWaters = tiles.filter((t) => t.land === "water" && !t.reservoir);
export const HOME_TILE_COUNT = homes.length;

function dimensions(s: Pick<WorldState, "capacity">) {
  const scale = Math.sqrt(s.capacity / 50);
  return { w: 5.6 * scale, d: 4.2 * scale };
}
const footprint = (s: WorldState, t: Tile) => {
  const d = dimensions(s);
  return Math.abs(t.x - s.x) < d.w / 2 + 0.45 && Math.abs(t.z - s.z) < d.d / 2 + 0.45;
};
function nearest<T extends Point>(list: T[], p: Point): T {
  let best = list[0], dist = Infinity;
  for (const t of list) { const d = distance(t, p); if (d < dist) { dist = d; best = t; } }
  return best;
}

function behindBuffer(s: WorldState, t: Tile) {
  const b = s.interventions.trees;
  if (!b.on) return false;
  const nx = Math.cos(b.angle), nz = Math.sin(b.angle), tx = t.x - s.x, tz = t.z - s.z, projection = tx * nx + tz * nz;
  if (Math.abs(projection) < 0.001) return false;
  const along = ((b.x - s.x) * nx + (b.z - s.z) * nz) / projection;
  if (along <= 0 || along >= 1) return false;
  const cx = s.x + along * tx - b.x, cz = s.z + along * tz - b.z;
  return Math.abs(-cx * nz + cz * nx) < 6;
}
function routeOffset(s: WorldState, x: number, heat: number, benefit: number) {
  const radius = 5 + Math.sqrt(heat) * 0.6, dx = x - s.x, dz = originalRoute(s.x) - s.z;
  const near = Math.exp(-(dz * dz) / (2 * radius * radius));
  return -radius * 0.85 * Math.exp(-(dx * dx) / (2 * radius * radius)) * near * (1 - benefit);
}

/** Suggested placements for each intervention (the NIMBY "Use suggested placements" option). */
export function placeDefaults(s: WorldState, key: InterventionKey) {
  const p = s.interventions[key], out = nearest(riverWaters, s), home = nearest(homes, s);
  if (key === "trees") { p.x = s.x + Math.cos(s.wind) * 4; p.z = s.z + Math.sin(s.wind) * 4; p.angle = s.wind; }
  else if (key === "wetland") { p.x = out.x - 2.4; p.z = out.z + 2; p.angle = 0; }
  else if (key === "corridor") { p.x = s.x; p.z = originalRoute(s.x) - 4; p.angle = 0; }
  else if (key === "reuse") { p.x = home.x; p.z = home.z; p.angle = 0; }
  else { p.x = s.x; p.z = s.z; }
}

export interface WorldResult {
  itEnergy: number; energy: number; demand: number;
  heat: number; water: number; withdrawal: number; recycle: number;
  quality: number; riverLevel: number; reservoirLevel: number;
  avgTemp: number; peakTemp: number;
  noise: number; homeDist: number;
  cleared: number; forestCleared: number; loss: number;
  species: number; routeDisrupted: number; routeBenefit: number;
  reuseRate: number; wetEffect: number;
  totalResidents: number; residentsExposedHeat: number; residentsExposedNoise: number;
  gridShare: number;
}

export function compute(input: WorldState): WorldResult {
  const s = input;
  const on = (k: InterventionKey) => s.interventions[k].on;
  const age = clamp(s.year / 10);
  const itEnergy = (s.capacity * 8760 * s.util) / 100, energy = itEnergy * s.pue, demand = energy / 8760, rawHeat = s.capacity * s.pue;
  const home = nearest(homes, s), homeDist = distance(home, s) * METRES, out = nearest(riverWaters, s), reusePoint = s.interventions.reuse;
  const reuseConnected = on("reuse") && distance(nearest(homes, reusePoint), reusePoint) < 2.5;
  const reuseDistance = distance(s, reusePoint) * METRES;
  const reuseRate = reuseConnected ? clamp(0.2 - reuseDistance / 10000, 0.1, 0.2) * clamp((1500 - reuseDistance) / 500) : 0;
  const heat = rawHeat * (on("roof") ? 0.95 : 1) * (1 - reuseRate);
  const factor = { evaporative: 2.2, hybrid: 1, air: 0.2 }[s.cooling];
  const water = itEnergy * factor;
  const recycle = s.waterSource === "recycled" || on("recycled") ? 0.7 : 0;
  const withdrawal = water * (1 - recycle), dischargeVolume = withdrawal * 0.3;
  const dischargeWarmth = heat / (40 + dischargeVolume / 365 / 300);
  const untreated = clamp(96 - (dischargeVolume / 1e6) * 95 - dischargeWarmth * 12, 5, 100);
  const wetEffect = on("wetland") ? clamp(1 - Math.max(0, distance(s.interventions.wetland, out) - 3) / 10) : 0;
  const quality = clamp(untreated + 30 * wetEffect, 0, 100);
  const riverDrop = clamp((withdrawal / 5000000) * (s.waterSource === "river" ? 1 : 0.6), 0, 0.78);
  const reservoirDrop = clamp((withdrawal / 5000000) * (s.waterSource === "river" ? 0.75 : 1.25), 0, 0.78);
  const treeNear = on("trees") ? clamp(1 - distance(s.interventions.trees, s) / 20) : 0;
  const corridorNear = on("corridor") ? clamp(1 - distance(s.interventions.corridor, { x: s.x, z: originalRoute(s.x) }) / 18) : 0;
  const routeBenefit = clamp(treeNear * 0.15 + wetEffect * 0.1 + corridorNear * (0.5 + 0.18 * age), 0, 0.9);

  let heatSum = 0, peak = 0, homeCount = 0, loss = 0, cleared = 0, forestCleared = 0, heatExposed = 0, noiseExposed = 0;
  const wx = Math.cos(s.wind), wz = Math.sin(s.wind);
  let nearestHomeNoise = 0;
  for (const t of tiles) {
    const dx = t.x - s.x, dz = t.z - s.z;
    const d = Math.max(10, Math.hypot(dx, dz) * METRES);
    const dot = (dx * wx + dz * wz) / Math.max(0.001, Math.hypot(dx, dz));
    const cone = dot > 0.55 ? 2 : dot < -0.55 ? 0.5 : 1;
    let temp = 2 * (heat / 100) * Math.exp(-(Math.hypot(dx, dz) * METRES) / 800) * cone;
    let noise = Math.max(0, 85 - 20 * Math.log10(d / 10));
    if (behindBuffer(s, t)) { noise = Math.max(0, noise - (5 + 5 * age)); if (dot > 0.55) temp *= 0.85; }
    const downstream = t.land === "water" && t.z >= out.z - 1;
    let habitat = t.base - Math.max(0, temp - 1) * 14 - Math.max(0, noise - 55) * 0.9;
    if (t.land === "water" || t.land === "wetland") habitat -= Math.max(0, 75 - (downstream || t.z >= out.z ? quality : 96)) * 0.65;
    if (on("trees")) {
      const b = s.interventions.trees, bx = t.x - b.x, bz = t.z - b.z;
      const along = Math.abs(-bx * Math.sin(b.angle) + bz * Math.cos(b.angle)), across = Math.abs(bx * Math.cos(b.angle) + bz * Math.sin(b.angle));
      if (along < 6 && across < 1.9) habitat += 15 + 15 * age;
    }
    if (on("wetland") && distance(t, s.interventions.wetland) < 3.2) habitat += 18 + 9 * age;
    if (on("corridor") && Math.abs(t.x - s.interventions.corridor.x) < 10 && Math.abs(t.z - s.interventions.corridor.z) < 2) habitat += 15 + 16 * age;
    if (footprint(s, t)) { habitat = on("roof") ? 18 : 0; cleared += HA; if (t.land === "forest") forestCleared += HA; }
    habitat = clamp(habitat, 0, 100);
    loss += (Math.max(0, t.base - habitat) / 100) * HA;
    if (t.land === "homes") {
      heatSum += temp; homeCount++; peak = Math.max(peak, temp);
      if (temp > 1) heatExposed++;
      if (noise > 55) noiseExposed++;
      if (t === home) nearestHomeNoise = noise;
    }
  }
  let routeDisrupted = 0;
  for (let x = -30; x <= 30; x += 1) routeDisrupted += clamp(Math.abs(routeOffset(s, x, heat, routeBenefit)) / 5);
  routeDisrupted = (routeDisrupted / 61) * 100;
  const species = Math.round(clamp(32 - loss * 0.055 - Math.max(0, 80 - quality) * 0.095 - routeDisrupted * 0.11 + age * (treeNear + wetEffect + corridorNear) * 0.5, 5, 32));
  return {
    itEnergy, energy, demand, heat, water, withdrawal, recycle, quality,
    riverLevel: 1 - riverDrop, reservoirLevel: 1 - reservoirDrop,
    avgTemp: heatSum / Math.max(1, homeCount), peakTemp: peak,
    noise: nearestHomeNoise, homeDist, cleared, forestCleared, loss, species, routeDisrupted, routeBenefit, reuseRate, wetEffect,
    totalResidents: homeCount * s.peoplePerHomeTile,
    residentsExposedHeat: heatExposed * s.peoplePerHomeTile,
    residentsExposedNoise: noiseExposed * s.peoplePerHomeTile,
    gridShare: demand / s.grid,
  };
}
