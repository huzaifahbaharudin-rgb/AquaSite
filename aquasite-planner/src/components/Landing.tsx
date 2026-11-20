import Link from "next/link";
import "./landing.css";

export default function Landing() {
  return (
    <div className="ls-root">
      <h1 className="ls-title">
        <span>Data centre planning, made transparent</span>
        <small>Choose how you would like to explore.</small>
      </h1>

      <section className="ls-half ls-dev" aria-labelledby="ls-dev-h">
        <svg className="ls-art" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden>
          <g fill="none" stroke="#28c2d8" strokeOpacity=".22" strokeWidth="1.2">
            {[0, 1, 2, 3, 4, 5].map((i) => <path key={i} d={`M-10 ${60 + i * 42} C 90 ${20 + i * 40}, 200 ${110 + i * 38}, 410 ${50 + i * 44}`} />)}
          </g>
          <path d="M60 190 C 120 150, 180 230, 250 170 S 340 140, 390 180" fill="none" stroke="#38a8ff" strokeOpacity=".5" strokeWidth="6" strokeLinecap="round" />
          <g transform="translate(262 92)">
            <path d="M0 52 C -22 22 -26 6 -26 -4 a26 26 0 1 1 52 0 C 26 6 22 22 0 52Z" fill="#f4b860" />
            <circle cx="0" cy="-4" r="9" fill="#07131d" />
          </g>
        </svg>
        <div className="ls-copy">
          <p className="ls-for">Planning a site</p>
          <h2 id="ls-dev-h">Pick a location, size the facility, see its water footprint.</h2>
          <p>Explore protected areas, rivers and existing data centres on the map, then configure cooling and water strategy.</p>
          <Link href="/site" className="ls-btn ls-btn-dev">For developers</Link>
        <a href="/qa" className="ls-btn" style={{marginTop:12,display:"inline-block"}}>Public Q&A register ↗</a>
        </div>
      </section>

      <section className="ls-half ls-com" aria-labelledby="ls-com-h">
        <svg className="ls-art" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden>
          <path d="M0 210 Q90 120 190 190 T400 160 V300 H0Z" fill="#c4dfc9" />
          <path d="M0 250 Q120 190 240 235 T400 220 V300 H0Z" fill="#a6d08a" />
          <path d="M150 300 C 170 250, 130 240, 160 205" fill="none" stroke="#8fd0dc" strokeWidth="26" strokeLinecap="round" opacity=".85" />
          {[270, 310, 350].map((x, i) => (
            <g key={x} transform={`translate(${x} ${222 + (i % 2) * 14})`}>
              <rect x="-16" y="-18" width="32" height="18" rx="2" fill="#fffef9" />
              <path d="M-20 -18 L0 -34 L20 -18Z" fill="#ce654b" />
            </g>
          ))}
          <g transform="translate(70 214)">{[0, 1, 2].map((k) => <g key={k} transform={`translate(${k * 26} ${(k % 2) * 10})`}><rect x="-2" y="-8" width="4" height="12" fill="#7a5a3c" /><circle cy="-18" r="14" fill={["#2f8f5b", "#3aa066", "#287a4f"][k]} /></g>)}</g>
          <circle cx="330" cy="60" r="22" fill="#fff0a8" />
        </svg>
        <div className="ls-copy">
          <p className="ls-for">Living nearby</p>
          <h2 id="ls-com-h">See what a data centre could mean for your neighbourhood.</h2>
          <p>Water, power, heat, noise and wildlife, shown in everyday terms: households, swimming pools, football pitches.</p>
          <Link href="/communities" className="ls-btn ls-btn-com">For communities</Link>
        <a href="/qa" className="ls-btn" style={{marginTop:12,display:"inline-block"}}>Public Q&A register ↗</a>
        </div>
      </section>
    </div>
  );
}
