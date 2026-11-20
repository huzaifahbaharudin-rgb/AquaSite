"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useScenario } from "@/lib/state/store";

const STEPS = [
  { href: "/site", n: 1, label: "Select a site" },
  { href: "/configure", n: 2, label: "Configure data centre" },
  { href: "/impact", n: 3, label: "Impact" },
];

export default function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { state, reset } = useScenario();
  const [notice, setNotice] = useState<string | null>(null);
  const idx = STEPS.findIndex((s) => path?.startsWith(s.href));
  // The entry screen and the community awareness tool bring their own look, so skip the developer top bar.
  const bare = path === "/" || path === "/qa" || !!path?.startsWith("/communities");

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 2200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  if (bare) return <div className="shell"><main className="main">{children}</main></div>;

  return (
    <div className="shell">
      <header className="topbar">
        <Link href="/" className="brand" aria-label="AquaSite home: choose a view">
          <span className="brand-mark" aria-hidden>
            <svg viewBox="0 0 24 24" width="22" height="22">
              <path d="M12 2.5c3.6 4.4 6.5 8 6.5 11.3A6.5 6.5 0 0 1 5.5 13.8C5.5 10.5 8.4 6.9 12 2.5Z" fill="currentColor" />
              <path d="M8.7 14.4c.7 1.8 2 2.8 4 3.1" fill="none" stroke="#08202b" strokeLinecap="round" strokeWidth="1.8" />
            </svg>
          </span>
          <span>
            <b>AquaSite</b>
            <small>Water-resilient data centre planning</small>
          </span>
        </Link>
        <nav className="stepper" aria-label="Steps">
          {STEPS.map((s, i) => {
            const complete = i === 0 ? state.siteSelected || idx > 0 : i === 1 ? !!state.lastHandoffAt || idx > 1 : false;
            const locked = i === 2 && !state.lastHandoffAt && idx !== 2;
            const classes = `step ${i === idx ? "current" : ""} ${complete ? "done" : ""} ${locked ? "locked" : ""}`;
            const content = (
              <>
                <span className="step-n">{complete ? "✓" : s.n}</span>
                <span className="step-l">{s.label}</span>
              </>
            );
            return locked ? (
              <span key={s.href} className={classes} aria-disabled="true" title="Complete the configuration to unlock Impact">
                {content}
              </span>
            ) : (
              <Link key={s.href} href={s.href} className={classes} aria-current={i === idx ? "step" : undefined}>
                {content}
              </Link>
            );
          })}
        </nav>
        <div className="topbar-right">
          <span className="location-pill">
            <span aria-hidden>●</span> Johor, Malaysia
          </span>
          <Link href="/" className="btn ghost small">← Main screen</Link>
          <Link href="/qa" className="btn ghost small">Public Q&amp;A</Link>
          <button
            type="button"
            className="btn ghost small"
            onClick={() => {
              reset();
              setNotice("Demo reset to the illustrative Johor scenario");
              router.push("/site");
            }}
          >
            Reset demo
          </button>
        </div>
      </header>
      <main className="main">{children}</main>
      {notice && <div className="toast" role="status">{notice}</div>}
    </div>
  );
}
