"use client";
import { useScenario } from "@/lib/state/store";
import { NumberField, TextField } from "./fields";
import { num } from "@/lib/state/convert";
import { fmtInt } from "@/lib/format";
import type { AdvancedText } from "@/lib/state/types";

type Err = (path: string) => string | undefined;

const isBlank = (o: Record<string, string>) => Object.values(o).every((v) => v.trim() === "");

function Group({ title, desc, set, onClear, children }: { title: string; desc: string; set: boolean; onClear: () => void; children: React.ReactNode }) {
  return (
    <fieldset className={`adv-group ${set ? "is-set" : ""}`}>
      <legend>
        <span>{title}</span>
        <span className={`adv-state ${set ? "set" : ""}`}>{set ? "set" : "not set"}</span>
      </legend>
      <p className="adv-desc">{desc}</p>
      <div className="adv-fields">{children}</div>
      {set && (
        <button type="button" className="link-btn" onClick={onClear}>
          Clear
        </button>
      )}
    </fieldset>
  );
}

export function countAdvancedSet(a: AdvancedText) {
  return [!isBlank(a.futureWue), !isBlank(a.futureReclaimed), !isBlank(a.demand), !isBlank(a.utility), !isBlank(a.drought), a.peakFactor.trim() !== "", a.mixEnabled].filter(Boolean).length;
}

