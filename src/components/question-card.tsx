"use client";

import { useState, useTransition } from "react";
import { addQuestionAction, answerQuestionAction, removeQuestionAction } from "@/app/actions";
import type { DayQuestion } from "@/lib/questions";

type Person = { id: number; name: string; emoji: string };

export function QuestionCard({ q, me, partner }: { q: DayQuestion; me: Person; partner: Person }) {
  const mine = q.answers.find((a) => a.profile_id === me.id);
  const theirs = q.answers.find((a) => a.profile_id === partner.id);
  const [editing, setEditing] = useState(!mine);
  const [text, setText] = useState(mine?.text ?? "");
  const [busy, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const asker = q.author_id === me.id ? "Sen sordun" : q.author_id === partner.id ? `${partner.name} sordu` : null;

  const save = () =>
    start(async () => {
      setErr(null);
      const r = await answerQuestionAction(text);
      if ("error" in r && r.error) setErr(r.error);
      else setEditing(false);
    });

  return (
    <div className="card p-4">
      <div className="flex items-start gap-3">
        <span className="text-2xl">❓</span>
        <div className="min-w-0 flex-1">
          <p className="font-serif text-lg leading-snug">{q.text}</p>
          {asker && <p className="mt-0.5 text-xs font-semibold text-muted">✍️ {asker}</p>}
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {editing ? (
          <div>
            <textarea
              className="input min-h-20 text-sm"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Cevabın…"
              maxLength={400}
              aria-label="Cevabın"
            />
            {err && <p className="mt-1 text-sm font-semibold text-danger">{err}</p>}
            <div className="mt-2 flex gap-2">
              {mine && (
                <button className="btn flex-1 bg-surface text-sm text-muted" onClick={() => setEditing(false)} disabled={busy}>
                  Vazgeç
                </button>
              )}
              <button className="btn flex-1 bg-brand text-sm text-on-brand" onClick={save} disabled={busy || !text.trim()}>
                {busy ? "..." : mine ? "Kaydet" : "Cevapla · +5 🥕"}
              </button>
            </div>
          </div>
        ) : (
          mine && (
            <div className="rounded-xl bg-bg px-3 py-2 text-sm">
              <div className="flex items-center justify-between text-xs font-bold text-muted">
                <span>
                  {me.emoji} Sen
                </span>
                <button className="font-semibold text-brand" onClick={() => setEditing(true)}>
                  Düzenle
                </button>
              </div>
              <p className="mt-0.5 whitespace-pre-wrap">{mine.text}</p>
            </div>
          )
        )}

        <div className={`rounded-xl px-3 py-2 text-sm ${theirs && mine ? "bg-rose-soft" : "bg-bg"}`}>
          <div className="text-xs font-bold text-muted">
            {partner.emoji} {partner.name}
          </div>
          {theirs ? (
            mine ? (
              <p className="mt-0.5 whitespace-pre-wrap">{theirs.text}</p>
            ) : (
              <p className="mt-0.5 font-semibold text-muted">🔒 Cevapladı. Sen de cevaplayınca görünecek.</p>
            )
          ) : (
            <p className="mt-0.5 font-semibold text-muted">Henüz cevaplamadı.</p>
          )}
        </div>
      </div>
    </div>
  );
}

/** Sıraya kendi sorunu ekle */
export function AskForm({ queued }: { queued: { id: number; text: string }[] }) {
  const [text, setText] = useState("");
  const [busy, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const add = () =>
    start(async () => {
      setErr(null);
      const r = await addQuestionAction(text);
      if ("error" in r && r.error) setErr(r.error);
      else setText("");
    });
  return (
    <div className="card p-4">
      <div className="font-black">✍️ Kendi sorunu ekle</div>
      <p className="mt-0.5 text-sm font-semibold text-muted">
        Eklediğin sorular sırayla günün sorusu olur. Sürpriz kalsın diye partnerin önceden görmez.
      </p>
      <div className="mt-2 flex gap-2">
        <input
          className="input px-3 py-2 text-sm"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && text.trim() && add()}
          placeholder="Örn: Bana ilk ne zaman âşık oldun?"
          maxLength={200}
          aria-label="Yeni soru"
        />
        <button className="btn bg-brand px-3 text-sm text-on-brand" disabled={busy || !text.trim()} onClick={add}>
          Ekle
        </button>
      </div>
      {err && <p className="mt-1 text-sm font-semibold text-danger">{err}</p>}
      {queued.length > 0 && (
        <ul className="mt-3 space-y-1">
          {queued.map((q, i) => (
            <li key={q.id} className="flex items-center gap-2 rounded-xl bg-bg px-3 py-1.5 text-sm">
              <span className="text-xs font-black text-muted">{i + 1}.</span>
              <span className="min-w-0 flex-1">{q.text}</span>
              <button
                className="text-xs text-muted"
                aria-label="Sorunu sil"
                disabled={busy}
                onClick={() => start(async () => void (await removeQuestionAction(q.id)))}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
