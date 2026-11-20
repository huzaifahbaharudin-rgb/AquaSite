export const fmtInt = (v: number) => (Number.isFinite(v) ? Math.round(v).toLocaleString("en-US") : "—");

/** Compact volume: 1,234,567 m³ → "1.23 million". */
export function fmtBig(v: number) {
  if (!Number.isFinite(v)) return "—";
  const a = Math.abs(v);
  if (a >= 1e6) return `${(v / 1e6).toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 })} million`;
  return fmtInt(v);
}

export function pctChange(now: number, base: number) {
  if (!Number.isFinite(now) || !Number.isFinite(base)) return null;
  if (base === 0) return now === 0 ? 0 : null;
  return ((now - base) / base) * 100;
}
