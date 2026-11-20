# AquaSite Planner — For developers (Steps 1 & 2) and For communities

Full-stack prototype for data centre water planning in **Johor, Malaysia**.
Next.js 15 · React 19 · TypeScript · Zod · Leaflet. No API keys, no accounts.

## Run it

```bash
npm run demo        # installs, builds and serves on http://localhost:3000
```

For development with hot reload: `npm install && npm run dev`. Unit tests: `npm test`.
Requires Node 18.18+ (tested on Node 22).

## Two ways in

The start screen (`/`) has two buttons.

| Button | Route | Audience |
|---|---|---|
| **For developers** | `/site` → `/configure` → `/impact` | Site selection, facility configuration and water footprint (the steps below). |
| **For communities** | `/communities` | Awareness tool in the NIMBY look: an illustrated landscape plus six impact tiles in everyday terms (households' worth of water, swimming pools, football pitches, familiar sounds). Pick the data centre's size, cooling, water source and distance from homes, then switch on nature measures and look ten years ahead. It also lists questions to take to a planning meeting. |

The community tool uses a faithful port of the NIMBY prototype's impact model (`src/lib/communities/world.ts`). `src/lib/communities/model.ts` turns its outputs into everyday comparisons. Assumptions (225 L per person per day, 4 people per home, 4.2 MWh per home per year, 2,500 m³ per Olympic pool) are listed in the app under "How we worked this out". Styling is namespaced `cm-*` (`src/components/communities/communities.css`) so it never touches the dark developer UI.

## What it does (developer flow)

| Step | Route | What the judge sees |
|---|---|---|
| 1 · Select a site | `/site` | Dark map of southern Johor with an illustrative candidate pin. Click the pin to select it, or click anywhere to move it. Toggle **water bodies, protected areas, existing data centres**; click any feature for its name, source, precision and straight-line distance. Confirm the location with **Use this site**. |
| 2 · Configure | `/configure` | Guided facility, cooling and water-strategy sections with a live water-profile panel. Choosing a cooling technology immediately applies its illustrative PUE/WUE preset, which remains editable. Secondary inputs stay under one collapsed **Advanced scenario assumptions** section. |
| 3 · Impact (handoff) | `/impact` | The validated scenario returned by `POST /api/scenario`, ready for the team's Impact module. |

State is kept in `sessionStorage`, so Back/Forward preserves the site and every edit. **Reset demo** (top right) restores the starting site and scenario.

The map works offline. All geography is bundled in `public/geo/`. The online basemap uses keyless OpenStreetMap tiles with a local dark filter. If the tiles fail, the app says so and falls back to a dark bundled Natural Earth basemap. **Use offline map** forces this mode.

## Calculations (one implementation: `src/lib/scenario/calc.ts`)

```
annual IT electricity (MWh)       = IT MW × utilisation × 8,760
annual facility electricity (MWh) = IT MWh × PUE
annual on-site water (m³)         = IT MWh × WUE (L/kWh)      # 1 L/kWh = 1 m³/MWh
annual reclaimed-supplied (m³)    = on-site water × reclaimed share
annual grid-related water (m³)    = facility MWh × grid intensity (m³/MWh)
```

Unit check (in `calc.test.ts` and verified against the live API): 100 MW, 75%, PUE 1.25, WUE 0.30, grid 0.40 gives 657,000 MWh IT, 821,250 MWh facility, 197,100 m³ on-site and 328,500 m³ grid-related.

## Geographic data used

| Layer | Features | Source | Coverage / precision |
|---|---|---|---|
| Water bodies | Sungai Lebam, Sungai Layang, Sultan Iskandar and Gunung Pulai reservoirs (outlines); 12 named rivers (Johor, Pulai, Skudai, Tebrau, Danga, Tiram…); 6 dams; 7 water treatment plants | © OpenStreetMap contributors (ODbL), Overpass API extract 16–17 Nov 2026 | Southern Johor bbox 1.25–1.98° N, 103.25–104.30° E. Outlines simplified ~130 m, rivers ~250 m, plants and dams as centroid points |
| Protected areas | Sungai Pulai, Tanjung Piai and Pulau Kukup **Ramsar sites** | Ramsar Sites Information Service (sites 1288, 1289, 1287) | RSIS centre coordinates (±2 km, nearest arc-minute). Sungai Pulai has no bundled boundary; the dashed circle is an equal-area *indicative* extent |
| | Gunung Pulai recreational forest, Pulau Kukup & Tanjung Piai parks, Sedenak & Bukit Hantu forest reserves, Endau-Kota Tinggi, Johor Elephant Sanctuary, Panti | OpenStreetMap (as above) | Boundaries simplified ~200 m. Not a complete inventory of Johor's protected areas |
| Existing data centres | Data-centre buildings near Sedenak interchange (14 OSM buildings), YTL Green Data Center Park, Gp3 Data Center | OpenStreetMap | Building / site centroids (±0.5 km) |
| | Computility/ZData (Gelang Patah), DayOne (Kempas), Bridge Data Centres (Ulu Tiram) | Bernama, 23 Jul 2026; Business Times via ISIS Malaysia, 30 Jan 2026 | **Town-level approximate** pins (±3–5 km), drawn dashed |
| Offline basemap | Johor, neighbouring states, Singapore, Riau | Natural Earth 10m admin-1 (public domain) | Coarse coastline |

Raw extracts and the build script are in `data/raw/` and `scripts/build_geo.py` (`npm run geo` rebuilds `public/geo`).
Distances are straight-line distances to the nearest mapped point of each feature, or 0 if the site is inside it. They are **geographic context only**: they do not show a water-supply connection, a permit constraint or an official restriction.

## Illustrative assumptions

- The candidate site (1.4205° N, 103.6005° E, near Nusajaya Tech Park, Iskandar Puteri) is illustrative, not a real proposal.
- Starting scenario: 40 MW IT, evaporative cooling, PUE 1.25, WUE 1.8 L/kWh, 0% reclaimed, 15 years, grid 0.84 m³/MWh, 75% utilisation.
- Cooling presets are midpoints of commonly cited industry ranges: evaporative 1.25 / 1.8, hybrid 1.30 / 0.9, air-cooled 1.55 / 0.1, direct liquid 1.15 / 0.2 (PUE / WUE). Selecting a technology applies its preset immediately; PUE and WUE can then be edited.
- Grid water intensity 0.84 m³/MWh of facility electricity is an illustrative factor, not a Malaysian grid statistic.
- Every core field carries a status (`illustrative-default`, `preset-applied`, `user-edited`). Unset advanced fields are `null`, never 0.

## For the Impact team

See **`docs/IMPACT_HANDOFF.md`**.
