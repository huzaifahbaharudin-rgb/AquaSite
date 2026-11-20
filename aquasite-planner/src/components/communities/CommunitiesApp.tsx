"use client";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ASSUMPTIONS, assess, DEFAULT_INPUTS, headline, HOUSEHOLD_WATER_M3, INTERVENTION_KEYS, questionsFor,
  type CommunityInputs, type Cooling, type Distance, type InterventionKey, type Size, type WaterSource,
} from "@/lib/communities/model";
import Impacts from "./Impacts";
import Scene from "./Scene";
import "./communities.css";

function Choice<T extends string>({ legend, hint, value, onChange, options }: { legend: string; hint?: string; value: T; onChange: (v: T) => void; options: { value: T; label: string; sub: string }[] }) {
  return (
    <fieldset className="cm-choice">
      <legend>{legend}</legend>
      {hint && <p className="cm-hint">{hint}</p>}
      <div className="cm-options">
        {options.map((o) => (
          <label key={o.value} className={value === o.value ? "selected" : ""}>
            <input type="radio" name={legend} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} />
            <b>{o.label}</b>
            <small>{o.sub}</small>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

const NATURE: Record<InterventionKey, { icon: string; name: string; sub: string; desc: string }> = {
  trees: { icon: "🌳", name: "Tree belt", sub: "A living screen", desc: "Muffles the hum and shades the nearest streets. Gets better as the trees grow." },
  wetland: { icon: "🪷", name: "Wetland", sub: "Let water heal", desc: "Cleans the water before it reaches the river and gives wildlife a home." },
  roof: { icon: "🌱", name: "Green roof & walls", sub: "Cool the building", desc: "Plants on the roof and walls keep the building a little cooler." },
  recycled: { icon: "♻️", name: "Recycled water", sub: "Keep the river flowing", desc: "Uses treated wastewater instead of river water for most of the cooling." },
  reuse: { icon: "🏘️", name: "Waste heat to homes", sub: "Put warmth to work", desc: "Pipes spare heat to nearby buildings. Works best when homes are close." },
  corridor: { icon: "🦜", name: "Wildlife corridor", sub: "Reconnect the canopy", desc: "A green path so birds and animals can move around the site." },
};

export default function CommunitiesApp() {
  const [inputs, setInputs] = useState<CommunityInputs>(DEFAULT_INPUTS);
  const a = useMemo(() => assess(inputs), [inputs]);
  const set = <K extends keyof CommunityInputs>(k: K, v: CommunityInputs[K]) => setInputs((s) => ({ ...s, [k]: v }));
  const toggle = (k: InterventionKey) => setInputs((s) => ({ ...s, nature: { ...s.nature, [k]: !s.nature[k] } }));
  const allOn = INTERVENTION_KEYS.every((k) => inputs.nature[k]);
  const setAll = (on: boolean) => setInputs((s) => ({ ...s, nature: Object.fromEntries(INTERVENTION_KEYS.map((k) => [k, on])) as CommunityInputs["nature"] }));
  const questions = questionsFor(inputs, a);

  return (
    <div className="cm-root">
      <header className="cm-header">
        <Link href="/" className="cm-brand" aria-label="NIMBY home">
          <Image src="/nimby-logo.png" alt="NIMBY: Not In My Backyard" width={152} height={56} priority />
        </Link>
        <div className="cm-header-mid">
          <span className="cm-pill"><span className="cm-dot" /> For communities</span>
          <span className="cm-muted">Illustrative model · fictional Johor-inspired neighbourhood</span>
        </div>
        <nav className="cm-header-links" aria-label="Switch view">
          <button type="button" onClick={() => setInputs(DEFAULT_INPUTS)}>Start over</button>
          <Link href="/site">For developers</Link>
        </nav>
      </header>

      <section className="cm-hero" aria-live="polite">
        <p className="cm-kicker">What if a data centre moved in next door?</p>
        <h1>{headline(inputs, a)}</h1>
        <p className="cm-sub">Change anything below. The picture and everything it means for your water, air, noise and wildlife updates as you go.</p>
      </section>

      <main className="cm-main">
        <section className="cm-stage" aria-label="Illustration">
          <Scene inputs={inputs} a={a} />
        </section>

        <aside className="cm-panel cm-left" aria-label="Describe the data centre">
          <div className="cm-panel-head"><span className="cm-eyebrow">The development</span><h2>Meet the data centre</h2></div>
          <Choice<Size> legend="How big is it?" value={inputs.size} onChange={(v) => set("size", v)} options={[
            { value: "small", label: "Small", sub: "Like a large warehouse" },
            { value: "medium", label: "Medium", sub: "A town-sized appetite" },
            { value: "large", label: "Very large", sub: "A campus of buildings" },
          ]} />
          <Choice<Cooling> legend="How is it kept cool?" value={inputs.cooling} onChange={(v) => set("cooling", v)} options={[
            { value: "evaporative", label: "With water", sub: "Cheap to run, thirsty" },
            { value: "hybrid", label: "A mix", sub: "Uses less water" },
            { value: "air", label: "With air", sub: "Hardly any water, more power" },
          ]} />
          <Choice<WaterSource> legend="Where does its water come from?" value={inputs.waterSource} onChange={(v) => set("waterSource", v)} options={[
            { value: "river", label: "The river", sub: "Shared with farms and homes" },
            { value: "reservoir", label: "The reservoir", sub: "Our drinking supply" },
            { value: "recycled", label: "Recycled water", sub: "Treated wastewater" },
          ]} />
          <Choice<Distance> legend="How close is it to homes?" value={inputs.distance} onChange={(v) => set("distance", v)} options={[
            { value: "close", label: "Right next door", sub: "Within a few streets" },
            { value: "near", label: "A short walk", sub: "A few minutes on foot" },
            { value: "far", label: "Across the valley", sub: "Beyond the river" },
          ]} />
        </aside>

        <aside className="cm-panel cm-right" aria-label="Ask for nature">
          <div className="cm-panel-head"><span className="cm-eyebrow">What neighbours can ask for</span><h2>Make room for nature</h2></div>
          <p className="cm-hint">Switch on what you would want written into the plan. The picture and the impacts below respond straight away.</p>
          <ul className="cm-nature">
            {INTERVENTION_KEYS.map((k) => (
              <li key={k}>
                <label className={inputs.nature[k] ? "on" : ""}>
                  <input type="checkbox" checked={inputs.nature[k]} onChange={() => toggle(k)} />
                  <span className="cm-nicon" aria-hidden>{NATURE[k].icon}</span>
                  <span><b>{NATURE[k].name}</b><small>{NATURE[k].desc}</small></span>
                </label>
              </li>
            ))}
          </ul>
          <div className="cm-nature-foot">
          <button type="button" className="cm-ghost" onClick={() => setAll(!allOn)}>{allOn ? "Clear all" : "Ask for all six"}</button>
          <div className="cm-year">
            <label htmlFor="cm-year"><b>Look into the future</b><output>{inputs.year === 0 ? "Today" : inputs.year >= 10 ? "In ten years" : `In ${inputs.year} years`}</output></label>
            <input id="cm-year" type="range" min={0} max={10} step={1} value={inputs.year} onChange={(e) => set("year", Number(e.target.value))} />
            <div className="cm-range-ends"><span>Today</span><span>10 years</span></div>
            <p className="cm-hint">Trees grow and habitats recover, but only if you asked for them.</p>
          </div>
          </div>
        </aside>

        <Impacts a={a} />
      </main>

      <section className="cm-ask" aria-labelledby="cm-ask-h">
        <h2 id="cm-ask-h">Questions to take to the meeting</h2>
        <p className="cm-hint">Tailored to the picture above. Change the settings and the questions change.</p>
        <ul>{questions.map((q) => <li key={q}>{q}</li>)}</ul>
      </section>

      <footer className="cm-method">
        <details>
          <summary>How we worked this out</summary>
          <p>
            This is an <b>illustrative model</b>, not a forecast for any real site. The fictional neighbourhood and its impact calculations come from the AquaSite landscape prototype (a Johor-inspired catchment). The everyday comparisons use these assumptions:
          </p>
          <ul>
            <li>A household uses about {Math.round(HOUSEHOLD_WATER_M3)} m³ of water a year: {ASSUMPTIONS.litresPerPersonPerDay} litres per person per day (the average the national water regulator, SPAN, reports for Malaysia) × {ASSUMPTIONS.peoplePerHousehold} people.</li>
            <li>A household uses about {ASSUMPTIONS.householdElectricityMWh} MWh of electricity a year.</li>
            <li>An Olympic swimming pool holds {ASSUMPTIONS.olympicPoolM3.toLocaleString("en-US")} m³. A football pitch is about {ASSUMPTIONS.footballPitchHa} hectares.</li>
            <li>&ldquo;Your neighbourhood&rdquo; is about {a.households} households. Sizes stand for roughly {20}, {50} and {120} megawatts of computing load.</li>
            <li>Noise above {ASSUMPTIONS.noiseThresholdDb} dB at a home (about a normal conversation) is treated as disturbing. Species counts are a rough habitat measure, not a wildlife survey.</li>
          </ul>
        </details>
      </footer>
    </div>
  );
}
