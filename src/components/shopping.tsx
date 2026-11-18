"use client";

import { useOptimistic, useState, useTransition } from "react";
import { addShopAction, clearShopAction, removeShopAction, toggleShopAction } from "@/app/actions";
import type { ShopItem } from "@/lib/shopping";

type Person = { id: number; name: string; emoji: string };

export default function ShoppingList({
  items,
  frequent,
  me,
  partner,
}: {
  items: ShopItem[];
  frequent: string[];
  me: Person;
  partner: Person;
}) {
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const [list, toggleOpt] = useOptimistic(items, (cur, id: number) =>
    cur.map((x) => (x.id === id ? { ...x, checked: !x.checked, checked_by: x.checked ? null : me.id } : x)),
  );
  const todo = list.filter((x) => !x.checked);
  const got = list.filter((x) => x.checked);

  const add = (value: string) =>
    start(async () => {
      setErr(null);
      const r = await addShopAction(value);
      if ("error" in r && r.error) setErr(r.error);
      else setText("");
    });
  const toggle = (id: number) =>
    start(async () => {
      toggleOpt(id);
      await toggleShopAction(id);
    });
  const who = (id: number | null) => (id === me.id ? me.emoji : id === partner.id ? partner.emoji : "");

  return (
    <div className="space-y-3">
      <div className="card p-3">
        <div className="flex gap-2">
          <input
            className="input px-3 py-2"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && text.trim() && add(text)}
            placeholder="Süt, ekmek, yumurta…"
            maxLength={400}
            aria-label="Ürün ekle"
          />
          <button className="btn bg-brand px-4 text-white" disabled={busy || !text.trim()} onClick={() => add(text)}>
            Ekle
          </button>
        </div>
        <p className="mt-1 px-1 text-xs font-semibold text-muted">Virgülle ayırarak birden fazla ekleyebilirsin.</p>
        {err && <p className="mt-1 text-sm font-semibold text-danger">{err}</p>}
        {frequent.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {frequent.map((f) => (
              <button key={f} className="chip bg-line px-2.5 py-1 text-ink" disabled={busy} onClick={() => add(f)}>
                + {f}
              </button>
            ))}
          </div>
        )}
      </div>

      {todo.length === 0 && got.length === 0 ? (
        <p className="card p-6 text-center font-semibold text-muted">🧺 Liste boş.</p>
      ) : (
        <ul className="card divide-y divide-line overflow-hidden">
          {todo.map((x) => (
            <li key={x.id} className="flex items-center">
              <button
                className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left"
                onClick={() => toggle(x.id)}
                aria-label={`${x.text} alındı`}
              >
                <span className="h-6 w-6 shrink-0 rounded-full ring-[1.5px] ring-line" aria-hidden />
                <span className="min-w-0 flex-1 font-semibold">{x.text}</span>
                <span className="text-xs" title="Ekleyen">
                  {who(x.added_by)}
                </span>
              </button>
              <button
                className="px-3 py-3 text-sm text-muted"
                aria-label={`${x.text} sil`}
                disabled={busy}
                onClick={() => start(async () => void (await removeShopAction(x.id)))}
              >
                ✕
              </button>
            </li>
          ))}
          {got.map((x) => (
            <li key={x.id}>
              <button
                className="flex w-full items-center gap-3 bg-bg/60 px-4 py-3 text-left"
                onClick={() => toggle(x.id)}
                aria-label={`${x.text} geri al`}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sage text-xs font-black text-white">
                  ✓
                </span>
                <span className="min-w-0 flex-1 text-muted line-through">{x.text}</span>
                <span className="text-xs">{who(x.checked_by)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {got.length > 0 && (
        <button
          className="btn w-full bg-surface text-sm text-ink"
          disabled={busy}
          onClick={() => start(async () => void (await clearShopAction()))}
        >
          🧹 Alınanları temizle ({got.length})
        </button>
      )}
    </div>
  );
}
