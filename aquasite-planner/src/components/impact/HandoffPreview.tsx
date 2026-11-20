"use client";
import Link from "next/link";
import { presetFor } from "@/lib/scenario/defaults";
import type { ScenarioHandoff } from "@/lib/scenario/schema";
import { fmtBig, fmtInt } from "@/lib/format";

const ADV_LABEL: Record<string, string> = {
  futureWue: "Future WUE target",
  futureReclaimed: "Future reclaimed-share target",
  demandGrowth: "Population growth & local demand",
  utilityExpansion: "Utility capacity expansion",
  droughtShock: "Drought shock",
  peakToAverageFactor: "Peak-to-average factor",
  sourceMix: "Local water source mix",
};

function summariseAdvanced(k: string, v: unknown): string {
  if (v === null) return "not set";
  const o = v as Record<string, unknown>;
  switch (k) {
    case "futureWue":
      return `${o.targetWueLPerKwh} L/kWh by ${o.targetYear}`;
    case "futureReclaimed":
      return `${o.targetSharePct}% by ${o.targetYear}`;
    case "utilityExpansion":
      return `+${fmtInt(o.additionalCapacityM3PerDay as number)} m³/day in ${o.inServiceYear}${o.utility ? ` (${o.utility})` : ""}`;
    case "droughtShock":
      return `−${o.supplyReductionPct}% of ${o.supplyBaselineName}`;
    case "peakToAverageFactor":
      return `${v}×`;
    case "sourceMix":
      return `potable ${o.potablePct}% · reclaimed ${o.reclaimedPct}% · rain ${o.rainwaterPct}% · sea ${o.seawaterPct}%`;
    case "demandGrowth":
      return Object.entries(o).filter(([, x]) => x !== null).map(([kk, x]) => `${kk}: ${x}`).join(" · ") || "set";
  }
  return "set";
}

