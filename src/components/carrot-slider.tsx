"use client";

import { useState } from "react";
import {
  MAX_CARROTS,
  MIN_CARROTS,
  SLIDER_STEPS,
  carrotsToPosition,
  clampCarrots,
  positionToCarrots,
} from "@/lib/carrots";

const QUICK = [5, 10, 25, 50, 100];

/** 1–200 arası havuç seçici: kaydırdıkça adımı büyüyen çubuk + sayı kutusu */
export default function CarrotSlider({
  name,
  value,
  onChange,
  allowZero = false,
}: {
  name: string;
  value: number;
  onChange: (v: number) => void;
  /** 0 seçilebilsin mi (ör. alt görevli işlerde "bonus yok") */
  allowZero?: boolean;
}) {
  // Kutu boşaltılıp yeniden yazılabilsin diye metni ayrıca tutuyoruz
  const [text, setText] = useState<string | null>(null);
  const pos = carrotsToPosition(value);

  return (
    <div className="card p-4">
      <input type="hidden" name={name} value={value} />
      <div className="flex items-center gap-3">
        <span className="text-2xl" aria-hidden>
          🥕
        </span>
        <input
          type="range"
          min={0}
          max={SLIDER_STEPS}
          step={1}
          value={pos}
          onChange={(e) => {
            setText(null);
            onChange(positionToCarrots(Number(e.target.value)));
          }}
          aria-label="Havuç miktarı"
          aria-valuetext={`${value} havuç`}
          className="h-2 flex-1 cursor-pointer accent-[var(--brand)]"
        />
        <input
          type="number"
          inputMode="numeric"
          min={allowZero ? 0 : MIN_CARROTS}
          max={MAX_CARROTS}
          value={text ?? String(value)}
          onChange={(e) => {
            setText(e.target.value);
            const n = Number(e.target.value);
            if (e.target.value !== "" && Number.isFinite(n)) onChange(allowZero && n <= 0 ? 0 : clampCarrots(n));
          }}
          onBlur={() => setText(null)}
          aria-label="Havuç miktarını yaz"
          className="input w-20 px-2 py-2 text-center text-lg"
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {(allowZero ? [0, ...QUICK] : QUICK).map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => {
              setText(null);
              onChange(q);
            }}
            className={`chip px-3 py-1.5 ${value === q ? "bg-brand text-white" : "bg-line text-muted"}`}
          >
            {q === 0 ? "Bonus yok" : q}
          </button>
        ))}
      </div>
    </div>
  );
}
