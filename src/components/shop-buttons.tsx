"use client";

import { useState, useTransition } from "react";
import { buyRewardAction, fulfillAction } from "@/app/actions";
import { celebrate } from "./celebration";

export function BuyButton({
  id,
  title,
  cost,
  balance,
}: {
  id: number;
  title: string;
  cost: number;
  balance: number;
}) {
  const [busy, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const missing = cost - balance;

  if (missing > 0) {
    return <span className="text-right text-xs leading-tight font-semibold text-muted">{missing} 🥕 daha</span>;
  }
  return (
    <div className="flex flex-col items-end gap-1">
      <button
        className="btn bg-brand px-3.5 py-2 text-sm text-white"
        disabled={busy}
        onClick={() => {
          if (!confirm(`"${title}" için ${cost} havuç harcansın mı?`)) return;
          setErr(null);
          start(async () => {
            const r = await buyRewardAction(id);
            if ("error" in r) setErr(r.error);
            else celebrate({ notice: { emoji: r.emoji, title: `${r.title} senin!`, body: `Kalan bakiyen: ${r.balance} 🥕` } });
          });
        }}
      >
        Al
      </button>
      {err && <span className="text-xs font-semibold text-danger">{err}</span>}
    </div>
  );
}

export function FulfillButton({ id, label }: { id: number; label: string }) {
  const [busy, start] = useTransition();
  return (
    <button
      className="btn bg-sage px-3 py-2 text-sm text-white"
      disabled={busy}
      onClick={() => start(async () => void (await fulfillAction(id)))}
    >
      {label}
    </button>
  );
}
