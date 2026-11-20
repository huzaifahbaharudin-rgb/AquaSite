/**
 * AquaSite shared scenario schema (v1).
 *
 * ONE source of truth for field names, units and validation. Used by:
 *   - the Configure form (client-side validation + live preview)
 *   - POST /api/scenario (server-side validation + calculation)
 *   - the Impact module (consumes `ScenarioHandoff`)
 *
 * Unit conventions (encoded in every field name):
 *   Mw = megawatts, Mwh = megawatt-hours, Pct = percent 0–100,
 *   M3 = cubic metres, LPerKwh = litres per kWh, M3PerMwh = cubic metres per MWh.
 *   Note: 1 L/kWh == 1 m³/MWh.
 *
 * Unknown / not-set assumptions are `null` (never 0). Keep them null in the handoff.
 */
import { z } from "zod";

export const SCHEMA_VERSION = "aquasite.scenario.v1" as const;

/* ---------------------------------- Site --------------------------------- */

export const NearbyFeatureSchema = z.object({
  id: z.string(),
  name: z.string(),
  layer: z.enum(["water", "protected", "datacentre"]),
  kind: z.string().describe("e.g. reservoir, river, Ramsar site, data centre campus"),
  distanceKm: z.number().nonnegative().describe("Straight-line distance from the selected site to the nearest mapped point of the feature"),
  source: z.string(),
  precision: z.string().describe("Positional precision of the mapped feature, e.g. 'OSM polygon', 'town-level approximate (±3 km)'"),
});

export const SiteSchema = z.object({
  name: z.string().min(1),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  placement: z.enum(["illustrative-candidate", "user-placed"]),
  region: z.string().default("Johor, Malaysia"),
  nearby: z.array(NearbyFeatureSchema).default([]),
  note: z.string().default(
    "Mapped proximity is geographic context only. It does not imply a water-supply connection, permit constraint or official restriction.",
  ),
});

/* ------------------------------- Core inputs ----------------------------- */

export const COOLING_TECHNOLOGIES = [
  "evaporative",
  "hybrid-adiabatic",
  "air-cooled-chillers",
  "direct-liquid",
  "custom",
] as const;

export const CoreInputsSchema = z.object({
  itCapacityMw: z
    .number({ error: "Enter IT capacity in MW" })
    .gt(0, "IT capacity must be above 0 MW")
    .max(2000, "IT capacity above 2,000 MW is outside the model range"),
  coolingTechnology: z.enum(COOLING_TECHNOLOGIES),
  pue: z
    .number({ error: "Enter a PUE" })
    .min(1.0, "PUE cannot be below 1.0 (facility energy ≥ IT energy)")
    .max(3.0, "PUE above 3.0 is outside the model range"),
  wueLPerKwh: z
    .number({ error: "Enter a WUE" })
    .min(0, "WUE cannot be negative")
    .max(10, "WUE above 10 L/kWh is outside the model range")
    .describe("Current design, on-site water use per kWh of IT electricity (site WUE, ISO/IEC 30134-9 style basis)"),
  reclaimedSharePct: z
    .number({ error: "Enter a share between 0 and 100" })
    .min(0, "Share must be 0–100%")
    .max(100, "Share must be 0–100%")
    .describe("Current design, share of on-site water supplied by reclaimed sources"),
  lifespanYears: z
    .number({ error: "Enter a lifespan in years" })
    .int("Lifespan must be whole years")
    .min(1, "Lifespan must be at least 1 year")
    .max(60, "Lifespan above 60 years is outside the model range"),
  gridWaterIntensityM3PerMwh: z
    .number({ error: "Enter a grid water intensity" })
    .min(0, "Grid water intensity cannot be negative")
    .max(20, "Grid water intensity above 20 m³/MWh is outside the model range")
    .describe("Water used in power generation per MWh of FACILITY electricity"),
});

/* --------------------------- Modelling assumption ------------------------ */

