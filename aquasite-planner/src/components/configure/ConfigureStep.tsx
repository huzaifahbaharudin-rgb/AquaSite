"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { COOLING_PRESETS } from "@/lib/scenario/defaults";
import { CoreInputsSchema, ScenarioRequestSchema, UtilisationSchema, type CoolingTechnology } from "@/lib/scenario/schema";
import { num, requestFromState } from "@/lib/state/convert";
import { useScenario } from "@/lib/state/store";
import type { CoreNumericKey } from "@/lib/state/types";
import AdvancedPanel, { countAdvancedSet } from "./AdvancedPanel";
import LivePreview from "./LivePreview";
import { NumberField, StatusBadge } from "./fields";

export const HANDOFF_KEY = "aquasite.handoff.v1";

export default function ConfigureStep() {
  const { state, dispatch, hydrated } = useScenario();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [serverErrors, setServerErrors] = useState<{ path: string; message: string }[] | null>(null);
  const [attempted, setAttempted] = useState(false);
  const fs = state.fieldStatus;

  const request = useMemo(() => requestFromState(state), [state]);
  const validation = useMemo(() => ScenarioRequestSchema.safeParse(request), [request]);
  const errors = useMemo(() => {
    const m = new Map<string, string>();
    if (!validation.success) for (const i of validation.error.issues) {
      const k = i.path.join(".");
      if (!m.has(k)) m.set(k, i.message);
    }
    return m;
  }, [validation]);
  const err = (p: string) => errors.get(p);

  // Preview only needs the core inputs; it stays live even if an Advanced field is mid-edit.
  const coreParsed = useMemo(() => CoreInputsSchema.safeParse(request.core), [request.core]);
  const utilParsed = useMemo(() => UtilisationSchema.safeParse(request.utilisationPct), [request.utilisationPct]);
  const peak = num(state.advanced.peakFactor);

  const advErrorCount = [...errors.keys()].filter((k) => k.startsWith("advanced") || k === "utilisationPct").length;
  const advSet = countAdvancedSet(state.advanced);

  const setCore = (key: CoreNumericKey, value: string) => dispatch({ type: "setCore", key, value });
  const openAdvanced = () => {
    dispatch({ type: "toggleAdvanced", open: true });
    window.setTimeout(() => document.getElementById("advanced-assumptions")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };
  const chooseCooling = (cooling: CoolingTechnology) => {
    dispatch({ type: "setCooling", cooling });
  };

  async function continueToImpact() {
    setAttempted(true);
    setServerErrors(null);
    if (!validation.success) {
      if (advErrorCount) dispatch({ type: "toggleAdvanced", open: true });
      window.setTimeout(() => {
        const invalid = document.querySelector<HTMLElement>("[aria-invalid='true']");
        invalid?.scrollIntoView({ behavior: "smooth", block: "center" });
        invalid?.focus({ preventScroll: true });
      }, 60);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/scenario", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...request, fieldStatus: fs }) });
      const body = await res.json();
      if (!res.ok) {
        setServerErrors(body.errors ?? [{ path: "", message: "Scenario was rejected" }]);
        return;
      }
      sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(body));
      dispatch({ type: "markHandoff", at: body.createdAt });
      router.push("/impact");
    } catch (e) {
      setServerErrors([{ path: "", message: `Could not reach the scenario API: ${String(e)}` }]);
    } finally {
      setSubmitting(false);
    }
  }

  if (!hydrated) return <div className="page-loading">Loading…</div>;

  return (
    <div className="configure-step">
      <section className="config-form" aria-label="Data centre configuration">
        <div className="site-strip">
          <div>
            <div className="eyebrow">Step 2 · Configure the data centre</div>
            <h1>What assumptions define its water use?</h1>
          </div>
          <Link href="/site" className="site-chip" title="Back to site selection">
            <span className="dot" aria-hidden />
            <span>
              <b>{state.site.name}</b>
              <small>
                {state.site.lat.toFixed(4)}° N, {state.site.lon.toFixed(4)}° E · change
              </small>
            </span>
          </Link>
        </div>

        <div className="scenario-banner">
          <span className="scenario-dot" aria-hidden />
          <span><b>Illustrative Johor baseline</b> · Edit the design and watch the water profile update instantly.</span>
          <span className="scenario-status">Demo assumptions</span>
        </div>

        <section className="config-section">
          <div className="section-heading">
            <span className="section-number">01</span>
            <div><h2>Facility</h2><p>Define the scale and operating horizon.</p></div>
          </div>
          <div className="section-grid two">
            <NumberField
              id="it"
              label="IT capacity"
              unit="MW"
              value={state.core.itCapacityMw}
              onChange={(v) => setCore("itCapacityMw", v)}
              error={err("core.itCapacityMw")}
              badge={<StatusBadge status={fs["core.itCapacityMw"]} />}
              help={
                <>
                  Nameplate IT load at <b>{state.utilisationPct || "—"}% average utilisation</b>.{" "}
                  <button type="button" className="link-btn inline" onClick={openAdvanced}>Edit utilisation</button>
                </>
              }
            />
            <NumberField
              id="life"
              label="Project lifespan"
              unit="years"
              value={state.core.lifespanYears}
              onChange={(v) => setCore("lifespanYears", v)}
              error={err("core.lifespanYears")}
              step="1"
              inputMode="numeric"
              badge={<StatusBadge status={fs["core.lifespanYears"]} />}
              help="Forecast horizon beginning in 2027."
            />
          </div>
        </section>

        <section className="config-section">
          <div className="section-heading">
            <span className="section-number">02</span>
            <div><h2>Cooling design</h2><p>Choose a strategy. Its illustrative efficiency preset is applied immediately.</p></div>
          </div>
          <div className="cooling-cards" role="radiogroup" aria-label="Cooling technology">
            {COOLING_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={state.cooling === p.id}
                className={`cooling-card ${state.cooling === p.id ? "selected" : ""}`}
                onClick={() => chooseCooling(p.id)}
              >
                <span className="cooling-check" aria-hidden>{state.cooling === p.id ? "✓" : ""}</span>
                <b>{p.short}</b>
                <span>{p.note}</span>
                <small>{p.pue === null ? "Enter custom values" : `PUE ${p.pue} · WUE ${p.wueLPerKwh}`}</small>
              </button>
            ))}
          </div>
          <div className="engineering-inputs">
            <div className="engineering-label"><span>Engineering inputs</span><small>Editable after applying a preset</small></div>
            <div className="section-grid two">
              <NumberField
                id="pue"
                label="PUE"
                unit="ratio"
                value={state.core.pue}
                onChange={(v) => setCore("pue", v)}
                error={err("core.pue")}
                min={1}
                step="0.01"
                badge={<StatusBadge status={fs["core.pue"]} />}
                help="Facility electricity ÷ IT electricity."
              />
              <NumberField
                id="wue"
                label="WUE"
                unit="L/kWh IT"
                value={state.core.wueLPerKwh}
                onChange={(v) => setCore("wueLPerKwh", v)}
                error={err("core.wueLPerKwh")}
                min={0}
                step="0.05"
                badge={<StatusBadge status={fs["core.wueLPerKwh"]} />}
                help="On-site water per kWh of IT electricity."
              />
            </div>
          </div>
        </section>

        <section className="config-section">
          <div className="section-heading">
            <span className="section-number">03</span>
            <div><h2>Water strategy</h2><p>Reduce reliance on freshwater without changing the facility load.</p></div>
          </div>
          <div className="water-strategy-grid">
            <div className={`field reclaimed ${err("core.reclaimedSharePct") ? "has-error" : ""}`}>
              <label htmlFor="rec" className="field-label">
                <span>Reclaimed water share</span>
                <strong className="slider-value">{state.core.reclaimedSharePct || 0}%</strong>
              </label>
              <div className="slider-row">
                <input
                  id="rec-range"
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={Number.isFinite(num(state.core.reclaimedSharePct)) ? (num(state.core.reclaimedSharePct) ?? 0) : 0}
                  onChange={(e) => setCore("reclaimedSharePct", e.target.value)}
                  aria-label="Reclaimed water share slider"
                />
                <div className="input-unit narrow">
                  <input id="rec" type="number" min={0} max={100} step="1" value={state.core.reclaimedSharePct} onChange={(e) => setCore("reclaimedSharePct", e.target.value)} aria-invalid={!!err("core.reclaimedSharePct")} />
                  <span className="unit">%</span>
                </div>
              </div>
              <div className="slider-scale"><span>0% reclaimed</span><span>100% reclaimed</span></div>
              <div className="field-help">Changes the water source allocation while total on-site demand remains fixed.</div>
              {err("core.reclaimedSharePct") && <div className="field-error">{err("core.reclaimedSharePct")}</div>}
            </div>
            <NumberField
              id="grid"
              label="Grid water intensity"
              unit="m³/MWh"
              value={state.core.gridWaterIntensityM3PerMwh}
              onChange={(v) => setCore("gridWaterIntensityM3PerMwh", v)}
              error={err("core.gridWaterIntensityM3PerMwh")}
              step="0.01"
              badge={<StatusBadge status={fs["core.gridWaterIntensityM3PerMwh"]} />}
              help="Off-site water used per MWh of facility electricity."
            />
          </div>
        </section>

        <section id="advanced-assumptions" className={`advanced ${state.advancedOpen ? "open" : ""}`}>
          <button type="button" className="adv-toggle" aria-expanded={state.advancedOpen} onClick={() => dispatch({ type: "toggleAdvanced" })}>
            <span className="chev" aria-hidden>
              {state.advancedOpen ? "▾" : "▸"}
            </span>
            <span>
              <b>Advanced scenario assumptions</b> <small>Optional · future targets, demand, utility capacity, drought and source mix</small>
            </span>
            <span className="adv-count">
              {advSet} set{advErrorCount ? <span className="adv-err"> · {advErrorCount} to fix</span> : null}
            </span>
          </button>
          {state.advancedOpen && <AdvancedPanel err={err} />}
        </section>

        {serverErrors && (
          <div className="server-errors" role="alert">
            <b>The scenario API rejected the inputs:</b>
            <ul>
              {serverErrors.map((e, i) => (
                <li key={i}>
                  {e.path && <code>{e.path}</code>} {e.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        {attempted && !validation.success && (
          <div className="validation-summary" role="alert">
            <span aria-hidden>!</span>
            <div><b>Complete {errors.size} highlighted input{errors.size === 1 ? "" : "s"}</b><small>We moved you to the first field that needs attention.</small></div>
          </div>
        )}

        <div className="form-actions">
          <Link href="/site" className="btn ghost">
            ← Back to site
          </Link>
          <button type="button" className="btn primary large" onClick={continueToImpact} disabled={submitting}>
            {submitting ? "Validating…" : "Continue to Impact →"}
          </button>
        </div>
        <div className="form-hint">Your scenario is validated before it is sent to Impact.</div>
      </section>

      <aside className="config-preview">
        <LivePreview core={coreParsed.success ? coreParsed.data : null} utilisationPct={utilParsed.success ? utilParsed.data : null} peakFactor={peak !== undefined && Number.isFinite(peak) && peak >= 1 ? peak : null} />
      </aside>
    </div>
  );
}
