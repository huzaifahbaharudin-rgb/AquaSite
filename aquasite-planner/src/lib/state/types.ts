import type { CoolingTechnology, Site } from "@/lib/scenario/schema";
import type { FieldStatus } from "@/lib/scenario/build";

/** Form state keeps raw text so blank / partially typed numbers never crash the preview. */
export type CoreNumericKey = "itCapacityMw" | "pue" | "wueLPerKwh" | "reclaimedSharePct" | "lifespanYears" | "gridWaterIntensityM3PerMwh";

export interface AdvancedText {
  futureWue: { target: string; year: string };
  futureReclaimed: { target: string; year: string };
  demand: { population: string; growthPct: string; lpcd: string; domesticM3: string; industrialM3: string; industrialGrowthPct: string };
  utility: { capacityM3: string; year: string; area: string; utility: string };
  drought: { pct: string; baselineName: string; baselineM3: string };
  peakFactor: string;
  mixEnabled: boolean;
  mix: { potable: string; reclaimed: string; rainwater: string; seawater: string };
}

export interface AppState {
  site: Site;
  siteSelected: boolean;
  layers: { water: boolean; protected: boolean; datacentre: boolean };
  offlineMap: boolean;
  cooling: CoolingTechnology;
  core: Record<CoreNumericKey, string>;
  utilisationPct: string;
  advanced: AdvancedText;
  advancedOpen: boolean;
  fieldStatus: Record<string, FieldStatus>;
  lastHandoffAt: string | null;
}
