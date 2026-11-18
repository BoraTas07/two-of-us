"use client";

import { useState, useTransition } from "react";
import { EMOJI_OPTIONS } from "@/lib/emoji";

const SHORT = 7;

/**
 * Tek emojilik tepki seçici: ilk 7 emoji + "+N" ile tamamı. Seçili emojiye tekrar
 * dokununca tepki kalkar. Şarkı kartı ve "Sensiz İçime Sinmiyor" ortak kullanır.
 */
export default function ReactionPicker({
  initial,
  onChange,
  label,
}: {
  initial: string | null;
  onChange: (emoji: string | null) => Promise<unknown>;
  /** Erişilebilirlik için: "Şarkıya", "Paylaşıma" */
  label: string;
}) {
  const [reaction, setReaction] = useState<string | null>(initial);
  const [showAll, setShowAll] = useState(false);
  const [busy, start] = useTransition();

  function react(emoji: string) {
    const next = reaction === emoji ? null : emoji;
    setReaction(next);
    setShowAll(false);
    start(async () => void (await onChange(next)));
  }

  const extraSelected = EMOJI_OPTIONS.slice(SHORT).some((o) => o.emoji === reaction);
  const shown = showAll
    ? EMOJI_OPTIONS
    : [
        ...EMOJI_OPTIONS.slice(0, SHORT),
        // Seçili tepki ilk yedide değilse kısa listede de görünsün
        ...EMOJI_OPTIONS.slice(SHORT).filter((o) => o.emoji === reaction),
      ];

  return (
    <div>
      <div className="mb-1 text-xs font-semibold text-muted">
        {reaction ? `Tepkin: ${reaction} (değiştirmek ya da kaldırmak için dokun)` : "Tepki bırak"}
      </div>
      <div className="-mx-1 flex flex-wrap gap-1 px-1" role="group" aria-label={`${label} tepki`}>
        {shown.map((o) => (
          <button
            key={o.emoji}
            type="button"
            onClick={() => react(o.emoji)}
            disabled={busy}
            aria-pressed={reaction === o.emoji}
            aria-label={`${label} ${o.name} bırak`}
            className={`flex h-10 w-10 items-center justify-center rounded-full text-xl transition-transform active:scale-90 ${
              reaction === o.emoji ? "bg-rose-soft ring-2 ring-rose" : "bg-bg"
            }`}
          >
            {o.emoji}
          </button>
        ))}
        {!showAll && (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="flex h-10 items-center justify-center rounded-full bg-bg px-3 text-sm font-semibold text-muted"
            aria-label="Tüm emojileri göster"
          >
            +{EMOJI_OPTIONS.length - SHORT - (extraSelected ? 1 : 0)}
          </button>
        )}
      </div>
    </div>
  );
}
