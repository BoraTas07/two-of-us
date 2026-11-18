"use client";

import { useActionState, useState, useTransition } from "react";
import { archiveRewardAction, saveRewardAction } from "@/app/actions";
import { REWARD_EMOJIS } from "@/lib/emojis";
import { EmojiPicker, Segmented } from "./pickers";

export type RewardFormValues = {
  id?: number;
  title: string;
  emoji: string;
  cost: number;
  forWho: "me" | "partner";
};

const QUICK = [25, 50, 100, 200, 500];

export default function RewardForm({ initial, partnerName }: { initial: RewardFormValues; partnerName: string }) {
  const [state, action, pending] = useActionState(saveRewardAction, undefined);
  const [v, setV] = useState(initial);
  const [archiving, startArchive] = useTransition();
  const set = <K extends keyof RewardFormValues>(k: K, val: RewardFormValues[K]) => setV((s) => ({ ...s, [k]: val }));

  return (
    <form action={action} className="space-y-5">
      {v.id && <input type="hidden" name="id" value={v.id} />}

      <div>
        <div className="mb-1.5 px-1 font-black">Ödül</div>
        <input
          className="input text-lg"
          name="title"
          value={v.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder={v.forWho === "me" ? "ör. 1 saat oyun oynamak" : "ör. Sana kahvaltı hazırlarım"}
          maxLength={60}
          required
          autoFocus={!v.id}
        />
      </div>

      <div>
        <div className="mb-1.5 px-1 font-black">Simge</div>
        <EmojiPicker name="emoji" options={REWARD_EMOJIS} value={v.emoji} onChange={(e) => set("emoji", e)} />
      </div>

      <div>
        <div className="mb-1.5 px-1 font-black">Kim alabilir?</div>
        <Segmented
          name="forWho"
          value={v.forWho}
          onChange={(x) => set("forWho", x)}
          options={[
            { value: "me", label: "🙋 Kendime" },
            { value: "partner", label: `🎁 ${partnerName}` },
          ]}
        />
        <p className="mt-1.5 px-1 text-xs font-semibold text-muted">
          {v.forWho === "me"
            ? "Kendine koyduğun ödül. Havuçlarını biriktirip kendin alırsın."
            : `${partnerName} kendi havuçlarıyla alabilir; aldığında sen yerine getirirsin.`}
        </p>
      </div>

      <div>
        <div className="mb-1.5 px-1 font-black">Fiyatı (havuç)</div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl" aria-hidden>
              🥕
            </span>
            <input
              className="input text-center text-lg"
              type="number"
              inputMode="numeric"
              name="cost"
              min={1}
              max={10000}
              value={v.cost || ""}
              onChange={(e) => set("cost", Math.max(0, Math.min(10000, Math.round(Number(e.target.value) || 0))))}
              required
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {QUICK.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => set("cost", q)}
                className={`chip px-3 py-1.5 ${v.cost === q ? "bg-brand text-on-brand" : "bg-line text-muted"}`}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>

      {state?.error && <p className="animate-pop rounded-xl bg-danger-soft p-3 font-bold text-danger">{state.error}</p>}

      <button className="btn w-full bg-brand text-lg text-on-brand" disabled={pending}>
        {pending ? "Kaydediliyor..." : v.id ? "Kaydet" : "Mağazaya ekle"}
      </button>

      {v.id && (
        <button
          type="button"
          className="btn w-full bg-surface text-danger"
          disabled={archiving}
          onClick={() => {
            if (confirm("Bu ödül mağazadan kaldırılsın mı?")) startArchive(() => archiveRewardAction(v.id!).then(() => {}));
          }}
        >
          🗑️ Ödülü kaldır
        </button>
      )}
    </form>
  );
}
