"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from "react";
import { presetFor } from "@/lib/scenario/defaults";
import type { CoolingTechnology, NearbyFeature, Site } from "@/lib/scenario/schema";
import { initialState } from "./convert";
import type { AdvancedText, AppState, CoreNumericKey } from "./types";

const STORAGE_KEY = "aquasite.planner.v1";

type Action =
  | { type: "setSite"; site: Site }
  | { type: "setNearby"; nearby: NearbyFeature[] }
  | { type: "selectSite"; selected: boolean }
  | { type: "toggleLayer"; layer: "water" | "protected" | "datacentre" }
  | { type: "setOffline"; offline: boolean }
  | { type: "setCore"; key: CoreNumericKey; value: string }
  | { type: "setCooling"; cooling: CoolingTechnology }
  | { type: "applyPreset" }
  | { type: "setUtilisation"; value: string }
  | { type: "setAdvanced"; path: string; value: string | boolean }
  | { type: "toggleAdvanced"; open?: boolean }
  | { type: "markHandoff"; at: string }
  | { type: "reset" }
  | { type: "hydrate"; state: AppState };

function setDeep<T>(obj: T, path: string, value: unknown): T {
  const keys = path.split(".");
  const clone = structuredClone(obj) as Record<string, unknown>;
  let cur = clone;
  for (let i = 0; i < keys.length - 1; i++) cur = cur[keys[i]] as Record<string, unknown>;
  cur[keys[keys.length - 1]] = value;
  return clone as T;
}

function reducer(s: AppState, a: Action): AppState {
  switch (a.type) {
    case "setSite":
      return { ...s, site: a.site, fieldStatus: { ...s.fieldStatus, site: a.site.placement === "illustrative-candidate" ? "illustrative-default" : "user-edited" } };
    case "selectSite":
      return { ...s, siteSelected: a.selected };
    case "toggleLayer":
      return { ...s, layers: { ...s.layers, [a.layer]: !s.layers[a.layer] } };
    case "setOffline":
      return { ...s, offlineMap: a.offline };
    case "setNearby":
      return { ...s, site: { ...s.site, nearby: a.nearby } };
    case "setCore": {
      const next = { ...s, core: { ...s.core, [a.key]: a.value }, fieldStatus: { ...s.fieldStatus, [`core.${a.key}`]: "user-edited" as const } };
      // Keep the detailed source mix's reclaimed share in sync with the main control.
      if (a.key === "reclaimedSharePct" && s.advanced.mixEnabled) next.advanced = { ...s.advanced, mix: { ...s.advanced.mix, reclaimed: a.value } };
      return next;
    }
    case "setCooling": {
      const p = presetFor(a.cooling);
      if (p.pue === null || p.wueLPerKwh === null) {
        return { ...s, cooling: a.cooling, fieldStatus: { ...s.fieldStatus, "core.coolingTechnology": "user-edited" } };
      }
      return {
        ...s,
        cooling: a.cooling,
        core: { ...s.core, pue: String(p.pue), wueLPerKwh: String(p.wueLPerKwh) },
        fieldStatus: {
          ...s.fieldStatus,
          "core.coolingTechnology": "user-edited",
          "core.pue": "preset-applied",
          "core.wueLPerKwh": "preset-applied",
        },
      };
    }
    case "applyPreset": {
      const p = presetFor(s.cooling);
      if (p.pue == null || p.wueLPerKwh == null) return s;
      return {
        ...s,
        core: { ...s.core, pue: String(p.pue), wueLPerKwh: String(p.wueLPerKwh) },
        fieldStatus: { ...s.fieldStatus, "core.pue": "preset-applied", "core.wueLPerKwh": "preset-applied" },
      };
    }
    case "setUtilisation":
      return { ...s, utilisationPct: a.value, fieldStatus: { ...s.fieldStatus, utilisationPct: "user-edited" } };
    case "setAdvanced": {
      let advanced = setDeep<AdvancedText>(s.advanced, a.path, a.value);
      let core = s.core;
      if (a.path === "mixEnabled" && a.value === true) {
        // Start the detailed mix from the current reclaimed share; other sources stay blank (unspecified) until entered.
        advanced = { ...advanced, mix: { ...advanced.mix, reclaimed: s.core.reclaimedSharePct } };
      }
      if (a.path === "mix.reclaimed" && typeof a.value === "string") core = { ...s.core, reclaimedSharePct: a.value };
      return { ...s, advanced, core };
    }
    case "toggleAdvanced":
      return { ...s, advancedOpen: a.open ?? !s.advancedOpen };
    case "markHandoff":
      return { ...s, lastHandoffAt: a.at };
    case "reset":
      return initialState();
    case "hydrate":
      return a.state;
  }
}

interface Ctx {
  state: AppState;
  hydrated: boolean;
  dispatch: (a: Action) => void;
  reset: () => void;
}
const StoreCtx = createContext<Ctx | null>(null);

export function ScenarioProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const [hydrated, setHydrated] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AppState;
        if (parsed?.site && parsed?.core) dispatch({ type: "hydrate", state: { ...initialState(), ...parsed } });
      }
    } catch {
      /* storage unavailable: run in memory */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state, hydrated]);

  const reset = useCallback(() => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem("aquasite.handoff.v1");
    } catch {
      /* ignore */
    }
    dispatch({ type: "reset" });
    window.dispatchEvent(new CustomEvent("aquasite:reset"));
  }, []);

  const value = useMemo(() => ({ state, hydrated, dispatch, reset }), [state, hydrated, reset]);
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useScenario() {
  const c = useContext(StoreCtx);
  if (!c) throw new Error("useScenario outside ScenarioProvider");
  return c;
}
