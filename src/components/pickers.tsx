"use client";

import { COLORS, colorOf } from "@/lib/types";

export function EmojiPicker({
  name,
  options,
  value,
  onChange,
  color = "violet",
}: {
  name: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  color?: string;
}) {
  const c = colorOf(color);
  return (
    <div>
      <input type="hidden" name={name} value={value} />
      <div className="flex flex-wrap gap-1.5">
        {options.map((e) => (
          <button
            type="button"
            key={e}
            onClick={() => onChange(e)}
            aria-label={e}
            aria-pressed={value === e}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-2xl transition-transform active:scale-90"
            style={
              value === e
                ? { background: c.soft, boxShadow: `inset 0 0 0 2px ${c.bg}` }
                : { background: "var(--bg)" }
            }
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ColorPicker({
  name,
  value,
  onChange,
  taken,
}: {
  name: string;
  value: string;
  onChange: (v: string) => void;
  /** Partnerin kullandığı renk: seçilemez */
  taken?: string;
}) {
  return (
    <div>
      <div className="flex gap-2.5">
        <input type="hidden" name={name} value={value} />
        {Object.entries(COLORS).map(([key, c]) => {
          const isTaken = key === taken;
          return (
            <button
              type="button"
              key={key}
              onClick={() => !isTaken && onChange(key)}
              disabled={isTaken}
              aria-label={isTaken ? `${c.name} (partnerinin rengi)` : c.name}
              aria-pressed={value === key}
              title={isTaken ? "Partnerinin rengi" : c.name}
              className="relative flex h-9 w-9 items-center justify-center rounded-full text-xs text-white transition-transform active:scale-90 disabled:cursor-not-allowed"
              style={{
                background: c.bg,
                opacity: isTaken ? 0.25 : 1,
                boxShadow: value === key ? `0 0 0 3px var(--surface), 0 0 0 5px ${c.bg}` : "none",
              }}
            >
              {isTaken ? "✕" : value === key ? "✓" : ""}
            </button>
          );
        })}
      </div>
      {taken && taken in COLORS && (
        <p className="mt-1.5 text-xs font-semibold text-muted">
          Soluk renk partnerinin; herkesin rengi farklı olmalı.
        </p>
      )}
    </div>
  );
}

/** Seçenek düğmeleri (radyo gibi) */
export function Segmented<T extends string>({
  name,
  value,
  onChange,
  options,
}: {
  name: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: React.ReactNode }[];
}) {
  return (
    <div className="flex gap-1.5 rounded-2xl bg-line/60 p-1.5">
      <input type="hidden" name={name} value={value} />
      {options.map((o) => (
        <button
          type="button"
          key={o.value}
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={`flex-1 rounded-xl px-2 py-2 text-sm font-extrabold transition-all ${
            value === o.value ? "bg-surface text-brand shadow-[0_3px_0_var(--line)]" : "text-muted"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
