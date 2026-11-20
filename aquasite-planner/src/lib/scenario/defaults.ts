/**
 * Illustrative demo defaults. None of these figures is a verified Johor utility or operator value.
 */
import type { AdvancedInputs, CoolingTechnology, CoreInputs, Site } from "./schema";

export interface CoolingPreset {
  id: CoolingTechnology;
  label: string;
  short: string;
  pue: number | null;
  wueLPerKwh: number | null;
  note: string;
}

/**
 * Illustrative presets: midpoints of commonly cited industry ranges
 * (evaporative WUE ≈1.5–2.5 L/kWh with PUE ≈1.1–1.3; air-cooled WUE ≈0 with PUE ≈1.4–1.8;
 * closed-loop liquid WUE near 0 with PUE ≈1.05–1.2). Tropical climates tend to sit at the
 * high-water end. Replace with vendor or operator data for a real study.
 */
export const COOLING_PRESETS: CoolingPreset[] = [
  { id: "evaporative", label: "Evaporative cooling towers", short: "Evaporative", pue: 1.25, wueLPerKwh: 1.8, note: "Lowest energy, highest water use." },
  { id: "hybrid-adiabatic", label: "Hybrid (adiabatic assist)", short: "Hybrid", pue: 1.3, wueLPerKwh: 0.9, note: "Dry coolers with water spray on hot days." },
  { id: "air-cooled-chillers", label: "Air-cooled chillers", short: "Air-cooled", pue: 1.55, wueLPerKwh: 0.1, note: "Little on-site water, more electricity (and grid water)." },
  { id: "direct-liquid", label: "Direct-to-chip liquid (closed loop)", short: "Liquid", pue: 1.15, wueLPerKwh: 0.2, note: "Closed loop with dry coolers; suits high-density AI racks." },
  { id: "custom", label: "Custom / other", short: "Custom", pue: null, wueLPerKwh: null, note: "No preset. Enter PUE and WUE directly." },
];

export const presetFor = (id: CoolingTechnology) => COOLING_PRESETS.find((p) => p.id === id)!;

/** Illustrative candidate near Nusajaya Tech Park, Iskandar Puteri (not a real proposal). */
export const DEFAULT_SITE: Site = {
  name: "Illustrative candidate · Iskandar Puteri",
  lat: 1.4205,
  lon: 103.6005,
  placement: "illustrative-candidate",
  region: "Johor, Malaysia",
  nearby: [],
  note: "Mapped proximity is geographic context only. It does not imply a water-supply connection, permit constraint or official restriction.",
};

export const DEFAULT_CORE: CoreInputs = {
  itCapacityMw: 40,
  coolingTechnology: "evaporative",
  pue: 1.25,
  wueLPerKwh: 1.8,
  reclaimedSharePct: 0,
  lifespanYears: 15,
  gridWaterIntensityM3PerMwh: 0.84,
};

export const DEFAULT_UTILISATION_PCT = 75;
export const DEFAULT_START_YEAR = 2027;

export const EMPTY_ADVANCED: AdvancedInputs = {
  futureWue: null,
  futureReclaimed: null,
  demandGrowth: null,
  utilityExpansion: null,
  droughtShock: null,
  peakToAverageFactor: null,
  sourceMix: null,
};

export const SCENARIO_LABEL = "Illustrative Johor scenario (demo data, not a utility or operator study)";

export const ASSUMPTION_NOTES = [
  "Site is an illustrative candidate pin, not a real proposal.",
  "Cooling presets are illustrative midpoints of published industry ranges.",
  "Grid water intensity 0.84 m³/MWh is an illustrative factor per MWh of facility electricity, not a Malaysian grid statistic.",
  "Average IT utilisation 75% is a modelling assumption.",
  "Annual figures assume constant design unless a future WUE or reclaimed-share target is set under Advanced.",
];
