/** Convert form text state → schema-shaped request (the Zod schema then validates it). */
import { DEFAULT_CORE, DEFAULT_START_YEAR, DEFAULT_UTILISATION_PCT, EMPTY_ADVANCED, DEFAULT_SITE } from "@/lib/scenario/defaults";
import type { AdvancedInputs, ScenarioRequestInput } from "@/lib/scenario/schema";
import type { AdvancedText, AppState, CoreNumericKey } from "./types";

/** "" → undefined (so Zod reports "required"), otherwise Number (NaN reported as invalid). */
export const num = (s: string): number | undefined => (s.trim() === "" ? undefined : Number(s.replace(/,/g, "")));
const numOrNull = (s: string): number | null => (s.trim() === "" ? null : Number(s.replace(/,/g, "")));
const strOrNull = (s: string) => (s.trim() === "" ? null : s.trim());
const blank = (o: Record<string, string>) => Object.values(o).every((v) => v.trim() === "");

export function advancedFromText(a: AdvancedText): AdvancedInputs {
  return {
    futureWue: blank(a.futureWue) ? null : ({ targetWueLPerKwh: num(a.futureWue.target), targetYear: num(a.futureWue.year) } as never),
    futureReclaimed: blank(a.futureReclaimed) ? null : ({ targetSharePct: num(a.futureReclaimed.target), targetYear: num(a.futureReclaimed.year) } as never),
    demandGrowth: blank(a.demand)
      ? null
      : {
          baselinePopulation: numOrNull(a.demand.population),
          populationGrowthPctPerYear: numOrNull(a.demand.growthPct),
          domesticLitresPerPersonPerDay: numOrNull(a.demand.lpcd),
          baselineDomesticDemandM3PerDay: numOrNull(a.demand.domesticM3),
          baselineIndustrialDemandM3PerDay: numOrNull(a.demand.industrialM3),
          industrialGrowthPctPerYear: numOrNull(a.demand.industrialGrowthPct),
        },
    utilityExpansion: blank(a.utility)
      ? null
      : ({ additionalCapacityM3PerDay: num(a.utility.capacityM3), inServiceYear: num(a.utility.year), supplyArea: strOrNull(a.utility.area), utility: strOrNull(a.utility.utility) } as never),
    droughtShock: blank(a.drought)
      ? null
      : ({ supplyReductionPct: num(a.drought.pct), supplyBaselineName: a.drought.baselineName.trim(), supplyBaselineM3PerDay: numOrNull(a.drought.baselineM3) } as never),
    peakToAverageFactor: numOrNull(a.peakFactor),
    sourceMix: a.mixEnabled
      ? ({ potablePct: num(a.mix.potable) ?? 0, reclaimedPct: num(a.mix.reclaimed) ?? 0, rainwaterPct: num(a.mix.rainwater) ?? 0, seawaterPct: num(a.mix.seawater) ?? 0 } as never)
      : null,
  };
}

export function requestFromState(s: AppState): ScenarioRequestInput {
  const core = Object.fromEntries(Object.entries(s.core).map(([k, v]) => [k, num(v)])) as Record<CoreNumericKey, number>;
  return {
    site: s.site,
    core: { ...core, coolingTechnology: s.cooling },
    utilisationPct: num(s.utilisationPct) as number,
    startYear: DEFAULT_START_YEAR,
    advanced: advancedFromText(s.advanced),
  };
}

export const EMPTY_ADVANCED_TEXT: AdvancedText = {
  futureWue: { target: "", year: "" },
  futureReclaimed: { target: "", year: "" },
  demand: { population: "", growthPct: "", lpcd: "", domesticM3: "", industrialM3: "", industrialGrowthPct: "" },
  utility: { capacityM3: "", year: "", area: "", utility: "" },
  drought: { pct: "", baselineName: "", baselineM3: "" },
  peakFactor: "",
  mixEnabled: false,
  mix: { potable: "", reclaimed: "", rainwater: "", seawater: "" },
};

export function initialState(): AppState {
  const c = DEFAULT_CORE;
  return {
    site: DEFAULT_SITE,
    siteSelected: false,
    layers: { water: true, protected: true, datacentre: true },
    offlineMap: false,
    cooling: c.coolingTechnology,
    core: {
      itCapacityMw: String(c.itCapacityMw),
      pue: String(c.pue),
      wueLPerKwh: String(c.wueLPerKwh),
      reclaimedSharePct: String(c.reclaimedSharePct),
      lifespanYears: String(c.lifespanYears),
      gridWaterIntensityM3PerMwh: String(c.gridWaterIntensityM3PerMwh),
    },
    utilisationPct: String(DEFAULT_UTILISATION_PCT),
    advanced: EMPTY_ADVANCED_TEXT,
    advancedOpen: false,
    fieldStatus: Object.fromEntries(["site", "core.itCapacityMw", "core.coolingTechnology", "core.pue", "core.wueLPerKwh", "core.reclaimedSharePct", "core.lifespanYears", "core.gridWaterIntensityM3PerMwh", "utilisationPct"].map((k) => [k, "illustrative-default" as const])),
    lastHandoffAt: null,
  };
}

export { EMPTY_ADVANCED };
