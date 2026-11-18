"use client";

import { useState, useTransition } from "react";
import { answerSwapAction, cancelSwapAction, offerSwapAction } from "@/app/actions";
import { dative, genitive } from "@/lib/tr";

const QUICK = [0, 10, 20, 50];

/** Görev detayında: bugünkü görevi partnere teklif et / teklifi geri al */
export function SwapPanel({
  taskId,
  xp,
  partnerName,
  balance,
  swap,
}: {
  taskId: number;
  xp: number;
  partnerName: string;
  balance: number;
  swap: null | { id: number; status: "pending" | "accepted"; fromMe: boolean; bonus: number };
}) {
  const [open, setOpen] = useState(false);
  const [bonus, setBonus] = useState(0);
  const [busy, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  if (swap?.status === "pending" && swap.fromMe)
    return (
      <div className="card flex items-center gap-3 bg-ice-soft p-3 text-sm">
        <span className="text-xl">🔄</span>
        <span className="flex-1 font-semibold">
          {dative(partnerName)} teklif ettin{swap.bonus ? ` (+${swap.bonus} 🥕 bonus)` : ""} · cevap bekleniyor
        </span>
        <button
          className="btn bg-surface px-3 py-1.5 text-xs text-ink"
          disabled={busy}
          onClick={() => start(async () => void (await cancelSwapAction(swap.id)))}
        >
          Geri al
        </button>
      </div>
    );
  if (swap) return null;

  if (!open)
    return (
      <button className="btn w-full bg-surface text-sm text-ink" onClick={() => setOpen(true)}>
        🔄 Bugün yetişemiyorum: {dative(partnerName)} teklif et
      </button>
    );

  const send = () =>
    start(async () => {
      setErr(null);
      const r = await offerSwapAction(taskId, bonus);
      if ("error" in r && r.error) setErr(r.error);
      else setOpen(false);
    });

  return (
    <div className="card animate-pop p-4">
      <div className="font-black">🔄 Görev takası</div>
      <p className="mt-1 text-sm font-semibold text-muted">
        Kabul ederse bu görev bugün {genitive(partnerName)} olur ve bitirince +{xp} 🥕 kazanır. İstersen kendi
        havucundan bonus da ekle; bonus ancak görevi bitirirse ona geçer.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {QUICK.map((q) => (
          <button
            key={q}
            type="button"
            className={`chip px-3 py-1.5 ${bonus === q ? "bg-brand text-on-brand" : "bg-line text-ink"}`}
            onClick={() => setBonus(q)}
            disabled={q > balance}
          >
            {q === 0 ? "Bonussuz" : `+${q} 🥕`}
          </button>
        ))}
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={Math.min(200, balance)}
          className="input w-20 px-2 py-1.5 text-sm"
          value={bonus}
          onChange={(e) => setBonus(Math.max(0, Math.min(200, Math.round(Number(e.target.value) || 0))))}
          aria-label="Bonus havuç"
        />
      </div>
      <p className="mt-1 text-xs font-semibold text-muted">Bakiyen: {balance} 🥕</p>
      {err && <p className="mt-2 text-sm font-semibold text-danger">{err}</p>}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button className="btn bg-surface text-muted" onClick={() => setOpen(false)} disabled={busy}>
          Vazgeç
        </button>
        <button className="btn bg-brand text-on-brand" onClick={send} disabled={busy || bonus > balance}>
          Teklif et
        </button>
      </div>
    </div>
  );
}

/** Bugün sayfasında: partnerden gelen takas teklifi */
export function SwapOffer({
  id,
  title,
  emoji,
  xp,
  bonus,
  partnerName,
}: {
  id: number;
  title: string;
  emoji: string;
  xp: number;
  bonus: number;
  partnerName: string;
}) {
  const [busy, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const answer = (accept: boolean) =>
    start(async () => {
      setErr(null);
      const r = await answerSwapAction(id, accept);
      if ("error" in r && r.error) setErr(r.error);
    });
  return (
    <div className="card animate-pop bg-ice-soft p-3">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{emoji}</span>
        <div className="min-w-0 flex-1 text-sm">
          <div className="font-black">🔄 {partnerName} bunu sana devretmek istiyor</div>
          <div className="truncate font-semibold text-muted">
            {title} · +{xp} 🥕{bonus ? ` + ${bonus} bonus` : ""}
          </div>
        </div>
      </div>
      {err && <p className="mt-2 text-sm font-semibold text-danger">{err}</p>}
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button className="btn bg-surface py-2 text-sm text-muted" disabled={busy} onClick={() => answer(false)}>
          Hayır
        </button>
        <button className="btn bg-brand py-2 text-sm text-on-brand" disabled={busy} onClick={() => answer(true)}>
          🤝 Kabul et
        </button>
      </div>
    </div>
  );
}
