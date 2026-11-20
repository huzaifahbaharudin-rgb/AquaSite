"use client";
import { about, fractionWords, oneIn, reductionWords, HEAT_WORDS, RIVER_WORDS, SOUNDS, type Assessment, type Tone } from "@/lib/communities/model";
import { clamp } from "@/lib/communities/world";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const TONE_LABEL: Record<Tone, string> = { good: "Light", watch: "Noticeable", high: "Heavy" };

function Tile({ icon, title, tone, toneLabel, big, children, foot, saving }: { icon: string; title: string; tone: Tone; toneLabel?: string; big: string; children: React.ReactNode; foot: string; saving?: string | null }) {
  return (
    <article className="cm-tile">
      <header>
        <span className="cm-tile-icon" aria-hidden>{icon}</span>
        <h3>{title}</h3>
        <span className={`cm-badge ${tone}`}>{toneLabel ?? TONE_LABEL[tone]}</span>
      </header>
      <p className="cm-big">{big}</p>
      <div className="cm-visual">{children}</div>
      <p className="cm-foot">{foot}</p>
      {saving && <p className="cm-saving">Your nature choices make this {saving}.</p>}
    </article>
  );
}

const HouseGlyph = () => (
  <svg viewBox="0 0 24 24" aria-hidden><path d="M3 12 12 4l9 8v8H3z" fill="currentColor" /><rect x="10" y="14" width="4" height="6" fill="#fffef9" /></svg>
);

export default function Impacts({ a }: { a: Assessment }) {
  const w = a.world, b = a.bare;
  const hoods = a.water.neighbourhoods;
  const blocks = Math.min(10, Math.max(1, Math.ceil(hoods)));
  const gridSegs = clamp(Math.round(a.power.gridShare * 10), 1, 10);
  const animals = ["🦜", "🦦", "🐟", "🐸", "🦋", "🐒", "🦎", "🐢"];
  const alive = Math.round((w.species / 32) * animals.length);
  const sound = SOUNDS[a.noise.level];
  const dropWords = a.river.drop < 0.03 ? "The river level barely changes." : `The river runs ${fractionWords(a.river.drop)} lower than usual.`;
  const level = 0.55 + 0.45 * w.riverLevel;

  return (
    <section className="cm-tiles" aria-label="What this would mean for your community">
      <Tile icon="💧" title="Water it drinks" tone={a.water.tone} big={`As much water as ${about(a.water.homes)} households use in a year.`}
        foot={`Enough to fill ${about(a.water.pools)} Olympic swimming pools every year.`} saving={reductionWords(b.withdrawal, w.withdrawal)}>
        <div className="cm-blocks" role="img" aria-label={`${hoods.toFixed(1)} neighbourhoods like yours`}>
          {Array.from({ length: blocks }, (_, i) => (
            <span key={i} className="cm-block" style={{ opacity: i + 1 > hoods ? 0.25 + 0.75 * (hoods - i) : 1 }}><HouseGlyph /></span>
          ))}
          {hoods > 10 && <span className="cm-more">+ more</span>}
        </div>
        <small>Each block is a whole neighbourhood like yours.</small>
      </Tile>

      <Tile icon="⚡" title="Electricity" tone={a.power.tone} big={`As much power as ${about(a.power.homes)} homes.`}
        foot={`That is ${oneIn(a.power.gridShare)} of all the power the local grid can supply.`} saving={reductionWords(b.energy, w.energy)}>
        <div className="cm-segs" role="img" aria-label="Share of the local grid">
          {Array.from({ length: 10 }, (_, i) => <span key={i} className={i < gridSegs ? "on" : ""} />)}
        </div>
        <small>The whole bar is everything the district&apos;s grid can supply.</small>
      </Tile>

      <Tile icon="🌡️" title="Heat on your street" tone={a.heat.tone} big={HEAT_WORDS[a.heat.level]}
        foot={a.heat.homes > 0 ? `${cap(about(a.heat.homes))} homes would feel it.` : "No homes would feel it."} saving={reductionWords(b.avgTemp, w.avgTemp)}>
        <div className="cm-heatrow" role="img" aria-label="Heat fading with distance from the data centre">
          <span className="cm-dc-dot" />
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className="cm-hhouse" style={{ background: `color-mix(in srgb, #f0873a ${Math.round(clamp((w.peakTemp * Math.exp(-i * 0.35)) / 2.2) * 100)}%, #fffef9)` }}><HouseGlyph /></span>
          ))}
        </div>
        <small>Nearest homes on the left, furthest on the right.</small>
      </Tile>

      <Tile icon="🔊" title="Noise at the nearest homes" tone={a.noise.tone} big={`Something like ${sound.name}.`}
        foot={a.noise.homes > 0 ? `${cap(about(a.noise.homes))} homes would hear it at a level that starts to disturb.` : "No homes would hear it at a disturbing level."} saving={reductionWords(Math.pow(10, b.noise / 10), Math.pow(10, w.noise / 10))}>
        <ol className="cm-ladder" aria-label="Everyday sounds, quiet to loud">
          {SOUNDS.map((s, i) => (
            <li key={s.name} className={i === a.noise.level ? "here" : ""}><span aria-hidden>{s.icon}</span><small>{s.name.replace(/^a /, "")}</small></li>
          ))}
        </ol>
      </Tile>

      <Tile icon="🌿" title="Wildlife & land" tone={a.wildlife.tone} toneLabel={a.wildlife.tone === "good" ? "Thriving" : a.wildlife.tone === "watch" ? "Strained" : "Struggling"}
        big={`About ${Math.round((w.species / 32) * 10)} in 10 local species would still be thriving.`}
        foot={`The site covers about ${Math.max(1, Math.round(a.wildlife.pitches))} football pitches of land.`}>
        <div className="cm-animals" role="img" aria-label="Local wildlife">
          {animals.map((e, i) => <span key={e} style={{ opacity: i < alive ? 1 : 0.18, filter: i < alive ? "none" : "grayscale(1)" }}>{e}</span>)}
        </div>
        <small>Faded animals are the ones that would struggle.</small>
      </Tile>

      <Tile icon="🏞️" title="The river downstream" tone={a.river.tone} toneLabel={a.river.tone === "good" ? "Healthy" : a.river.tone === "watch" ? "Watch" : "Stressed"} big={`${RIVER_WORDS[a.river.qualityLevel]}.`}
        foot={dropWords} saving={reductionWords(1 - b.riverLevel + (100 - b.quality) / 100, 1 - w.riverLevel + (100 - w.quality) / 100)}>
        <div className="cm-gauge" role="img" aria-label="River level and clarity">
          <div className="cm-tube"><span style={{ height: `${Math.round(level * 100)}%`, background: `color-mix(in srgb, #a8946a ${Math.round((1 - w.quality / 100) * 100)}%, #8fd0dc)` }} /></div>
          <small>Level and clarity of the river past the outflow.</small>
        </div>
      </Tile>
    </section>
  );
}
