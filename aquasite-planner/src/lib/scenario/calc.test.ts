import { describe, expect, it } from "vitest";
import { buildHandoff } from "./build";
import { coreNumbers } from "./calc";
import { DEFAULT_CORE, DEFAULT_SITE, EMPTY_ADVANCED } from "./defaults";

describe("unit check from the brief", () => {
  it("100 MW, 75%, PUE 1.25, WUE 0.30, grid 0.40", () => {
    const n = coreNumbers({ itCapacityMw: 100, pue: 1.25, wueLPerKwh: 0.3, reclaimedSharePct: 0, gridWaterIntensityM3PerMwh: 0.4 }, 75);
    expect(n.itMwh).toBeCloseTo(657_000, 6);
    expect(n.facilityMwh).toBeCloseTo(821_250, 6);
    expect(n.onsiteM3).toBeCloseTo(197_100, 6);
    expect(n.gridM3).toBeCloseTo(328_500, 6);
  });
});

const base = { site: DEFAULT_SITE, core: DEFAULT_CORE, utilisationPct: 75, startYear: 2027, advanced: EMPTY_ADVANCED };

describe("scenario pipeline", () => {
  it("default scenario is valid with all advanced fields unset", () => {
    const r = buildHandoff(base);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.handoff.provenance.fieldStatus["advanced.sourceMix"]).toBe("unset");
      expect(r.handoff.metrics.sourceAllocation).toBeNull();
      expect(r.handoff.metrics.trajectory).toHaveLength(15);
    }
  });

  it("reclaimed share changes the reclaimed volume, not the on-site total", () => {
    const a = buildHandoff(base);
    const b = buildHandoff({ ...base, core: { ...DEFAULT_CORE, reclaimedSharePct: 50 } });
    if (!a.ok || !b.ok) throw new Error("invalid");
    expect(b.handoff.metrics.annualOnsiteWater.value).toBe(a.handoff.metrics.annualOnsiteWater.value);
    expect(b.handoff.metrics.annualReclaimedSupplied.value).toBeCloseTo(a.handoff.metrics.annualOnsiteWater.value / 2, 1);
  });

  it("rejects a source mix that does not total 100%", () => {
    const r = buildHandoff({ ...base, advanced: { ...EMPTY_ADVANCED, sourceMix: { potablePct: 70, reclaimedPct: 0, rainwaterPct: 10, seawaterPct: 10 } } });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0].message).toMatch(/90%/);
  });

  it("rejects a mix whose reclaimed share disagrees with the main control", () => {
    const r = buildHandoff({ ...base, advanced: { ...EMPTY_ADVANCED, sourceMix: { potablePct: 80, reclaimedPct: 20, rainwaterPct: 0, seawaterPct: 0 } } });
    expect(r.ok).toBe(false);
  });

  it("rejects PUE below 1.0", () => {
    const r = buildHandoff({ ...base, core: { ...DEFAULT_CORE, pue: 0.9 } });
    expect(r.ok).toBe(false);
  });

  it("peak factor gives peak-day use but leaves the annual total unchanged", () => {
    const a = buildHandoff(base);
    const b = buildHandoff({ ...base, advanced: { ...EMPTY_ADVANCED, peakToAverageFactor: 1.4 } });
    if (!a.ok || !b.ok) throw new Error("invalid");
    expect(b.handoff.metrics.annualOnsiteWater.value).toBe(a.handoff.metrics.annualOnsiteWater.value);
    expect(b.handoff.metrics.peakDayOnsiteWater!.value).toBeCloseTo(b.handoff.metrics.averageDailyOnsiteWater.value * 1.4, 1);
  });

  it("future WUE target reaches the target in its year", () => {
    const r = buildHandoff({ ...base, advanced: { ...EMPTY_ADVANCED, futureWue: { targetWueLPerKwh: 0.6, targetYear: 2032 } } });
    if (!r.ok) throw new Error(JSON.stringify(r.errors));
    const y2032 = r.handoff.metrics.trajectory.find((t) => t.year === 2032)!;
    expect(y2032.wueLPerKwh).toBeCloseTo(0.6);
    expect(r.handoff.metrics.trajectory[0].wueLPerKwh).toBeCloseTo(1.8);
  });
});
