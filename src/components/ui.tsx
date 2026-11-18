import { colorOf } from "@/lib/types";

export function Avatar({
  emoji,
  color,
  size = 44,
  ring = false,
}: {
  emoji: string;
  color: string;
  size?: number;
  ring?: boolean;
}) {
  const c = colorOf(color);
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        background: c.soft,
        fontSize: size * 0.55,
        boxShadow: ring ? `0 0 0 3px var(--surface), 0 0 0 5px ${c.bg}` : `inset 0 0 0 1.5px color-mix(in srgb, ${c.bg} 25%, transparent)`,
      }}
      aria-hidden
    >
      {emoji}
    </span>
  );
}

export function ProgressBar({
  value,
  max,
  color = "var(--brand)",
  height = 10,
}: {
  value: number;
  max: number;
  color?: string;
  height?: number;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div
      className="w-full overflow-hidden rounded-full bg-line"
      style={{ height }}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemax={max}
    >
      <div
        className="relative h-full rounded-full transition-[width] duration-700 ease-out"
        style={{ width: `${pct}%`, background: color, minWidth: pct > 0 ? height : 0 }}
      >
        <span
          className="absolute top-[3px] right-2 left-2 rounded-full bg-surface/35"
          style={{ height: Math.max(2, height / 4) }}
        />
      </div>
    </div>
  );
}

export function Flame({ streak, lit, size = 22 }: { streak: number; lit: boolean; size?: number }) {
  return (
    <span className="inline-flex items-center gap-1 font-black" style={{ color: lit ? "var(--fire)" : "var(--muted)" }}>
      <span className={lit ? "animate-flicker" : "grayscale"} style={{ fontSize: size, display: "inline-block" }}>
        🔥
      </span>
      <span style={{ fontSize: size * 0.8 }}>{streak}</span>
    </span>
  );
}

export function CarrotChip({ n, faded = false }: { n: number; faded?: boolean }) {
  return (
    <span className={`chip ${faded ? "bg-line text-muted" : "bg-xp-soft text-xp-ink"}`} aria-label={`${n} havuç`}>
      🥕 {n}
    </span>
  );
}

/** "🥕 120" şeklinde havuç miktarı */
export function Carrots({ n, className = "" }: { n: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 ${className}`} aria-label={`${n} havuç`}>
      <span aria-hidden>🥕</span>
      {n}
    </span>
  );
}

export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mt-6 mb-2 flex items-end justify-between px-1">
      <h2 className="text-lg font-black">{children}</h2>
      {right}
    </div>
  );
}

export function Empty({ emoji, children }: { emoji: string; children: React.ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-1 px-4 py-6 text-center text-muted">
      <span className="text-4xl">{emoji}</span>
      <div className="font-bold">{children}</div>
    </div>
  );
}
