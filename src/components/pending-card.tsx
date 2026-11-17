"use client";

import { useState, useTransition } from "react";
import { decideAction } from "@/app/actions";
import { celebrate } from "./celebration";
import { CarrotChip } from "./ui";

export default function PendingCard({
  p,
  partnerName,
}: {
  p: { id: number; title: string; emoji: string; xp: number; completed_at: string };
  partnerName: string;
}) {
  const [busy, start] = useTransition();
  const [gone, setGone] = useState(false);
  if (gone) return null;

  const decide = (approve: boolean) =>
    start(async () => {
      const r = await decideAction(p.id, approve);
      if ("error" in r && r.error) {
        alert(r.error);
        return;
      }
      setGone(true);
      if (approve && r.badges.length) celebrate({ badges: r.badges });
    });

  const time = new Date(p.completed_at).toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Istanbul",
  });

  return (
    <div className="card animate-pop bg-warn-soft p-3">
      <div className="flex items-center gap-3">
        <span className="text-3xl">{p.emoji}</span>
        <div className="min-w-0 flex-1">
          <div className="font-extrabold">{p.title}</div>
          <div className="mt-0.5 flex items-center gap-2 text-xs font-bold text-muted">
            <CarrotChip n={p.xp} /> {partnerName} {time}&apos;da bitirdi
          </div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button className="btn bg-surface text-muted" disabled={busy} onClick={() => decide(false)}>
          ↩️ Geri çevir
        </button>
        <button className="btn bg-sage text-white" disabled={busy} onClick={() => decide(true)}>
          ✅ Onayla
        </button>
      </div>
    </div>
  );
}