export default function AdvancedPanel({ err }: { err: Err }) {
  const { state, dispatch } = useScenario();
  const a = state.advanced;
  const set = (path: string, value: string | boolean) => dispatch({ type: "setAdvanced", path, value });
  const clear = (key: keyof AdvancedText, empty: unknown) => dispatch({ type: "setAdvanced", path: key, value: empty as never });

  const pop = num(a.demand.population), lpcd = num(a.demand.lpcd);
  const domesticFromPop = pop !== undefined && lpcd !== undefined && Number.isFinite(pop) && Number.isFinite(lpcd) ? (pop * lpcd) / 1000 : null;

  const mixVals = [a.mix.potable, a.mix.reclaimed, a.mix.rainwater, a.mix.seawater].map((v) => num(v) ?? 0);
  const mixTotal = mixVals.reduce((s, v) => s + (Number.isFinite(v) ? v : 0), 0);
  const droughtM3 = num(a.drought.baselineM3) !== undefined && num(a.drought.pct) !== undefined ? ((num(a.drought.baselineM3)! * num(a.drought.pct)!) / 100) : null;

  return (
    <div className="adv-body">
      <fieldset className="adv-group is-set">
        <legend>
          <span>Average IT utilisation</span>
          <span className="adv-state set">modelling assumption</span>
        </legend>
        <p className="adv-desc">Share of nameplate IT capacity drawn on average across the year. Used for all annual figures.</p>
        <div className="adv-fields">
          <NumberField id="util" label="Average IT utilisation" unit="%" value={state.utilisationPct} onChange={(v) => dispatch({ type: "setUtilisation", value: v })} error={err("utilisationPct")} min={1} max={100} compact />
        </div>
      </fieldset>

      <Group title="Future WUE improvement" desc="Optional target for on-site WUE. Interpolated linearly from the current WUE (main form) in the start year to the target year, then held." set={!isBlank(a.futureWue)} onClear={() => clear("futureWue", { target: "", year: "" })}>
        <NumberField id="fwue" label="Target WUE" unit="L/kWh IT" value={a.futureWue.target} onChange={(v) => set("futureWue.target", v)} error={err("advanced.futureWue.targetWueLPerKwh")} compact />
        <NumberField id="fwuey" label="Target year" value={a.futureWue.year} onChange={(v) => set("futureWue.year", v)} error={err("advanced.futureWue.targetYear")} step="1" inputMode="numeric" compact />
      </Group>

      <Group title="Future reclaimed-share improvement" desc="Optional target for the reclaimed share. Separate from the current share on the main form." set={!isBlank(a.futureReclaimed)} onClear={() => clear("futureReclaimed", { target: "", year: "" })}>
        <NumberField id="frec" label="Target reclaimed share" unit="%" value={a.futureReclaimed.target} onChange={(v) => set("futureReclaimed.target", v)} error={err("advanced.futureReclaimed.targetSharePct")} compact />
        <NumberField id="frecy" label="Target year" value={a.futureReclaimed.year} onChange={(v) => set("futureReclaimed.year", v)} error={err("advanced.futureReclaimed.targetYear")} step="1" inputMode="numeric" compact />
      </Group>

      <Group
        title="Population growth and local water demand"
        desc="Baseline demand in the supply area. Industrial demand excludes the proposed data centre."
        set={!isBlank(a.demand)}
        onClear={() => clear("demand", { population: "", growthPct: "", lpcd: "", domesticM3: "", industrialM3: "", industrialGrowthPct: "" })}
      >
        <NumberField id="pop" label="Baseline population" unit="people" value={a.demand.population} onChange={(v) => set("demand.population", v)} error={err("advanced.demandGrowth.baselinePopulation")} step="1" compact />
        <NumberField id="popg" label="Population growth" unit="%/yr" value={a.demand.growthPct} onChange={(v) => set("demand.growthPct", v)} error={err("advanced.demandGrowth.populationGrowthPctPerYear")} compact />
        <NumberField id="lpcd" label="Domestic use per person" unit="L/person/day" value={a.demand.lpcd} onChange={(v) => set("demand.lpcd", v)} error={err("advanced.demandGrowth.domesticLitresPerPersonPerDay")} compact />
        <NumberField
          id="dom"
          label="…or baseline domestic demand"
          unit="m³/day"
          value={a.demand.domesticM3}
          onChange={(v) => set("demand.domesticM3", v)}
          error={err("advanced.demandGrowth.baselineDomesticDemandM3PerDay")}
          help={domesticFromPop !== null ? `From population: ${fmtInt(domesticFromPop)} m³/day (population × L/person/day ÷ 1,000) — used instead.` : "Used only if population and L/person/day are not both set."}
          compact
        />
        <NumberField id="ind" label="Baseline industrial demand (excl. proposed DC)" unit="m³/day" value={a.demand.industrialM3} onChange={(v) => set("demand.industrialM3", v)} error={err("advanced.demandGrowth.baselineIndustrialDemandM3PerDay")} compact />
        <NumberField id="indg" label="Industrial demand growth" unit="%/yr" value={a.demand.industrialGrowthPct} onChange={(v) => set("demand.industrialGrowthPct", v)} error={err("advanced.demandGrowth.industrialGrowthPctPerYear")} compact />
      </Group>

      <Group title="Utility capacity expansion" desc="Optional planned addition to treatment capacity. Record the supply area or utility if known." set={!isBlank(a.utility)} onClear={() => clear("utility", { capacityM3: "", year: "", area: "", utility: "" })}>
        <NumberField id="ucap" label="Additional capacity" unit="m³/day" value={a.utility.capacityM3} onChange={(v) => set("utility.capacityM3", v)} error={err("advanced.utilityExpansion.additionalCapacityM3PerDay")} compact />
        <NumberField id="uyr" label="In-service year" value={a.utility.year} onChange={(v) => set("utility.year", v)} error={err("advanced.utilityExpansion.inServiceYear")} step="1" inputMode="numeric" compact />
        <TextField id="uarea" label="Supply area (optional)" value={a.utility.area} onChange={(v) => set("utility.area", v)} placeholder="e.g. Johor Bahru & Iskandar Puteri" />
        <TextField id="uutil" label="Utility (optional)" value={a.utility.utility} onChange={(v) => set("utility.utility", v)} placeholder="e.g. Ranhill SAJ" />
      </Group>

      <Group title="Drought shock" desc="Optional % reduction in supply. Name the supply baseline it applies to; give the baseline volume to express the shock in m³/day." set={!isBlank(a.drought)} onClear={() => clear("drought", { pct: "", baselineName: "", baselineM3: "" })}>
        <NumberField id="dpct" label="Supply reduction" unit="%" value={a.drought.pct} onChange={(v) => set("drought.pct", v)} error={err("advanced.droughtShock.supplyReductionPct")} compact />
        <TextField id="dname" label="Supply baseline (name)" value={a.drought.baselineName} onChange={(v) => set("drought.baselineName", v)} error={err("advanced.droughtShock.supplyBaselineName")} placeholder="e.g. Driest-month treated supply, local scheme" />
        <NumberField
          id="dbase"
          label="Supply baseline volume (optional)"
          unit="m³/day"
          value={a.drought.baselineM3}
          onChange={(v) => set("drought.baselineM3", v)}
          error={err("advanced.droughtShock.supplyBaselineM3PerDay")}
          help={droughtM3 !== null && Number.isFinite(droughtM3) ? `Shock = ${fmtInt(droughtM3)} m³/day less supply.` : "Without a baseline volume, the shock is kept as a percentage only."}
          compact
        />
      </Group>

      <Group title="Peak versus average water use" desc="Peak-day factor × average daily on-site use = peak-day use. Not applied to annual totals." set={a.peakFactor.trim() !== ""} onClear={() => set("peakFactor", "")}>
        <NumberField id="peak" label="Peak-to-average daily factor" unit="× average" value={a.peakFactor} onChange={(v) => set("peakFactor", v)} error={err("advanced.peakToAverageFactor")} placeholder="e.g. 1.3" compact />
      </Group>

      <fieldset className={`adv-group ${a.mixEnabled ? "is-set" : ""}`}>
        <legend>
          <span>Local water source mix</span>
          <span className={`adv-state ${a.mixEnabled ? "set" : ""}`}>{a.mixEnabled ? "set" : "not set"}</span>
        </legend>
        <p className="adv-desc">Split of on-site water by source. Until you specify a mix, the non-reclaimed share stays unspecified. The reclaimed share here is the same value as on the main form.</p>
        <label className="check">
          <input type="checkbox" checked={a.mixEnabled} onChange={(e) => set("mixEnabled", e.target.checked)} /> Specify detailed source mix
        </label>
        {a.mixEnabled && (
          <>
            <div className="adv-fields mix">
              <NumberField id="mpot" label="Potable (drinking) water" unit="%" value={a.mix.potable} onChange={(v) => set("mix.potable", v)} compact placeholder="0" />
              <NumberField id="mrec" label="Reclaimed water" unit="%" value={a.mix.reclaimed} onChange={(v) => set("mix.reclaimed", v)} compact help="Synced with main form" placeholder="0" />
              <NumberField id="mrain" label="Harvested rainwater" unit="%" value={a.mix.rainwater} onChange={(v) => set("mix.rainwater", v)} compact placeholder="0" />
              <NumberField id="msea" label="Seawater" unit="%" value={a.mix.seawater} onChange={(v) => set("mix.seawater", v)} compact placeholder="0" />
            </div>
            <div className={`mix-total ${Math.abs(mixTotal - 100) < 0.01 ? "ok" : "bad"}`} role="status">
              Total: <b>{+mixTotal.toFixed(2)}%</b>
              {Math.abs(mixTotal - 100) < 0.01 ? " ✓" : ` — ${mixTotal < 100 ? `add ${+(100 - mixTotal).toFixed(2)}%` : `remove ${+(mixTotal - 100).toFixed(2)}%`} so the mix totals 100%`}
            </div>
            {err("advanced.sourceMix") && <div className="field-error">{err("advanced.sourceMix")}</div>}
          </>
        )}
      </fieldset>
    </div>
  );
}
