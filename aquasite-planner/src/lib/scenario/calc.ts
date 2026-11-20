/**
 * The ONLY implementation of AquaSite's water/energy arithmetic.
 * Imported by the client preview and by POST /api/scenario, so the two always agree.
 *
 *   annual IT electricity (MWh)       = IT MW × utilisation × 8,760 h
 *   annual facility electricity (MWh) = IT MWh × PUE
 *   annual on-site water (m³)         = IT MWh × WUE (L/kWh)        [1 L/kWh = 1 m³/MWh]
 *   annual reclaimed-supplied (m³)    = on-site water × reclaimed share
 *   annual grid-related water (m³)    = facility MWh × grid intensity (m³/MWh)
 */
import type { AdvancedInputs, CoreInputs, Metrics } from "./schema";

export const HOURS_PER_YEAR = 8760;

export interface CoreNumbers {
  itMwh: number;
  facilityMwh: number;
  onsiteM3: number;
  reclaimedM3: number;
  nonReclaimedM3: number;
  gridM3: number;
}

export function coreNumbers(core: Pick<CoreInputs, "itCapacityMw" | "pue" | "wueLPerKwh" | "reclaimedSharePct" | "gridWaterIntensityM3PerMwh">, utilisationPct: number, overrides?: { wue?: number; reclaimedPct?: number }): CoreNumbers {
  const wue = overrides?.wue ?? core.wueLPerKwh;
  const reclaimed = (overrides?.reclaimedPct ?? core.reclaimedSharePct) / 100;
  const itMwh = core.itCapacityMw * (utilisationPct / 100) * HOURS_PER_YEAR;
  const facilityMwh = itMwh * core.pue;
  const onsiteM3 = itMwh * wue;
  const reclaimedM3 = onsiteM3 * reclaimed;
  return {
    itMwh,
    facilityMwh,
    onsiteM3,
    reclaimedM3,
    nonReclaimedM3: onsiteM3 - reclaimedM3,
    gridM3: facilityMwh * core.gridWaterIntensityM3PerMwh,
  };
}

/** Linear path from the current value (start year) to the target value (target year), then held. */
export function linearPath(current: number, target: number | undefined, startYear: number, targetYear: number | undefined, y: number): number {
  if (target === undefined || targetYear === undefined) return current;
  if (y >= targetYear) return target;
  if (targetYear === startYear) return target;
  const t = (y - startYear) / (targetYear - startYear);
  return current + (target - current) * Math.max(0, t);
}

export function computeMetrics(core: CoreInputs, utilisationPct: number, startYear: number, advanced: AdvancedInputs): Metrics {
  const n = coreNumbers(core, utilisationPct);
  const days = 365;
  const avgDaily = n.onsiteM3 / days;

  const trajectory = Array.from({ length: core.lifespanYears }, (_, i) => {
    const y = startYear + i;
    const wue = linearPath(core.wueLPerKwh, advanced.futureWue?.targetWueLPerKwh, startYear, advanced.futureWue?.targetYear, y);
    const rec = linearPath(core.reclaimedSharePct, advanced.futureReclaimed?.targetSharePct, startYear, advanced.futureReclaimed?.targetYear, y);
    const yn = coreNumbers(core, utilisationPct, { wue, reclaimedPct: rec });
    return { year: y, wueLPerKwh: round(wue, 3), reclaimedSharePct: round(rec, 2), onsiteWaterM3: yn.onsiteM3, reclaimedSuppliedM3: yn.reclaimedM3, gridWaterM3: yn.gridM3 };
  });
  const lifetime = trajectory.reduce((s, r) => s + r.onsiteWaterM3, 0);

  const mix = advanced.sourceMix;
  const sourceAllocation = mix
    ? {
        potable: m(n.onsiteM3 * (mix.potablePct / 100), "m3/yr", "on-site-potable"),
        reclaimed: m(n.onsiteM3 * (mix.reclaimedPct / 100), "m3/yr", "on-site-reclaimed"),
        rainwater: m(n.onsiteM3 * (mix.rainwaterPct / 100), "m3/yr", "on-site-rainwater"),
        seawater: m(n.onsiteM3 * (mix.seawaterPct / 100), "m3/yr", "on-site-seawater"),
      }
    : null;

  const dg = advanced.demandGrowth;
  let domestic: number | null = null;
  let domesticBasis: string | null = null;
  if (dg?.baselinePopulation != null && dg.domesticLitresPerPersonPerDay != null) {
    domestic = (dg.baselinePopulation * dg.domesticLitresPerPersonPerDay) / 1000;
    domesticBasis = `${dg.baselinePopulation.toLocaleString("en-US")} people × ${dg.domesticLitresPerPersonPerDay} L/person/day`;
  } else if (dg?.baselineDomesticDemandM3PerDay != null) {
    domestic = dg.baselineDomesticDemandM3PerDay;
    domesticBasis = "Entered directly (m³/day)";
  }
  const ds = advanced.droughtShock;
  const localContext =
    dg || ds || advanced.utilityExpansion
      ? {
          baselineDomesticDemandM3PerDay: domestic,
          domesticDemandBasis: domesticBasis,
          baselineIndustrialDemandM3PerDay: dg?.baselineIndustrialDemandM3PerDay ?? null,
          droughtSupplyReductionM3PerDay: ds && ds.supplyBaselineM3PerDay != null ? (ds.supplyBaselineM3PerDay * ds.supplyReductionPct) / 100 : null,
          utilityExpansionM3PerDay: advanced.utilityExpansion?.additionalCapacityM3PerDay ?? null,
        }
      : null;

  return {
    annualItElectricity: m(n.itMwh, "MWh/yr", "facility-it"),
    annualFacilityElectricity: m(n.facilityMwh, "MWh/yr", "facility-total"),
    annualOnsiteWater: m(n.onsiteM3, "m3/yr", "on-site"),
    annualReclaimedSupplied: m(n.reclaimedM3, "m3/yr", "on-site-reclaimed"),
    annualNonReclaimedOnsite: m(n.nonReclaimedM3, "m3/yr", "on-site-non-reclaimed"),
    annualGridWater: m(n.gridM3, "m3/yr", "off-site-power-generation"),
    averageDailyOnsiteWater: m(avgDaily, "m3/day", "on-site"),
    peakDayOnsiteWater: advanced.peakToAverageFactor != null ? m(avgDaily * advanced.peakToAverageFactor, "m3/day", "on-site") : null,
    lifetimeOnsiteWater: m(lifetime, "m3", "on-site"),
    sourceAllocation,
    trajectory,
    localContext,
  } as Metrics;
}

function m<U extends string, S extends string>(value: number, unit: U, scope: S) {
  return { value: round(value, 2), unit, scope };
}

export function round(v: number, dp = 2) {
  const f = 10 ** dp;
  return Math.round(v * f) / f;
}
