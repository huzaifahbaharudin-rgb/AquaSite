"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import ImpactModule from "@/components/impact/ImpactModule";
import { ScenarioHandoffSchema, type ScenarioHandoff } from "@/lib/scenario/schema";

const HANDOFF_KEY = "aquasite.handoff.v1";

export default function ImpactPage() {
  const [handoff, setHandoff] = useState<ScenarioHandoff | null | undefined>(undefined);

  useEffect(() => {
    const load = () => {
      try {
        const raw = sessionStorage.getItem(HANDOFF_KEY);
        const parsed = raw ? ScenarioHandoffSchema.safeParse(JSON.parse(raw)) : null;
        setHandoff(parsed?.success ? parsed.data : null);
      } catch {
        setHandoff(null);
      }
    };
    load();
    window.addEventListener("aquasite:reset", load);
    return () => window.removeEventListener("aquasite:reset", load);
  }, []);

  if (handoff === undefined) return <div className="page-loading">Loading…</div>;
  if (handoff === null)
    return (
      <div className="empty-state">
        <h1>No scenario yet</h1>
        <p><Link href="/">← Return to main screen</Link></p>
        <p>Select a site and configure the data centre, then choose “Continue to Impact”.</p>
        <Link href="/configure" className="btn primary">
          Go to Configure →
        </Link>
      </div>
    );
  return <><ImpactModule handoff={handoff} /></>;
}
