import { describe, expect, it } from "vitest";
import { about, assess, DEFAULT_INPUTS, fractionWords, HOUSEHOLD_WATER_M3, oneIn, type CommunityInputs } from "./model";

const make = (p: Partial<CommunityInputs>): CommunityInputs => ({ ...DEFAULT_INPUTS, ...p, nature: { ...DEFAULT_INPUTS.nature, ...(p.nature ?? {}) } });

describe("community model", () => {
  it("household water is 225 L × 4 people × 365 days", () => {
    expect(HOUSEHOLD_WATER_M3).toBeCloseTo(328.5, 5);
  });
  it("default (medium, water-cooled) matches the NIMBY demo water figure", () => {
    const a = assess(DEFAULT_INPUTS);
    expect(a.world.water).toBeCloseTo(50 * 8760 * 0.8 * 2.2, 0);
    expect(a.water.homes).toBeGreaterThan(2000);
    expect(a.water.homes).toBeLessThan(2700);
  });
  it("air cooling uses far less water than evaporative", () => {
    expect(assess(make({ cooling: "air" })).water.homes).toBeLessThan(assess(DEFAULT_INPUTS).water.homes / 5);
  });
  it("recycled water cuts river withdrawal by 70%", () => {
    const base = assess(DEFAULT_INPUTS).world.withdrawal;
    expect(assess(make({ waterSource: "recycled" })).world.withdrawal).toBeCloseTo(base * 0.3, 3);
  });
  it("moving homes further away lowers noise and heat", () => {
    const close = assess(make({ distance: "close" })), far = assess(make({ distance: "far" }));
    expect(far.world.noise).toBeLessThan(close.world.noise);
    expect(far.world.peakTemp).toBeLessThan(close.world.peakTemp);
  });
  it("a tree buffer reduces noise at homes, more so after ten years", () => {
    const bare = assess(DEFAULT_INPUTS).world.noise;
    const y0 = assess(make({ nature: { ...DEFAULT_INPUTS.nature, trees: true } })).world.noise;
    const y10 = assess(make({ year: 10, nature: { ...DEFAULT_INPUTS.nature, trees: true } })).world.noise;
    expect(y0).toBeLessThan(bare);
    expect(y10).toBeLessThan(y0);
  });
  it("a bigger site draws a bigger share of the grid", () => {
    expect(assess(make({ size: "large" })).power.gridShare).toBeGreaterThan(assess(make({ size: "small" })).power.gridShare);
  });
  it("words stay approximate", () => {
    expect(about(2347)).toBe("about 2,300");
    expect(about(116812)).toBe("about 120,000");
    expect(fractionWords(0.21)).toBe("about a fifth");
    expect(oneIn(0.11)).toBe("about 1 in 9");
  });
});
