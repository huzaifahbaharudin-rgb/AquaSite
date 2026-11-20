/**
 * Shared "validate → calculate → package" pipeline.
 * The API route and the client both call `buildHandoff`, so there is one implementation.
 */
import { computeMetrics } from "./calc";
import { ASSUMPTION_NOTES, SCENARIO_LABEL } from "./defaults";
import { SCHEMA_VERSION, ScenarioRequestSchema, type ScenarioHandoff, type ScenarioRequestInput } from "./schema";

export type FieldStatus = "illustrative-default" | "user-edited" | "preset-applied" | "unset";

export interface BuildOk {
  ok: true;
  handoff: ScenarioHandoff;
}
export interface BuildErr {
  ok: false;
  errors: { path: string; message: string }[];
}

export function validateScenario(input: unknown) {
  const parsed = ScenarioRequestSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      errors: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    };
  }
  return { ok: true as const, data: parsed.data };
}

export function buildHandoff(input: ScenarioRequestInput, fieldStatus: Record<string, FieldStatus> = {}): BuildOk | BuildErr {
  const v = validateScenario(input);
  if (!v.ok) return v;
  const s = v.data;
  const metrics = computeMetrics(s.core, s.utilisationPct, s.startYear, s.advanced);

  // Every advanced group that is not set is reported as "unset" so Impact can tell unknown from zero.
  const status: Record<string, FieldStatus> = { ...fieldStatus };
  for (const [k, val] of Object.entries(s.advanced)) {
    status[`advanced.${k}`] = val === null ? "unset" : (status[`advanced.${k}`] ?? "user-edited");
  }

  return {
    ok: true,
    handoff: {
      schemaVersion: SCHEMA_VERSION,
      createdAt: new Date().toISOString(),
      site: s.site,
      core: s.core,
      utilisationPct: s.utilisationPct,
      startYear: s.startYear,
      advanced: s.advanced,
      metrics,
      provenance: {
        scenarioLabel: SCENARIO_LABEL,
        illustrative: true,
        notes: [...ASSUMPTION_NOTES, s.site.note],
        fieldStatus: status,
      },
    },
  };
}
