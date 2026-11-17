"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { markEmojisSeenAction } from "@/app/actions";
import { EMOJI_NAME } from "@/lib/emoji";

type Incoming = { id: number; emoji: string };

/**
 * Partnerinden gelen, henüz görmediğin emojileri ekranda büyük bir animasyonla
 * sırayla gösterir ve "görüldü" olarak işaretler.
 */
export default function EmojiInbox({
  unseen,
  partnerName,
  partnerEmoji,
}: {
  unseen: Incoming[];
  partnerName: string;
  partnerEmoji: string;
}) {
  const [queue, setQueue] = useState<Incoming[]>([]);
  const shown = useRef(new Set<number>());

  // Yeni gelenleri kuyruğa ekle (sayfa her yenilendiğinde aynıları tekrar eklenmesin)
  useEffect(() => {
    const fresh = unseen.filter((m) => !shown.current.has(m.id));
    if (!fresh.length) return;
    fresh.forEach((m) => shown.current.add(m.id));
    // Sunucudan gelen yeni veriyle senkronize ediliyor
    setQueue((q) => [...q, ...fresh]);
    markEmojisSeenAction(fresh.map((m) => m.id)).catch(() => {});
  }, [unseen]);

  const current = queue[0];
  useEffect(() => {
    if (!current) return;
    navigator.vibrate?.([20, 60, 20]);
    const t = setTimeout(() => setQueue((q) => q.slice(1)), 2400);
    return () => clearTimeout(t);
  }, [current]);

  if (!current || typeof document === "undefined") return null;
  const name = EMOJI_NAME[current.emoji] ?? "emoji";

  return createPortal(
    <div
      key={current.id}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-ink/20 backdrop-blur-[2px]"
      role="status"
      aria-live="polite"
      onClick={() => setQueue((q) => q.slice(1))}
    >
      <div className="animate-emoji-big flex flex-col items-center">
        <div className="text-[120px] leading-none drop-shadow-lg">{current.emoji}</div>
        <div className="card mt-4 px-5 py-2.5 text-center font-semibold">
          {partnerEmoji} {partnerName} sana {name} gönderdi
          {queue.length > 1 && <span className="ml-2 text-xs text-muted">+{queue.length - 1}</span>}
        </div>
      </div>
      {[...Array(6)].map((_, i) => (
        <span
          key={i}
          className="animate-emoji-rise pointer-events-none absolute text-4xl"
          style={{ left: `${15 + i * 14}%`, top: `${62 + (i % 3) * 6}%`, animationDelay: `${i * 0.12}s`, opacity: 0 }}
          aria-hidden
        >
          {current.emoji}
        </span>
      ))}
    </div>,
    document.body,
  );
}
