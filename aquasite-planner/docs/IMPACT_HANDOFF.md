# Impact handoff — contract between Steps 1–2 and Impact

## Where things live

| What | Path |
|---|---|
| Shared schema (Zod, single source of truth) | `src/lib/scenario/schema.ts` → `ScenarioRequestSchema`, `ScenarioHandoffSchema` |
| The only calculation code | `src/lib/scenario/calc.ts` |
| Validate + calculate + package | `src/lib/scenario/build.ts` → `buildHandoff()` |
| API | `POST /api/scenario` (`src/app/api/scenario/route.ts`) |
| JSON Schema for non-TS code (e.g. the Python/Streamlit model) | `GET /api/scenario` |
| **Where the Impact UI plugs in** | `src/components/impact/ImpactModule.tsx`: receives `{ handoff: ScenarioHandoff }` |

**Continue to Impact** posts the scenario to the API. It then stores the validated response in `sessionStorage["aquasite.handoff.v1"]` and opens `/impact`, which renders `ImpactModule`. Replace the body of `ImpactModule` with your analysis. The current body is a handoff preview.

## Payload (`ScenarioHandoff`, schemaVersion `aquasite.scenario.v1`)

```jsonc
{
  "schemaVersion": "aquasite.scenario.v1",
  "createdAt": "2026-11-17T…Z",
  "site": { "name", "lat", "lon", "placement": "illustrative-candidate | user-placed", "region",
            "nearby": [{ "id", "name", "layer": "water|protected|datacentre", "kind", "distanceKm", "source", "precision" }],
            "note": "Mapped proximity is geographic context only…" },
  "core": { "itCapacityMw", "coolingTechnology", "pue", "wueLPerKwh", "reclaimedSharePct", "lifespanYears", "gridWaterIntensityM3PerMwh" },
  "utilisationPct": 75,
  "startYear": 2027,
  "advanced": { "futureWue", "futureReclaimed", "demandGrowth", "utilityExpansion", "droughtShock", "peakToAverageFactor", "sourceMix" },  // each null = not set
  "metrics": {
    "annualItElectricity":       { "value", "unit": "MWh/yr", "scope": "facility-it" },
    "annualFacilityElectricity": { "value", "unit": "MWh/yr", "scope": "facility-total" },
    "annualOnsiteWater":         { "value", "unit": "m3/yr",  "scope": "on-site" },
    "annualReclaimedSupplied":   { "value", "unit": "m3/yr",  "scope": "on-site-reclaimed" },
    "annualNonReclaimedOnsite":  { "value", "unit": "m3/yr",  "scope": "on-site-non-reclaimed" },
    "annualGridWater":           { "value", "unit": "m3/yr",  "scope": "off-site-power-generation" },
    "averageDailyOnsiteWater":   { "value", "unit": "m3/day", "scope": "on-site" },
    "peakDayOnsiteWater":        null | { "value", "unit": "m3/day", "scope": "on-site" },
    "lifetimeOnsiteWater":       { "value", "unit": "m3", "scope": "on-site" },
    "sourceAllocation":          null | { "potable", "reclaimed", "rainwater", "seawater" },   // m3/yr each
    "trajectory": [{ "year", "wueLPerKwh", "reclaimedSharePct", "onsiteWaterM3", "reclaimedSuppliedM3", "gridWaterM3" }],
    "localContext": null | { "baselineDomesticDemandM3PerDay", "domesticDemandBasis", "baselineIndustrialDemandM3PerDay",
                             "droughtSupplyReductionM3PerDay", "utilityExpansionM3PerDay" }
  },
  "provenance": { "scenarioLabel", "illustrative": true, "notes": [...],
                  "fieldStatus": { "core.wueLPerKwh": "preset-applied", "advanced.sourceMix": "unset", … } }
}
```

## Rules for using it

1. Use **`metrics.annualOnsiteWater`** (scope `on-site`) for the local water balance, household equivalents and source allocation.
2. **`annualGridWater` is off-site** (power generation). Report it separately and never add it to the local balance.
3. `null` means **unknown**, not zero. Show it as "not set".
4. The reclaimed share changes the **source** of the on-site volume, not its size. Potable draw is known only if `sourceMix` is set (`sourceAllocation.potable`). Otherwise the non-reclaimed volume is "source unspecified".
5. `peakDayOnsiteWater` is a daily peak. It is not included in annual totals.
6. `trajectory` applies the optional future WUE and reclaimed targets (linear to the target year, then held). Use it for the lifespan forecast.
7. If `provenance.illustrative` is `true`, label Impact outputs as illustrative.

## Calling the API directly

```bash
curl -s -X POST http://localhost:3000/api/scenario -H 'content-type: application/json' -d '{
  "site": {"name":"Test","lat":1.4205,"lon":103.6005,"placement":"illustrative-candidate"},
  "core": {"itCapacityMw":100,"coolingTechnology":"custom","pue":1.25,"wueLPerKwh":0.3,
           "reclaimedSharePct":0,"lifespanYears":10,"gridWaterIntensityM3PerMwh":0.4},
  "utilisationPct": 75,
  "advanced": {"futureWue":null,"futureReclaimed":null,"demandGrowth":null,"utilityExpansion":null,
               "droughtShock":null,"peakToAverageFactor":null,"sourceMix":null}
}'
```

Invalid input returns `422 { "errors": [{ "path": "core.pue", "message": "…" }] }`.

From Python (e.g. the existing Streamlit model):

```python
import requests
h = requests.post("http://localhost:3000/api/scenario", json=scenario).json()
onsite_m3_per_day = h["metrics"]["averageDailyOnsiteWater"]["value"]
```
