"use client";

import { useRef, useState, useTransition } from "react";
import { sendEmojiAction } from "@/app/actions";
import { EMOJI_OPTIONS } from "@/lib/emoji";

type Recent = { id: number; from_id: number; emoji: string; created_at: string; seen: boolean };

/** Partnere emoji gönderme şeridi + son emojiler */
export default function EmojiBar({
  meId,
  partnerName,
  recent,
}: {
  meId: number;
  partnerName: string;
  recent: Recent[];
}) {
  const [, start] = useTransition();
  const [bursts, setBursts] = useState<{ id: number; emoji: string; x: number }[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const seq = useRef(0);

  function send(emoji: string, e: React.MouseEvent<HTMLButtonElement>) {
    const host = e.currentTarget.parentElement!.getBoundingClientRect();
    const r = e.currentTarget.getBoundingClientRect();
    const id = ++seq.current;
    setBursts((b) => [...b, { id, emoji, x: r.left - host.left + r.width / 2 }]);
    setTimeout(() => setBursts((b) => b.filter((x) => x.id !== id)), 1700);
    navigator.vibrate?.(15);
    setMsg(null);
    start(async () => {
      const res = await sendEmojiAction(emoji);
      setMsg("error" in res && res.error ? res.error : `${emoji} gönderildi`);
    });
  }

  const time = (iso: string) =>
    new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" });

  return (
    <div className="mt-3">
      <div className="mb-1.5 flex items-baseline justify-between text-xs font-semibold text-muted">
        <span>{partnerName} için bir emoji gönder</span>
        {msg && <span className="animate-pop text-ink">{msg}</span>}
      </div>
      <div className="relative">
        <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1" role="group" aria-label="Emoji gönder">
          {EMOJI_OPTIONS.map((o) => (
            <button
              key={o.emoji}
              type="button"
              onClick={(e) => send(o.emoji, e)}
              aria-label={`${partnerName} için ${o.name} gönder`}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-bg text-2xl transition-transform active:scale-90"
            >
              {o.emoji}
            </button>
          ))}
        </div>
        {bursts.map((b) => (
          <span
            key={b.id}
            className="animate-emoji-rise pointer-events-none absolute top-0 text-3xl"
            style={{ left: b.x }}
            aria-hidden
          >
            {b.emoji}
          </span>
        ))}
      </div>
      {recent.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-muted">
          {recent.map((m) => (
            <span key={m.id} title={time(m.created_at)}>
              {m.from_id === meId ? "Sen" : partnerName} {m.emoji}
              <span className="ml-1 font-normal opacity-70">{time(m.created_at)}</span>
              {m.from_id === meId && m.seen ? <span className="ml-0.5">✓</span> : null}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