export const UtilisationSchema = z
  .number({ error: "Enter utilisation 1–100%" })
  .gt(0, "Utilisation must be above 0%")
  .max(100, "Utilisation cannot exceed 100%")
  .describe("Average IT utilisation, % of nameplate IT capacity (modelling assumption)");

/* --------------------------- Advanced assumptions ------------------------ */

const year = z.number().int("Use a whole year").min(2025, "Year must be 2025 or later").max(2100, "Year must be 2100 or earlier");
const pct = (label: string) => z.number().min(0, `${label} must be 0–100%`).max(100, `${label} must be 0–100%`);

export const FutureWueSchema = z.object({
  targetWueLPerKwh: z.number().min(0, "Target WUE cannot be negative").max(10),
  targetYear: year,
});

export const FutureReclaimedSchema = z.object({
  targetSharePct: pct("Target share"),
  targetYear: year,
});

export const DemandGrowthSchema = z.object({
  baselinePopulation: z.number().int().nonnegative().nullable(),
  populationGrowthPctPerYear: z.number().min(-10).max(20).nullable(),
  domesticLitresPerPersonPerDay: z.number().positive().max(1000).nullable(),
  baselineDomesticDemandM3PerDay: z.number().nonnegative().nullable().describe("Used only if population × L/person/day is not supplied"),
  baselineIndustrialDemandM3PerDay: z
    .number()
    .nonnegative()
    .nullable()
    .describe("Existing industrial + commercial demand, EXCLUDING the proposed data centre"),
  industrialGrowthPctPerYear: z.number().min(-10).max(30).nullable(),
});

export const UtilityExpansionSchema = z.object({
  additionalCapacityM3PerDay: z.number().positive("Additional capacity must be above 0"),
  inServiceYear: year,
  supplyArea: z.string().nullable(),
  utility: z.string().nullable(),
});

export const DroughtShockSchema = z
  .object({
    supplyReductionPct: pct("Supply reduction"),
    supplyBaselineName: z.string().min(1, "Name the supply baseline the reduction applies to"),
    supplyBaselineM3PerDay: z.number().positive().nullable().describe("Required to express the shock as a volume"),
  });

export const SourceMixSchema = z
  .object({
    potablePct: pct("Potable"),
    reclaimedPct: pct("Reclaimed"),
    rainwaterPct: pct("Rainwater"),
    seawaterPct: pct("Seawater"),
  })
  .superRefine((m, ctx) => {
    const total = m.potablePct + m.reclaimedPct + m.rainwaterPct + m.seawaterPct;
    if (Math.abs(total - 100) > 0.01) {
      ctx.addIssue({
        code: "custom",
        message: `Source mix totals ${+total.toFixed(2)}%. Adjust the shares so they add up to exactly 100%.`,
        path: [],
      });
    }
  });

export const AdvancedInputsSchema = z.object({
  futureWue: FutureWueSchema.nullable(),
  futureReclaimed: FutureReclaimedSchema.nullable(),
  demandGrowth: DemandGrowthSchema.nullable(),
  utilityExpansion: UtilityExpansionSchema.nullable(),
  droughtShock: DroughtShockSchema.nullable(),
  peakToAverageFactor: z.number().min(1, "Peak-to-average factor must be ≥ 1.0").max(5).nullable(),
  sourceMix: SourceMixSchema.nullable(),
});

/* ------------------------------ Request / response ----------------------- */

export const ScenarioRequestSchema = z
  .object({
    site: SiteSchema,
    core: CoreInputsSchema,
    utilisationPct: UtilisationSchema,
    startYear: year.default(2027),
    advanced: AdvancedInputsSchema,
  })
  .superRefine((s, ctx) => {
    // Keep the detailed mix and the main reclaimed control in sync.
    if (s.advanced.sourceMix && Math.abs(s.advanced.sourceMix.reclaimedPct - s.core.reclaimedSharePct) > 0.01) {
      ctx.addIssue({
        code: "custom",
        path: ["advanced", "sourceMix", "reclaimedPct"],
        message: "Reclaimed share in the detailed mix must equal the main Reclaimed water share.",
      });
    }
    const end = s.startYear + s.core.lifespanYears - 1;
    for (const [key, label] of [["futureWue", "Target WUE year"], ["futureReclaimed", "Target reclaimed-share year"]] as const) {
      const v = s.advanced[key];
      if (v && (v.targetYear < s.startYear || v.targetYear > end)) {
        ctx.addIssue({ code: "custom", path: ["advanced", key, "targetYear"], message: `${label} must fall within the model horizon (${s.startYear}–${end}).` });
      }
    }
  });

