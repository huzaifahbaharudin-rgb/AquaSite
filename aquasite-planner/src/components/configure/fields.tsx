"use client";
import type { ReactNode } from "react";

interface NumberFieldProps {
  id: string;
  label: ReactNode;
  unit?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  help?: ReactNode;
  step?: string;
  min?: number;
  max?: number;
  placeholder?: string;
  badge?: ReactNode;
  compact?: boolean;
  inputMode?: "decimal" | "numeric";
}

export function NumberField({ id, label, unit, value, onChange, error, help, step = "any", min, max, placeholder, badge, compact, inputMode = "decimal" }: NumberFieldProps) {
  return (
    <div className={`field ${error ? "has-error" : ""} ${compact ? "compact" : ""}`}>
      <label htmlFor={id} className="field-label">
        <span>{label}</span>
        {badge}
      </label>
      <div className="input-unit">
        <input
          id={id}
          type="number"
          inputMode={inputMode}
          step={step}
          min={min}
          max={max}
          value={value}
          placeholder={placeholder ?? "not set"}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error}
          aria-describedby={`${id}-help ${id}-err`}
        />
        {unit && <span className="unit">{unit}</span>}
      </div>
      {help && (
        <div id={`${id}-help`} className="field-help">
          {help}
        </div>
      )}
      {error && (
        <div id={`${id}-err`} className="field-error" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}

export function TextField({ id, label, value, onChange, error, placeholder, help }: { id: string; label: ReactNode; value: string; onChange: (v: string) => void; error?: string; placeholder?: string; help?: ReactNode }) {
  return (
    <div className={`field compact ${error ? "has-error" : ""}`}>
      <label htmlFor={id} className="field-label">
        <span>{label}</span>
      </label>
      <input id={id} type="text" value={value} placeholder={placeholder ?? "not set"} onChange={(e) => onChange(e.target.value)} aria-invalid={!!error} />
      {help && <div className="field-help">{help}</div>}
      {error && (
        <div className="field-error" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}

export function StatusBadge({ status }: { status?: string }) {
  if (!status || status === "user-edited") return status === "user-edited" ? <span className="fs-badge edited">edited</span> : null;
  if (status === "preset-applied") return <span className="fs-badge preset">preset</span>;
  if (status === "illustrative-default") return <span className="fs-badge illus">illustrative</span>;
  return null;
}
