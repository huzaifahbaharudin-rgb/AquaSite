"use client";
import { useMemo } from "react";
import { clamp, SOUNDS, type Assessment, type CommunityInputs } from "@/lib/communities/model";

/** Tiny deterministic RNG so server and client draw the same forest. */
function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const mix = (a: string, b: string, t: number) => {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * clamp(t))).join(",")})`;
};

const W = { small: 120, medium: 180, large: 260 } as const;
const H = { small: 66, medium: 88, large: 118 } as const;
const DC_X = { close: 760, near: 640, far: 270 } as const;
const GROUND = 480; // y where buildings stand
const RIVER_X = (y: number) => 480 - ((y - 330) / 270) * 50;
const HOMES_LEFT = 950;

function Tree({ x, y, s = 1, tone = 0 }: { x: number; y: number; s?: number; tone?: number }) {
  const cols = ["#2f8f5b", "#3aa066", "#287a4f", "#4fb36f"];
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="-2.5" y="-6" width="5" height="16" rx="2" fill="#7a5a3c" />
      <circle cx="0" cy="-20" r="15" fill={cols[tone % 4]} />
      <circle cx="-9" cy="-12" r="10" fill={cols[(tone + 1) % 4]} />
      <circle cx="9" cy="-12" r="10" fill={cols[(tone + 2) % 4]} />
    </g>
  );
}

function House({ x, y, s, warm }: { x: number; y: number; s: number; warm: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="-22" y="-26" width="44" height="26" rx="2" fill={mix("#fffef9", "#f6a66a", warm)} stroke="#d9d4c3" />
      <path d="M-27 -26 L0 -46 L27 -26 Z" fill={mix("#ce654b", "#a63a22", warm)} />
      <rect x="-14" y="-18" width="9" height="9" rx="1.5" fill="#bcd9e6" />
      <rect x="5" y="-18" width="9" height="18" rx="1.5" fill="#8a6a4a" />
      {warm > 0.45 && <circle cx="0" cy="-54" r="4.5" fill="#f0873a" className="cm-anim cm-pulse" />}
    </g>
  );
}

export default function Scene({ inputs, a }: { inputs: CommunityInputs; a: Assessment }) {
  const { size, cooling, waterSource, distance, nature, year } = inputs;
  const age = clamp(year / 10);
  const w = W[size], h = H[size], dcX = DC_X[distance];
  const left = dcX - w / 2, right = dcX + w / 2, top = GROUND - h;
  const reduce = a.world;

  /* forest layout, cleared where the building stands */
  const forest = useMemo(() => {
    const r = rng(7);
    return Array.from({ length: 58 }, () => ({ x: 8 + r() * 330, y: 372 + r() * 150, tone: Math.floor(r() * 4) })).sort((p, q) => p.y - q.y);
  }, []);
  const cleared = (x: number) => x > left - 26 && x < right + 26;

  /* river */
  const levelF = 0.55 + 0.45 * a.world.riverLevel;
  const hw = (y: number, f = 1) => (9 + (y - 330) * 0.2) * f;
  const edge = (f: number, sgn: number) => [330, 450, 600].map((y) => [RIVER_X(y) + sgn * hw(y, f), y]);
  const riverPath = (f: number) => {
    const L = edge(f, -1), R = edge(f, 1);
    return `M${L[0][0]} ${L[0][1]} Q${L[1][0] - 10} ${L[1][1]} ${L[2][0]} ${L[2][1]} L${R[2][0]} ${R[2][1]} Q${R[1][0] - 10} ${R[1][1]} ${R[0][0]} ${R[0][1]} Z`;
  };
  const water = mix("#7fcbe0", "#8c9a56", (1 - reduce.quality / 100) * 0.8);
  const intakeY = 500;
  const dcRightOfRiver = dcX > 480;
  const pipeFrom = dcRightOfRiver ? RIVER_X(intakeY) + hw(intakeY, 1) : right;
  const pipeTo = dcRightOfRiver ? left : RIVER_X(intakeY) - hw(intakeY, 1);
  const recycled = waterSource === "recycled" || nature.recycled;
  const pipeW = 3 + 9 * clamp(reduce.withdrawal / 1.5e6);

  /* heat on houses */
  const rows = [{ y: 420, s: 0.82 }, { y: 462, s: 0.92 }, { y: 506, s: 1.02 }];
  const cols = [HOMES_LEFT + 20, HOMES_LEFT + 76, HOMES_LEFT + 132, HOMES_LEFT + 188];
  const tempAt = (hx: number) => reduce.peakTemp * Math.exp(-((hx - cols[0]) * 2.34) / 800);
  const heatOp = clamp(reduce.peakTemp / 3) * 0.5;

  /* noise arcs */
  const arcs = 2 + a.noise.level;
  const ox = right, oy = top + h * 0.45;

  /* steam */
  const towers = size === "small" ? 2 : size === "medium" ? 3 : 5;
  const steam = cooling === "evaporative" ? 1 : cooling === "hybrid" ? 0.45 : 0;
  const birds = Math.max(1, Math.round((reduce.species / 32) * 5));
  const beltX = distance === "far" ? 650 : Math.min(right + 34, HOMES_LEFT - 40);
  const beltYs = Array.from({ length: 7 }, (_, i) => top - 6 + i * 26);
  const sound = SOUNDS[Math.min(a.noise.level, 4)];

  return (
    <svg className="cm-scene" viewBox="0 0 1200 620" role="img" aria-label={`Illustration of a ${size} ${cooling} data centre ${distance === "far" ? "across the valley from" : distance === "near" ? "a short walk from" : "right next to"} a village, with a river and forest. Nearest homes would hear ${sound.name}.`}>
      <defs>
        <linearGradient id="cm-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#cfe8e6" /><stop offset="1" stopColor="#eaf4dc" /></linearGradient>
        <linearGradient id="cm-ground" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#d3e8b8" /><stop offset="1" stopColor="#b0d684" /></linearGradient>
        <radialGradient id="cm-heat"><stop offset="0" stopColor="#ff8a3d" stopOpacity={heatOp} /><stop offset="1" stopColor="#ff8a3d" stopOpacity="0" /></radialGradient>
        <radialGradient id="cm-sun"><stop offset="0" stopColor="#fff6c9" /><stop offset="1" stopColor="#fff6c9" stopOpacity="0" /></radialGradient>
      </defs>

      <rect width="1200" height="620" fill="url(#cm-sky)" />
      <circle cx="1040" cy="92" r="90" fill="url(#cm-sun)" />
      <circle cx="1040" cy="92" r="26" fill="#fff0a8" />
      <path d="M0 300 Q140 230 300 290 T600 280 T900 270 T1200 285 V340 H0Z" fill="#b9d8c1" />
      <path d="M0 330 Q200 280 380 325 T760 318 T1200 322 V360 H0Z" fill="#a3cdae" />
      <rect y="330" width="1200" height="290" fill="url(#cm-ground)" />

      {/* wildlife corridor */}
      {nature.corridor && (
        <g>
          <path d="M230 352 C 380 330, 560 330, 720 352" fill="none" stroke="#2f8f5b" strokeWidth="3" strokeDasharray="2 9" strokeLinecap="round" />
          {[260, 330, 400, 470, 540, 610, 680].map((x, i) => <Tree key={x} x={x} y={366 + Math.sin(i) * 4} s={0.5 + 0.3 * age} tone={i} />)}
        </g>
      )}

      {/* forest */}
      {forest.map((t, i) => (cleared(t.x) && t.y > top - 40 ? null : <Tree key={i} x={t.x} y={t.y} s={0.62 + ((t.y - 372) / 150) * 0.55} tone={t.tone} />))}
      {distance === "far" && [-1, 0, 1].map((k) => <ellipse key={k} cx={dcX + k * (w / 3)} cy={GROUND + 18} rx={w / 2.2} ry="10" fill="#d9c9a3" opacity=".7" />)}

      {/* road */}
      <path d="M470 560 H1200" stroke="#d8d2bd" strokeWidth="22" />
      <path d="M470 560 H1200" stroke="#fffef9" strokeWidth="2" strokeDasharray="14 14" />

      {/* river (banks show when the level drops) */}
      <path d={riverPath(1.08)} fill="#cdb98f" />
      <path d={riverPath(levelF)} fill={water} />
      {[0, 1, 2, 3].map((k) => <path key={`r${k}`} d={`M${RIVER_X(380 + k * 62) - 8} ${380 + k * 62} q 8 -5 16 0 t 16 0`} fill="none" stroke="#fffef9" strokeWidth="2" opacity=".55" strokeLinecap="round" />)}
      {reduce.quality >= 70 && [0, 1, 2].map((k) => <ellipse key={k} cx={RIVER_X(430 + k * 60) + (k - 1) * 8} cy={430 + k * 60} rx="9" ry="3.6" fill="#fffef9" opacity=".8" />)}
      {reduce.quality < 70 && <ellipse cx={RIVER_X(548)} cy="548" rx={40 + (70 - reduce.quality)} ry="14" fill="#e9923f" opacity={clamp((70 - reduce.quality) / 60) * 0.5} />}

      {/* wetland */}
      {nature.wetland && (
        <g>
          <ellipse cx={RIVER_X(556) - 52} cy="560" rx="50" ry="16" fill="#8fd0dc" />
          {Array.from({ length: 12 }, (_, i) => <path key={i} d={`M${RIVER_X(556) - 88 + i * 8} 566 q2 -${14 + (i % 3) * 5} ${(i % 2 ? 4 : -4)} -${24 + (i % 4) * 4}`} stroke="#2f8f5b" strokeWidth="2.6" fill="none" strokeLinecap="round" />)}
        </g>
      )}

      {/* water supply */}
      {waterSource === "reservoir" ? (
        <g>
          <ellipse cx={dcX} cy="338" rx="92" ry="17" fill="#cdb98f" />
          <ellipse cx={dcX} cy="338" rx={92 * (0.55 + 0.45 * reduce.reservoirLevel)} ry={17 * (0.55 + 0.45 * reduce.reservoirLevel)} fill="#8fd0dc" />
          <path d={`M${dcX} 352 V${top + 8}`} stroke="#3a93c4" strokeWidth={pipeW} className="cm-anim cm-flow" strokeDasharray="10 8" />
        </g>
      ) : (
        <path d={`M${pipeFrom} ${intakeY} H${pipeTo}`} stroke={recycled ? "#2aa88f" : "#3a93c4"} strokeWidth={recycled ? 5 : pipeW} strokeDasharray="10 8" className="cm-anim cm-flow" strokeLinecap="round" />
      )}
      {recycled && (
        <g>
          <rect x={left - 4} y={GROUND - 34} width="30" height="34" rx="6" fill="#2aa88f" />
          <path d={`M${left + 11} ${GROUND - 14} q4 -10 8 0 a4.4 4.4 0 1 1 -8 0Z`} fill="#fff" opacity=".9" />
        </g>
      )}

      {/* heat drifting toward homes */}
      <ellipse cx={right} cy={top + h / 2} rx={HOMES_LEFT + 260 - right} ry="190" fill="url(#cm-heat)" />
      {reduce.peakTemp > 0.4 && [0, 1, 2].map((k) => (
        <path key={k} className="cm-anim cm-shimmer" d={`M${right + 10} ${top + 20 + k * 22} q 30 -14 60 0 t 60 0 t 60 0 t 60 0`} fill="none" stroke="#f0873a" strokeWidth="2.4" strokeLinecap="round" opacity={clamp(reduce.peakTemp / 2.2) * 0.55} />
      ))}

      {/* waste-heat pipe to homes */}
      {nature.reuse && <path d={`M${right} ${GROUND - 12} H${HOMES_LEFT - 8}`} stroke="#f0873a" strokeWidth="6" strokeDasharray="4 8" strokeLinecap="round" className="cm-anim cm-flow" />}

      {/* the data centre */}
      <g>
        <rect x={left} y={top} width={w} height={h} rx="5" fill="#dfe6e3" stroke="#a8b6b0" strokeWidth="2" />
        <rect x={left} y={top} width={w} height="12" rx="5" fill="#b9c6c1" />
        {Array.from({ length: Math.floor(w / 18) }, (_, i) => <rect key={i} x={left + 10 + i * 18} y={top + 24} width="9" height={h - 34} rx="2" fill="#c3cfca" />)}
        <rect x={left + w / 2 - 12} y={GROUND - 24} width="24" height="24" rx="3" fill="#6b7f78" />
        {nature.roof && (
          <g>
            <rect x={left} y={top - 8} width={w} height="14" rx="6" fill="#4fb36f" />
            {Array.from({ length: Math.floor(w / 14) }, (_, i) => <circle key={i} cx={left + 8 + i * 14} cy={top - 10 + (i % 2) * 3} r="5" fill="#2f8f5b" />)}
          </g>
        )}
        {cooling === "air"
          ? Array.from({ length: towers }, (_, i) => (
              <g key={i} transform={`translate(${left + (w / (towers + 1)) * (i + 1)} ${top - 4})`}>
                <circle r="11" fill="#eef2f0" stroke="#8fa098" strokeWidth="2" />
                <g className="cm-anim cm-spin"><path d="M-9 0 H9 M0 -9 V9" stroke="#6b7f78" strokeWidth="3" strokeLinecap="round" /></g>
              </g>
            ))
          : Array.from({ length: towers }, (_, i) => {
              const tx = left + (w / (towers + 1)) * (i + 1);
              return (
                <g key={i}>
                  <path d={`M${tx - 13} ${top} L${tx - 9} ${top - 24} H${tx + 9} L${tx + 13} ${top}Z`} fill="#c3cfca" stroke="#8fa098" strokeWidth="1.5" />
                  {steam > 0 && [0, 1, 2].map((k) => (
                    <circle key={k} className="cm-anim cm-steam" style={{ animationDelay: `${k * 1.1 + i * 0.3}s` }} cx={tx + (k - 1) * 5} cy={top - 34 - k * 12} r={(10 + k * 5) * (0.6 + 0.4 * steam) * (size === "large" ? 1.2 : 1)} fill="#fff" opacity={0.85 * steam} />
                  ))}
                </g>
              );
            })}
      </g>

      {/* sound */}
      {Array.from({ length: arcs }, (_, k) => (
        <path key={k} className="cm-anim cm-sound" style={{ animationDelay: `${k * 0.25}s` }} d={`M${ox + 30 + k * 44} ${oy - 26 - k * 7} A ${40 + k * 44} ${40 + k * 44} 0 0 1 ${ox + 30 + k * 44} ${oy + 26 + k * 7}`} fill="none" stroke="#17745b" strokeWidth="3.2" strokeLinecap="round" opacity={clamp(0.7 - k * 0.1)} />
      ))}

      {/* tree buffer */}
      {nature.trees && beltYs.map((y, i) => <Tree key={i} x={beltX + (i % 2) * 22} y={y + 30} s={0.5 + 0.7 * age} tone={i} />)}

      {/* homes */}
      <rect x={HOMES_LEFT - 22} y="372" width="270" height="200" rx="16" fill="#e7f0cf" opacity=".55" />
      {rows.map((r, ri) => cols.map((cx, ci) => <House key={`${ri}-${ci}`} x={cx + (ri % 2) * 14} y={r.y + 24} s={r.s} warm={clamp(tempAt(cx) / 2.2)} />))}

      {/* birds */}
      {Array.from({ length: birds }, (_, i) => (
        <path key={i} className="cm-anim cm-bird" style={{ animationDelay: `${i * 2.2}s`, animationDuration: `${16 + i * 3}s` }} d={`M0 ${120 + i * 26} q9 -10 18 0 q9 -10 18 0`} fill="none" stroke="#173b35" strokeWidth="2.6" strokeLinecap="round" />
      ))}

      {/* labels */}
      {[
        { x: 100, y: 575, t: "Forest" },
        { x: dcX, y: Math.max(230, top - 100), t: "Data centre" },
        { x: 1065, y: 352, t: "Your neighbourhood" },
        { x: RIVER_X(590) + 62, y: 600, t: "River" },
      ].map((l) => (
        <g key={l.t} transform={`translate(${l.x} ${l.y})`}>
          <rect x={-(l.t.length * 4.6 + 12)} y="-15" width={l.t.length * 9.2 + 24} height="28" rx="14" fill="#fffef9" stroke="#dfe7df" />
          <text textAnchor="middle" y="5" fontSize="15" fontWeight="650" fill="#173b35">{l.t}</text>
        </g>
      ))}
    </svg>
  );
}
