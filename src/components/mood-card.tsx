"use client";

import { useState, useTransition } from "react";
import { setMoodAction } from "@/app/actions";
import { MOOD_BY_KEY, MOOD_OPTIONS } from "@/lib/mood-options";
import type { Mood } from "@/lib/moods";

function time(iso: string) {
  return new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" });
}

export default function MoodCard({
  mine,
  theirs,
  partner,
}: {
  mine: Mood | null;
  theirs: Mood | null;
  partner: { name: string; emoji: string };
}) {
  const [editing, setEditing] = useState(!mine);
  const [choice, setChoice] = useState<string | null>(mine?.mood ?? null);
  const [note, setNote] = useState(mine?.note ?? "");
  const [err, setErr] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const m = mine ? MOOD_BY_KEY[mine.mood] : null;
  const t = theirs ? MOOD_BY_KEY[theirs.mood] : null;

  const save = () =>
    start(async () => {
      if (!choice) return;
      setErr(null);
      const r = await setMoodAction(choice, note);
      if ("error" in r && r.error) setErr(r.error);
      else setEditing(false);
    });

  return (
    <div className="card p-4">
      {/* Partnerin ruh hali */}
      <div className="flex items-center gap-3">
        <span className="text-3xl" aria-hidden>
          {t ? t.emoji : partner.emoji}
        </span>
        <div className="min-w-0 flex-1 text-sm font-semibold">
          {t && theirs ? (
            <>
              <div className="font-black">
                {partner.name} şu an {t.label.toLocaleLowerCase("tr")}
              </div>
              <div className="text-muted">
                {theirs.note ? `“${theirs.note}” · ` : ""}
                {time(theirs.updated_at)}
              </div>
            </>
          ) : (
            <div className="text-muted">{partner.name} bugün henüz nasıl hissettiğini paylaşmadı.</div>
          )}
        </div>
      </div>

      <div className="my-3 border-t border-line" />

      {/* Benim ruh halim */}
      {!editing && m && mine ? (
        <div className="flex items-center gap-3">
          <span className="text-3xl" aria-hidden>
            {m.emoji}
          </span>
          <div className="min-w-0 flex-1 text-sm font-semibold">
            <div className="font-black">Sen: {m.label}</div>
            <div className="text-muted">
              {mine.note ? `“${mine.note}” · ` : ""}
              {time(mine.updated_at)}
            </div>
          </div>
          <button className="btn bg-surface px-3 py-1.5 text-sm text-ink" onClick={() => setEditing(true)}>
            Değiştir
          </button>
        </div>
      ) : (
        <div>
          <div className="mb-2 text-sm font-black">Şu an nasıl hissediyorsun?</div>
          <div className="grid grid-cols-5 gap-1.5" role="radiogroup" aria-label="Ruh hali">
            {MOOD_OPTIONS.map((o) => (
              <button
                key={o.key}
                type="button"
                role="radio"
                aria-checked={choice === o.key}
                onClick={() => setChoice(o.key)}
                className={`flex flex-col items-center rounded-2xl px-1 py-2 transition-transform active:scale-95 ${
                  choice === o.key ? "bg-brand-soft ring-2 ring-brand" : "bg-bg"
                }`}
              >
                <span className="text-2xl">{o.emoji}</span>
                <span className="mt-0.5 text-[10px] leading-tight font-semibold text-muted">{o.label}</span>
              </button>
            ))}
          </div>
          {choice && (
            <div className="animate-pop mt-3 space-y-2">
              <input
                className="input text-sm"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Bir not ekle (isteğe bağlı)"
                maxLength={140}
              />
              <button className="btn w-full bg-brand text-white" disabled={busy} onClick={save}>
                {busy ? "Paylaşılıyor..." : `${partner.name} ile paylaş`}
              </button>
            </div>
          )}
          {err && <p className="mt-2 text-sm font-semibold text-danger">{err}</p>}
          {mine && (
            <button className="mt-2 w-full text-sm font-semibold text-muted" onClick={() => setEditing(false)}>
              Vazgeç
            </button>
          )}
        </div>
      )}
    </div>
  );
}
