"use client";

import confetti from "canvas-confetti";
import { useEffect, useState } from "react";

export type CelebrateDetail = {
  xp?: number;
  pending?: boolean;
  levelUp?: number | null;
  badges?: { emoji: string; name: string; description: string }[];
  /** Genel bilgi penceresi (ör. mağazadan alışveriş) */
  notice?: { emoji: string; title: string; body: string };
  /** Sadece "+n 🥕" yazısı, konfeti yok (ör. tek bir alt adım) */
  quiet?: boolean;
  goalReached?: boolean;
  x?: number;
  y?: number;
};

/** Herhangi bir yerden kutlama başlatır */
export function celebrate(detail: CelebrateDetail) {
  window.dispatchEvent(new CustomEvent<CelebrateDetail>("ikimiz:celebrate", { detail }));
}

type Modal = { emoji: string; title: string; body: string; color: string };

export default function Celebration() {
  const [floats, setFloats] = useState<{ id: number; text: string; x: number; y: number }[]>([]);
  const [queue, setQueue] = useState<Modal[]>([]);

  useEffect(() => {
    const onEvent = (e: Event) => {
      const d = (e as CustomEvent<CelebrateDetail>).detail;
      const x = d.x ?? window.innerWidth / 2;
      const y = d.y ?? window.innerHeight / 2;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (d.xp) {
        const id = Date.now() + Math.random();
        setFloats((f) => [...f, { id, text: d.pending ? "⏳ Onay bekliyor" : `+${d.xp} 🥕`, x, y }]);
        setTimeout(() => setFloats((f) => f.filter((i) => i.id !== id)), 1200);
      }
      if (!d.pending && d.xp && !reduce && !d.quiet) {
        confetti({
          particleCount: 28,
          spread: 55,
          startVelocity: 22,
          scalar: 0.8,
          ticks: 120,
          origin: { x: x / window.innerWidth, y: y / window.innerHeight },
          colors: ["#a65d3c", "#b9893a", "#6e8a5d", "#ad6672", "#e6dccd"],
          disableForReducedMotion: true,
        });
      }
      if ("vibrate" in navigator) navigator.vibrate?.(d.pending ? 20 : [30, 40, 30]);

      const modals: Modal[] = [];
      if (d.levelUp)
        modals.push({
          emoji: "⬆️",
          title: `Seviye ${d.levelUp}!`,
          body: "Harika gidiyorsun, yeni seviyeye ulaştın.",
          color: "var(--xp)",
        });
      if (d.notice) modals.push({ ...d.notice, color: "var(--sage)" });
      for (const b of d.badges ?? [])
        modals.push({ emoji: b.emoji, title: `Yeni rozet: ${b.name}`, body: b.description, color: "var(--brand)" });
      if (d.goalReached)
        modals.push({
          emoji: "🏆",
          title: "Haftalık hedef tamam!",
          body: "Birlikte başardınız. İkinize de bonus havuç!",
          color: "var(--rose)",
        });
      if (modals.length) {
        setQueue((q) => [...q, ...modals]);
        if (!reduce) {
          setTimeout(() => {
            confetti({
              particleCount: 60,
              spread: 80,
              scalar: 0.85,
              origin: { y: 0.4 },
              colors: ["#a65d3c", "#b9893a", "#6e8a5d", "#ad6672", "#e6dccd"],
              disableForReducedMotion: true,
            });
          }, 250);
        }
      }
    };
    window.addEventListener("ikimiz:celebrate", onEvent);
    return () => window.removeEventListener("ikimiz:celebrate", onEvent);
  }, []);

  const current = queue[0];

  return (
    <>
      {floats.map((f) => (
        <div
          key={f.id}
          className="animate-float-up pointer-events-none fixed z-50 -translate-x-1/2 rounded-full bg-surface px-3 py-1 text-base font-black text-xp-ink shadow-md"
          style={{ left: f.x, top: f.y - 30 }}
        >
          {f.text}
        </div>
      ))}
      {current && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={current.title}
          onClick={() => setQueue((q) => q.slice(1))}
        >
          <div className="card animate-pop w-full max-w-xs p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <div
              className="mx-auto flex h-24 w-24 items-center justify-center rounded-full text-6xl"
              style={{ background: "var(--bg)", boxShadow: `inset 0 0 0 2px ${current.color}` }}
            >
              {current.emoji}
            </div>
            <h2 className="mt-4 text-2xl font-black">{current.title}</h2>
            <p className="mt-1 font-semibold text-muted">{current.body}</p>
            <button
              className="btn mt-5 w-full text-white"
              style={{ background: current.color }}
              onClick={() => setQueue((q) => q.slice(1))}
              autoFocus
            >
              Harika
            </button>
          </div>
        </div>
      )}
    </>
  );
}
