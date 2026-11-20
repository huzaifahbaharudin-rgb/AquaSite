"use client";
import { coreNumbers, type CoreNumbers } from "@/lib/scenario/calc";
import { DEFAULT_CORE, DEFAULT_UTILISATION_PCT, presetFor } from "@/lib/scenario/defaults";
import type { CoreInputs } from "@/lib/scenario/schema";
import { fmtBig, fmtInt, pctChange } from "@/lib/format";

interface Props {
  core: CoreInputs | null;
  utilisationPct: number | null;
  peakFactor: number | null;
}

const BASE: CoreNumbers = coreNumbers(DEFAULT_CORE, DEFAULT_UTILISATION_PCT);

function Delta({ now, base, inverse = false }: { now: number; base: number; inverse?: boolean }) {
  const change = pctChange(now, base);
  if (change === null) return <span className="delta good">New reclaimed supply</span>;
  if (Math.abs(change) < 0.05) return <span className="delta neutral">No change from baseline</span>;
  const isGood = inverse ? change > 0 : change < 0;
  return <span className={`delta ${isGood ? "good" : "bad"}`}>{change > 0 ? "↑" : "↓"} {Math.abs(change).toFixed(Math.abs(change) < 10 ? 1 : 0)}% from baseline</span>;
}

export default function LivePreview({ core, utilisationPct, peakFactor }: Props) {
  if (!core || utilisationPct === null) {
    return (
      <div className="preview">
        <div className="preview-head"><div className="eyebrow">Live scenario</div><h2>Water profile</h2></div>
        <div className="preview-invalid">Complete the highlighted fields to restore the live result.</div>
      </div>
    );
  }

  const numbers = coreNumbers(core, utilisationPct);
  const reclaimedShare = core.reclaimedSharePct;
  const averageDay = numbers.onsiteM3 / 365;
  const lifetime = numbers.onsiteM3 * core.lifespanYears;
  const onsiteChange = pctChange(numbers.onsiteM3, BASE.onsiteM3) ?? 0;
  const safeShare = Math.max(0, Math.min(100, reclaimedShare));
  const ringStyle = { background: `conic-gradient(var(--reclaimed) 0 ${safeShare}%, var(--water-soft) ${safeShare}% 100%)` };

  return (
    <div className="preview" aria-live="polite">
      <div className="preview-head">
        <div><div className="eyebrow">Live scenario</div><h2>Water profile</h2></div>
        <span className="live-indicator"><i /> Live</span>
      </div>

      <div className="preview-context">
        <b>{core.itCapacityMw} MW</b>
        <span>{presetFor(core.coolingTechnology).short} cooling</span>
        <span>{utilisationPct}% utilisation</span>
      </div>

      <section className="hero-metric">
        <span className="metric-kicker">Annual on-site water use</span>
        <div className="hero-value">{fmtBig(numbers.onsiteM3)} <small>m³/year</small></div>
        <div className="hero-meta"><Delta now={numbers.onsiteM3} base={BASE.onsiteM3} /><span>{fmtInt(averageDay)} m³ average day</span></div>
        <div className="comparison-track" aria-label="On-site water compared with the starting scenario">
          <span className="baseline-marker" title={`Starting scenario: ${fmtInt(BASE.onsiteM3)} m³/year`} />
          <span className="current-bar" style={{ width: `${Math.min(100, (numbers.onsiteM3 / Math.max(numbers.onsiteM3, BASE.onsiteM3)) * 100)}%` }} />
        </div>
        <div className="comparison-label"><span>Current design</span><span>Baseline {fmtBig(BASE.onsiteM3)} m³</span></div>
      </section>

      <section className="source-allocation">
        <div className="source-ring" style={ringStyle}>
          <div><b>{reclaimedShare}%</b><span>reclaimed</span></div>
        </div>
        <div className="source-copy">
          <span className="metric-kicker">On-site supply mix</span>
          <div><b>{fmtBig(numbers.reclaimedM3)} m³</b><span>Reclaimed water</span></div>
          <div><b>{fmtBig(numbers.nonReclaimedM3)} m³</b><span>Remaining supply</span></div>
          <Delta now={numbers.reclaimedM3} base={BASE.reclaimedM3} inverse />
        </div>
      </section>

      <div className="preview-metric-grid">
        <div className="mini-metric"><span>Grid-related water</span><b>{fmtBig(numbers.gridM3)}</b><small>m³/year · off-site</small></div>
        <div className="mini-metric"><span>Lifetime on-site use</span><b>{fmtBig(lifetime)}</b><small>m³ over {core.lifespanYears} years</small></div>
      </div>

      {peakFactor && <div className="peak-note"><span>Peak-day estimate</span><b>{fmtInt(averageDay * peakFactor)} m³/day</b></div>}

      <div className="preview-insight">
        <span aria-hidden>↳</span>
        <p>{Math.abs(onsiteChange) < 0.05 ? "The current design uses the same total volume as the baseline. Adjust WUE to reduce total demand." : `This design ${onsiteChange < 0 ? "reduces" : "increases"} annual on-site water use by ${Math.abs(onsiteChange).toFixed(Math.abs(onsiteChange) < 10 ? 1 : 0)}%.`}</p>
      </div>
    </div>
  );
}
