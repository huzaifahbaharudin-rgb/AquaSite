import { compute, placeDefaults, INTERVENTION_KEYS, clamp, type Cooling, type InterventionKey, type WaterSource, type WorldResult, type WorldState } from "./world";

export type { Cooling, InterventionKey, WaterSource } from "./world";
export { INTERVENTION_KEYS } from "./world";

export type Size = "small" | "medium" | "large";
export type Distance = "close" | "near" | "far";

export interface CommunityInputs {
  size: Size;
  cooling: Cooling;
  waterSource: WaterSource;
  distance: Distance;
  nature: Record<InterventionKey, boolean>;
  /** 0 = today, 10 = ten years on (trees and habitat mature). */
  year: number;
}

/** Everyday-comparison constants. Shown to the reader in "How we worked this out". */
export const ASSUMPTIONS = {
  litresPerPersonPerDay: 225, // SPAN, average Malaysian domestic use
  peoplePerHousehold: 4, // illustrative
  householdElectricityMWh: 4.2, // from the NIMBY prototype
  olympicPoolM3: 2500,
  footballPitchHa: 0.714, // 105 m × 68 m
  noiseThresholdDb: 55, // NIMBY's "disturbing" level at homes
} as const;

export const HOUSEHOLD_WATER_M3 = (ASSUMPTIONS.litresPerPersonPerDay * ASSUMPTIONS.peoplePerHousehold * 365) / 1000;

export const SIZE_MW: Record<Size, number> = { small: 20, medium: 50, large: 120 };
export const SITE_X: Record<Distance, number> = { close: 12, near: 9.5, far: -8 };
const SITE_Z = 3.5;
const BASE_PUE = 1.4;
const PUE_OFFSET: Record<Cooling, number> = { evaporative: 0, hybrid: 0.06, air: 0.14 };

export const DEFAULT_INPUTS: CommunityInputs = {
  size: "medium",
  cooling: "evaporative",
  waterSource: "river",
  distance: "near",
  nature: { trees: false, wetland: false, roof: false, recycled: false, reuse: false, corridor: false },
  year: 0,
};

export function toWorldState(i: CommunityInputs, withNature = true): WorldState {
  const s: WorldState = {
    x: SITE_X[i.distance], z: SITE_Z, capacity: SIZE_MW[i.size], pue: BASE_PUE + PUE_OFFSET[i.cooling], util: 80,
    cooling: i.cooling, waterSource: i.waterSource, grid: 500, wind: 0.32, year: i.year, peoplePerHomeTile: 12,
    interventions: Object.fromEntries(INTERVENTION_KEYS.map((k) => [k, { on: withNature && i.nature[k], x: 0, z: 0, angle: 0 }])) as WorldState["interventions"],
  };
  for (const k of INTERVENTION_KEYS) placeDefaults(s, k);
  return s;
}

export type Tone = "good" | "watch" | "high";

export interface Assessment {
  world: WorldResult;
  /** Same site with none of the nature measures, for "what asking for nature changes". */
  bare: WorldResult;
  households: number; // homes in the neighbourhood
  water: { homes: number; pools: number; neighbourhoods: number; tone: Tone };
  power: { homes: number; gridShare: number; tone: Tone };
  heat: { level: 0 | 1 | 2 | 3; homes: number; tone: Tone };
  noise: { db: number; level: 0 | 1 | 2 | 3 | 4; homes: number; tone: Tone };
  wildlife: { share: number; pitches: number; tone: Tone };
  river: { drop: number; qualityLevel: 0 | 1 | 2 | 3; tone: Tone };
}

function summarise(w: WorldResult): Omit<Assessment, "world" | "bare"> {
  const households = Math.round(w.totalResidents / ASSUMPTIONS.peoplePerHousehold);
  const waterHomes = w.withdrawal / HOUSEHOLD_WATER_M3;
  const neighbourhoods = waterHomes / households;
  const peak = w.peakTemp;
  const heatLevel = peak < 0.5 ? 0 : peak < 1 ? 1 : peak < 2 ? 2 : 3;
  const noiseLevel = w.noise < 45 ? 0 : w.noise < 52 ? 1 : w.noise < 58 ? 2 : w.noise < 65 ? 3 : 4;
  const share = w.species / 32;
  const drop = 1 - w.riverLevel;
  const q = w.quality >= 85 ? 0 : w.quality >= 70 ? 1 : w.quality >= 50 ? 2 : 3;
  return {
    households,
    water: { homes: waterHomes, pools: w.withdrawal / ASSUMPTIONS.olympicPoolM3, neighbourhoods, tone: neighbourhoods < 1 ? "good" : neighbourhoods < 5 ? "watch" : "high" },
    power: { homes: w.energy / ASSUMPTIONS.householdElectricityMWh, gridShare: w.gridShare, tone: w.gridShare < 0.1 ? "good" : w.gridShare < 0.25 ? "watch" : "high" },
    heat: { level: heatLevel as 0 | 1 | 2 | 3, homes: Math.round(w.residentsExposedHeat / ASSUMPTIONS.peoplePerHousehold), tone: heatLevel === 0 ? "good" : heatLevel < 3 ? "watch" : "high" },
    noise: { db: w.noise, level: noiseLevel as 0 | 1 | 2 | 3 | 4, homes: Math.round(w.residentsExposedNoise / ASSUMPTIONS.peoplePerHousehold), tone: w.noise < 50 ? "good" : w.noise < ASSUMPTIONS.noiseThresholdDb + 5 ? "watch" : "high" },
    wildlife: { share, pitches: w.cleared / ASSUMPTIONS.footballPitchHa, tone: share >= 0.85 ? "good" : share >= 0.65 ? "watch" : "high" },
    river: { drop, qualityLevel: q as 0 | 1 | 2 | 3, tone: q === 0 && drop < 0.1 ? "good" : q <= 1 && drop < 0.3 ? "watch" : "high" },
  };
}

