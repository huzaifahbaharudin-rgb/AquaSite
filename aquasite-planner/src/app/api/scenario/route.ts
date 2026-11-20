/**
 * POST /api/scenario
 *   Body: ScenarioRequest (+ optional `fieldStatus`) — see src/lib/scenario/schema.ts
 *   200:  ScenarioHandoff (validated inputs + computed metrics + provenance)
 *   422:  { errors: [{ path, message }] }
 *
 * GET /api/scenario → JSON Schema of the request and the handoff, for non-TypeScript teammates.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { buildHandoff } from "@/lib/scenario/build";
import { ScenarioHandoffSchema, ScenarioRequestSchema, SCHEMA_VERSION } from "@/lib/scenario/schema";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ errors: [{ path: "", message: "Body must be JSON" }] }, { status: 400 });
  }
  const { fieldStatus, ...scenario } = (body ?? {}) as Record<string, unknown>;
  const result = buildHandoff(scenario as never, (fieldStatus as Record<string, never>) ?? {});
  if (!result.ok) return NextResponse.json({ errors: result.errors }, { status: 422 });
  return NextResponse.json(result.handoff);
}

export async function GET() {
  return NextResponse.json({
    schemaVersion: SCHEMA_VERSION,
    request: z.toJSONSchema(ScenarioRequestSchema, { io: "input", unrepresentable: "any" }),
    handoff: z.toJSONSchema(ScenarioHandoffSchema, { unrepresentable: "any" }),
  });
}
