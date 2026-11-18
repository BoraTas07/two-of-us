"use client";

import { useState, useTransition } from "react";
import { nudgePartnerAction } from "@/app/actions";

export default function NudgeButton({ name, compact = false }: { name: string; compact?: boolean }) {
  const [busy, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const nudge = () =>
    start(async () => {
      const r = await nudgePartnerAction();
      setMsg(r.sent > 0 ? `${name} dürtüldü 👋` : `${name} henüz bildirimleri açmamış 😕`);
    });
  if (compact)
    return (
      <button
        className="btn shrink-0 bg-brand-soft px-3 py-2 text-sm text-brand-dark"
        disabled={busy || !!msg}
        onClick={nudge}
        title={msg ?? undefined}
        aria-label={msg ?? `${name} dürt`}
      >
        {msg ? "✓" : "👋 Dürt"}
      </button>
    );
  return (
    <div className="mt-3">
      <button
        className="btn w-full bg-brand-soft text-brand-dark"
        disabled={busy || !!msg}
        onClick={() =>
          start(async () => {
            const r = await nudgePartnerAction();
            setMsg(r.sent > 0 ? `${name} dürtüldü 👋` : `${name} henüz bildirimleri açmamış 😕`);
          })
        }
      >
        {msg ?? `👋 Dürt: ${name}`}
      </button>
    </div>
  );
}