export function assess(i: CommunityInputs): Assessment {
  const world = compute(toWorldState(i, true));
  const bare = compute(toWorldState(i, false));
  return { world, bare, ...summarise(world) };
}

/* ------------------------------ plain-language helpers ------------------------------ */

const nf = new Intl.NumberFormat("en-US");

/** "about 2,300" — two significant figures, never false precision. */
export function about(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "no";
  if (n < 10) return n < 1.5 ? "about one" : `about ${Math.round(n)}`;
  const digits = Math.floor(Math.log10(n)) + 1;
  const step = 10 ** Math.max(0, digits - 2);
  return `about ${nf.format(Math.round(n / step) * step)}`;
}

/** Fraction in words: 0.2 → "about a fifth". */
export function fractionWords(f: number): string {
  if (f < 0.04) return "almost none";
  const table: [number, string][] = [[0.1, "a tenth"], [0.17, "a sixth"], [0.22, "a fifth"], [0.29, "a quarter"], [0.4, "a third"], [0.55, "half"], [0.7, "two thirds"], [0.85, "three quarters"], [1.01, "nearly all"]];
  let best = table[0], gap = Infinity;
  for (const row of table) { const g = Math.abs(row[0] - f); if (g < gap) { gap = g; best = row; } }
  return `about ${best[1]}`;
}

/** "1 in 9" style share of the local grid. */
export function oneIn(share: number): string {
  if (share >= 0.5) return "more than half";
  if (share <= 0) return "almost none";
  return `about 1 in ${Math.max(2, Math.round(1 / share))}`;
}

export const SOUNDS = [
  { name: "a quiet library", icon: "📚" },
  { name: "light rain", icon: "🌦️" },
  { name: "a chat over the fence", icon: "💬" },
  { name: "a busy café", icon: "☕" },
  { name: "a busy road", icon: "🚗" },
] as const;

export const HEAT_WORDS = [
  "You would barely notice a difference.",
  "Evenings feel slightly warmer on the nearest streets.",
  "Nights stay noticeably warmer, so fans and air-con run longer.",
  "The nearest streets become a hot-spot, especially on still nights.",
] as const;

export const RIVER_WORDS = ["Clear and healthy", "A little cloudy downstream", "Stressed: fish struggle below the outflow", "Struggling: warm, polluted outflow"] as const;

export const SIZE_WORDS: Record<Size, string> = { small: "small", medium: "medium-sized", large: "very large" };
export const COOLING_WORDS: Record<Cooling, string> = { evaporative: "water-cooled", hybrid: "mixed-cooling", air: "air-cooled" };
export const DISTANCE_WORDS: Record<Distance, string> = { close: "right next to homes", near: "a short walk from homes", far: "across the valley from homes" };

export function reductionWords(before: number, after: number): string | null {
  if (before <= 0 || after >= before * 0.97) return null;
  const cut = 1 - after / before;
  return cut > 0.6 ? "far less" : cut > 0.4 ? "about half as much" : cut > 0.2 ? "noticeably less" : "a little less";
}

export function headline(i: CommunityInputs, a: Assessment): string {
  const sound = SOUNDS[Math.min(a.noise.level, 4)].name;
  return `A ${SIZE_WORDS[i.size]}, ${COOLING_WORDS[i.cooling]} data centre ${DISTANCE_WORDS[i.distance]} would drink as much water as ${about(a.water.homes)} households, and the nearest homes would hear something like ${sound}.`;
}

/** Questions a community can take to a developer or planning meeting, tailored to the current picture. */
export function questionsFor(i: CommunityInputs, a: Assessment): string[] {
  const q: string[] = [];
  if (i.cooling === "evaporative") q.push("Could you use air or mixed cooling, so far less drinking-quality water evaporates?");
  if (a.water.tone !== "good" && i.waterSource !== "recycled" && !i.nature.recycled) q.push("Will you use recycled water, and who guarantees our households are served first in a dry spell?");
  if (a.power.tone !== "good") q.push("How much of our local power will this take, and who pays for the grid upgrades?");
  if (a.heat.level >= 2 && !i.nature.reuse) q.push("Can the waste heat be piped to nearby buildings instead of warming our streets?");
  if (a.noise.level >= 2 && !i.nature.trees) q.push("What will you do to keep the hum down: tree belts, barriers, quieter fans?");
  if (a.wildlife.tone !== "good") q.push("Which wildlife and forest will be affected, and how will the habitat be restored or reconnected?");
  if (a.river.tone !== "good") q.push("Will the water you return to the river be cooled and cleaned, and who will monitor it?");
  q.push("Will independent monitoring of water, noise and heat be published for neighbours to read?");
  return q.slice(0, 6);
}

export { clamp };