export default function HandoffPreview({ handoff: h }: { handoff: ScenarioHandoff }) {
  const m = h.metrics;
  const download = () => {
    const blob = new Blob([JSON.stringify(h, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `aquasite-scenario-${h.createdAt.slice(0, 19).replace(/[:T]/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const rows: [string, string, string, string][] = [
    ["Annual on-site water use", fmtInt(m.annualOnsiteWater.value), m.annualOnsiteWater.unit, m.annualOnsiteWater.scope],
    ["…supplied by reclaimed water", fmtInt(m.annualReclaimedSupplied.value), m.annualReclaimedSupplied.unit, m.annualReclaimedSupplied.scope],
    ["…other / unspecified sources", fmtInt(m.annualNonReclaimedOnsite.value), m.annualNonReclaimedOnsite.unit, m.annualNonReclaimedOnsite.scope],
    ["Average daily on-site water", fmtInt(m.averageDailyOnsiteWater.value), m.averageDailyOnsiteWater.unit, m.averageDailyOnsiteWater.scope],
    ...(m.peakDayOnsiteWater ? ([["Peak-day on-site water", fmtInt(m.peakDayOnsiteWater.value), m.peakDayOnsiteWater.unit, m.peakDayOnsiteWater.scope]] as [string, string, string, string][]) : []),
    ["Annual grid-related water", fmtInt(m.annualGridWater.value), m.annualGridWater.unit, m.annualGridWater.scope],
    ["Annual IT electricity", fmtInt(m.annualItElectricity.value), m.annualItElectricity.unit, m.annualItElectricity.scope],
    ["Annual facility electricity", fmtInt(m.annualFacilityElectricity.value), m.annualFacilityElectricity.unit, m.annualFacilityElectricity.scope],
    [`Lifetime on-site water (${h.core.lifespanYears} yr)`, fmtInt(m.lifetimeOnsiteWater.value), m.lifetimeOnsiteWater.unit, m.lifetimeOnsiteWater.scope],
  ];

  return (
    <div className="handoff">
      <div className="handoff-head">
        <div>
          <div className="eyebrow">Step 3 · Impact</div>
          <h1>Your scenario is ready</h1>
          <p className="muted">
            Site, engineering inputs and water assumptions validated at {new Date(h.createdAt).toLocaleTimeString()}.
          </p>
        </div>
        <div className="handoff-actions">
          <Link href="/configure" className="btn ghost">
            ← Back to Configure
          </Link>
          <button type="button" className="btn" onClick={download}>
            Export scenario
          </button>
        </div>
      </div>

      <div className="impact-summary">
        <div><span>On-site water</span><b>{fmtBig(m.annualOnsiteWater.value)}</b><small>m³/year</small></div>
        <div><span>Reclaimed supply</span><b>{fmtBig(m.annualReclaimedSupplied.value)}</b><small>m³/year</small></div>
        <div><span>Grid-related water</span><b>{fmtBig(m.annualGridWater.value)}</b><small>m³/year · off-site</small></div>
      </div>

      <div className="team-note"><b>Impact analysis handoff complete.</b> This validated scenario is ready for AQUA SCORE, seasonal balance, recommendations and report generation.</div>

      <div className="handoff-grid">
        <section className="hcard">
          <h3>Site</h3>
          <div className="big-name">{h.site.name}</div>
          <div className="mono">
            {h.site.lat.toFixed(4)}° N, {h.site.lon.toFixed(4)}° E · {h.site.placement}
          </div>
          <ul className="mini-list">
            {h.site.nearby.map((n) => (
              <li key={n.id}>
                <span className={`swatch ${n.layer === "datacentre" ? "dc" : n.layer}`} /> {n.name} <b>{n.distanceKm.toFixed(1)} km</b>
              </li>
            ))}
          </ul>
          <p className="caveat">{h.site.note}</p>
        </section>

        <section className="hcard">
          <h3>Design inputs</h3>
          <dl className="kv">
            <dt>IT capacity</dt>
            <dd>{h.core.itCapacityMw} MW</dd>
            <dt>Avg utilisation</dt>
            <dd>{h.utilisationPct}% (modelling assumption)</dd>
            <dt>Cooling</dt>
            <dd>{presetFor(h.core.coolingTechnology).label}</dd>
            <dt>PUE</dt>
            <dd>{h.core.pue}</dd>
            <dt>WUE</dt>
            <dd>{h.core.wueLPerKwh} L/kWh IT</dd>
            <dt>Reclaimed share</dt>
            <dd>{h.core.reclaimedSharePct}%</dd>
            <dt>Lifespan</dt>
            <dd>
              {h.core.lifespanYears} years ({h.startYear}–{h.startYear + h.core.lifespanYears - 1})
            </dd>
            <dt>Grid water intensity</dt>
            <dd>{h.core.gridWaterIntensityM3PerMwh} m³/MWh facility</dd>
          </dl>
          <h4>Advanced assumptions</h4>
          <dl className="kv small">
            {Object.entries(h.advanced).map(([k, v]) => (
              <div key={k} className={v === null ? "unset" : ""}>
                <dt>{ADV_LABEL[k]}</dt>
                <dd>{summariseAdvanced(k, v)}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="hcard wide">
          <h3>Computed metrics</h3>
          <table className="metrics-table">
            <thead>
              <tr>
                <th>Metric</th>
                <th className="num">Value</th>
                <th>Unit</th>
                <th>Scope</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r[0]} className={r[3].startsWith("off-site") ? "offsite" : ""}>
                  <td>{r[0]}</td>
                  <td className="num">{r[1]}</td>
                  <td>{r[2]}</td>
                  <td>
                    <code>{r[3]}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {m.sourceAllocation && (
            <p className="muted small">
              Source allocation: potable {fmtBig(m.sourceAllocation.potable.value)} · reclaimed {fmtBig(m.sourceAllocation.reclaimed.value)} · rainwater {fmtBig(m.sourceAllocation.rainwater.value)} · seawater{" "}
              {fmtBig(m.sourceAllocation.seawater.value)} m³/yr
            </p>
          )}
          <p className="muted small">Trajectory: {m.trajectory.length} yearly rows ({m.trajectory[0]?.year}–{m.trajectory[m.trajectory.length - 1]?.year}) included in the JSON.</p>
        </section>

        <section className="hcard wide">
          <h3>Data notes</h3>
          <p>
            <span className="badge-illustrative">{h.provenance.scenarioLabel}</span>
          </p>
          <ul className="notes">
            {h.provenance.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </section>
      </div>

      <details className="developer-handoff">
        <summary>Developer handoff details</summary>
        <p>Validated through <code>POST /api/scenario</code> · schema <code>{h.schemaVersion}</code>. The integration point is <code>src/components/impact/ImpactModule.tsx</code>.</p>
      </details>
    </div>
  );
}