const metric = (unit: string, scope: string) =>
  z.object({ value: z.number(), unit: z.literal(unit), scope: z.literal(scope) });

export const MetricsSchema = z.object({
  annualItElectricity: metric("MWh/yr", "facility-it"),
  annualFacilityElectricity: metric("MWh/yr", "facility-total"),
  annualOnsiteWater: metric("m3/yr", "on-site").describe("Use THIS volume for local water-balance and source allocation"),
  annualReclaimedSupplied: metric("m3/yr", "on-site-reclaimed"),
  annualNonReclaimedOnsite: metric("m3/yr", "on-site-non-reclaimed").describe("Source unspecified unless sourceAllocation is present"),
  annualGridWater: metric("m3/yr", "off-site-power-generation").describe("Upstream water. Do NOT add to local water balance"),
  averageDailyOnsiteWater: metric("m3/day", "on-site"),
  peakDayOnsiteWater: metric("m3/day", "on-site").nullable().describe("Average daily × peak factor. Not used in annual totals"),
  lifetimeOnsiteWater: metric("m3", "on-site"),
  sourceAllocation: z
    .object({
      potable: metric("m3/yr", "on-site-potable"),
      reclaimed: metric("m3/yr", "on-site-reclaimed"),
      rainwater: metric("m3/yr", "on-site-rainwater"),
      seawater: metric("m3/yr", "on-site-seawater"),
    })
    .nullable(),
  trajectory: z.array(
    z.object({
      year: z.number().int(),
      wueLPerKwh: z.number(),
      reclaimedSharePct: z.number(),
      onsiteWaterM3: z.number(),
      reclaimedSuppliedM3: z.number(),
      gridWaterM3: z.number(),
    }),
  ),
  localContext: z
    .object({
      baselineDomesticDemandM3PerDay: z.number().nullable(),
      domesticDemandBasis: z.string().nullable(),
      baselineIndustrialDemandM3PerDay: z.number().nullable(),
      droughtSupplyReductionM3PerDay: z.number().nullable(),
      utilityExpansionM3PerDay: z.number().nullable(),
    })
    .nullable(),
});

export const ProvenanceSchema = z.object({
  scenarioLabel: z.string(),
  illustrative: z.boolean(),
  notes: z.array(z.string()),
  fieldStatus: z.record(z.string(), z.enum(["illustrative-default", "user-edited", "preset-applied", "unset"])),
});

export const ScenarioHandoffSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  createdAt: z.string(),
  site: SiteSchema,
  core: CoreInputsSchema,
  utilisationPct: z.number(),
  startYear: z.number().int(),
  advanced: AdvancedInputsSchema,
  metrics: MetricsSchema,
  provenance: ProvenanceSchema,
});

export type Site = z.infer<typeof SiteSchema>;
export type NearbyFeature = z.infer<typeof NearbyFeatureSchema>;
export type CoreInputs = z.infer<typeof CoreInputsSchema>;
export type CoolingTechnology = (typeof COOLING_TECHNOLOGIES)[number];
export type AdvancedInputs = z.infer<typeof AdvancedInputsSchema>;
export type ScenarioRequest = z.infer<typeof ScenarioRequestSchema>;
export type ScenarioRequestInput = z.input<typeof ScenarioRequestSchema>;
export type Metrics = z.infer<typeof MetricsSchema>;
export type Provenance = z.infer<typeof ProvenanceSchema>;
export type ScenarioHandoff = z.infer<typeof ScenarioHandoffSchema>;
