"use client";

import { useActionState, useState, useTransition } from "react";
import { archiveTaskAction, saveTaskAction } from "@/app/actions";
import { DIFFICULTY } from "@/lib/levels";
import { TASK_EMOJIS } from "@/lib/emojis";
import { WEEKDAYS_SHORT } from "@/lib/time";
import { EmojiPicker, Segmented } from "./pickers";

export type TaskFormValues = {
  id?: number;
  title: string;
  emoji: string;
  notes: string;
  kind: "once" | "recurring" | "habit";
  who: "me" | "partner" | "both";
  xp: number;
  approval: boolean;
  due: string;
  repeat: "daily" | "weekly" | "monthly";
  days: number[];
  dom: number;
  remind: string;
};

function Label({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-1.5 px-1">
      <div className="font-black">{children}</div>
      {hint && <div className="text-xs font-semibold text-muted">{hint}</div>}
    </div>
  );
}

export default function TaskForm({
  initial,
  partnerName,
  today,
}: {
  initial: TaskFormValues;
  partnerName: string;
  today: string;
}) {
  const [state, action, pending] = useActionState(saveTaskAction, undefined);
  const [v, setV] = useState(initial);
  const [archiving, startArchive] = useTransition();
  const set = <K extends keyof TaskFormValues>(k: K, val: TaskFormValues[K]) => setV((s) => ({ ...s, [k]: val }));

  return (
    <form action={action} className="space-y-5">
      {v.id && <input type="hidden" name="id" value={v.id} />}

      <div>
        <Label>Görev</Label>
        <input
          className="input text-lg"
          name="title"
          value={v.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="ör. Bulaşıkları yıka"
          maxLength={80}
          required
          autoFocus={!v.id}
        />
      </div>

      <div>
        <Label>Simge</Label>
        <EmojiPicker name="emoji" options={TASK_EMOJIS} value={v.emoji} onChange={(e) => set("emoji", e)} />
      </div>

      <div>
        <Label>Kim yapacak?</Label>
        <Segmented
          name="who"
          value={v.who}
          onChange={(x) => set("who", x)}
          options={[
            { value: "me", label: "🙋 Ben" },
            { value: "partner", label: `👉 ${partnerName}` },
            { value: "both", label: "💞 Ortak" },
          ]}
        />
        {v.who === "both" && (
          <p className="mt-1.5 px-1 text-xs font-semibold text-muted">
            Ortak görevi ikinizden biri bitirince ikinize de XP gelir.
          </p>
        )}
      </div>

      <div>
        <Label>Ne tür bir görev?</Label>
        <Segmented
          name="kind"
          value={v.kind}
          onChange={(x) => set("kind", x)}
          options={[
            { value: "once", label: "📌 Bir kez" },
            { value: "recurring", label: "🔁 Tekrarlı" },
            { value: "habit", label: "🌱 Alışkanlık" },
          ]}
        />
        <p className="mt-1.5 px-1 text-xs font-semibold text-muted">
          {v.kind === "once"
            ? "Bir kere yapılıp biten iş: fatura öde, kargo al..."
            : v.kind === "recurring"
              ? "Düzenli tekrarlayan ev işi/sorumluluk: çöp, bulaşık, kira..."
              : "Kendine kazandırmak istediğin alışkanlık: su iç, spor, kitap... Ayrı serisi tutulur."}
        </p>
      </div>

      {v.kind === "once" ? (
        <div>
          <Label hint="Boş bırakırsan yapılana kadar listende kalır">Son tarih</Label>
          <div className="flex gap-2">
            <input
              className="input"
              type="date"
              name="due"
              value={v.due}
              min={v.id ? undefined : today}
              onChange={(e) => set("due", e.target.value)}
            />
            {v.due && (
              <button type="button" className="btn bg-surface text-muted" onClick={() => set("due", "")}>
                ✕
              </button>
            )}
          </div>
        </div>
      ) : (
        <div>
          <Label>Ne sıklıkla?</Label>
          <Segmented
            name="repeat"
            value={v.repeat}
            onChange={(x) => set("repeat", x)}
            options={[
              { value: "daily", label: "Her gün" },
              { value: "weekly", label: "Haftanın günleri" },
              { value: "monthly", label: "Ayda bir" },
            ]}
          />
          {v.repeat === "weekly" && (
            <div className="mt-2 flex justify-between gap-1">
              {WEEKDAYS_SHORT.map((d, i) => {
                const on = v.days.includes(i);
                return (
                  <label
                    key={d}
                    className={`flex h-11 flex-1 cursor-pointer items-center justify-center rounded-xl text-sm font-black transition-colors ${
                      on ? "bg-brand text-white shadow-[inset_0_-3px_0_var(--brand-dark)]" : "bg-surface text-muted"
                    }`}
                  >
                    <input
                      type="checkbox"
                      name="days"
                      value={i}
                      checked={on}
                      onChange={() => set("days", on ? v.days.filter((x) => x !== i) : [...v.days, i])}
                      className="sr-only"
                    />
                    {d}
                  </label>
                );
              })}
            </div>
          )}
          {v.repeat === "monthly" && (
            <div className="mt-2 flex items-center gap-2 font-bold">
              Her ayın
              <input
                className="input w-20 text-center"
                type="number"
                name="dom"
                min={1}
                max={31}
                value={v.dom}
                onChange={(e) => set("dom", Number(e.target.value))}
              />
              . günü
            </div>
          )}
        </div>
      )}

      <div>
        <Label hint="Seçtiğin saatte telefonuna bildirim gelir">Hatırlatma saati</Label>
        <div className="flex gap-2">
          <input
            className="input"
            type="time"
            name="remind"
            value={v.remind}
            onChange={(e) => set("remind", e.target.value)}
          />
          {v.remind && (
            <button type="button" className="btn bg-surface text-muted" onClick={() => set("remind", "")}>
              ✕
            </button>
          )}
        </div>
      </div>

      <div>
        <Label>Zorluk (kazanılacak XP)</Label>
        <Segmented
          name="xp"
          value={String(v.xp)}
          onChange={(x) => set("xp", Number(x))}
          options={DIFFICULTY.map((d) => ({
            value: String(d.xp),
            label: (
              <span className="flex flex-col leading-tight">
                <span>
                  {d.emoji} {d.label}
                </span>
                <span className="text-xs text-xp">+{d.xp} XP</span>
              </span>
            ),
          }))}
        />
      </div>

      {v.who !== "both" && (
        <label className="card flex cursor-pointer items-center gap-3 p-4">
          <input
            type="checkbox"
            name="approval"
            checked={v.approval}
            onChange={(e) => set("approval", e.target.checked)}
            className="h-6 w-6 accent-[var(--brand)]"
          />
          <div className="flex-1">
            <div className="font-black">🤝 Partner onayı gereksin</div>
            <div className="text-xs font-semibold text-muted">
              {v.who === "me" ? partnerName : "Sen"} onaylayınca XP verilir. Kapalıysa güvene dayalı, XP hemen gelir.
            </div>
          </div>
        </label>
      )}

      <div>
        <Label>Not (isteğe bağlı)</Label>
        <textarea
          className="input min-h-20"
          name="notes"
          value={v.notes}
          onChange={(e) => set("notes", e.target.value)}
          maxLength={500}
          placeholder="Detay, ipucu..."
        />
      </div>

      {state?.error && <p className="animate-pop rounded-xl bg-danger-soft p-3 font-bold text-danger">{state.error}</p>}

      <button className="btn w-full bg-brand text-lg text-white" disabled={pending}>
        {pending ? "Kaydediliyor..." : v.id ? "Kaydet" : "Görevi ekle ✨"}
      </button>

      {v.id && (
        <button
          type="button"
          className="btn w-full bg-surface text-danger"
          disabled={archiving}
          onClick={() => {
            if (confirm("Bu görev silinsin mi? Geçmişte kazanılan XP'ler kalır.")) {
              startArchive(() => archiveTaskAction(v.id!));
            }
          }}
        >
          🗑️ Görevi sil
        </button>
      )}
    </form>
  );
}
