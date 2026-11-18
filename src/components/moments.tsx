"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { commentMomentAction, deleteCommentAction, deleteMomentAction, reactMomentAction } from "@/app/actions";
import type { Moment } from "@/lib/moments";
import { Portal, compress } from "./photo";
import ReactionPicker from "./reaction-picker";

type Person = { id: number; name: string; emoji: string };

function time(iso: string) {
  return new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" });
}

/** Yeni paylaşım kutusu: yazı ve/veya fotoğraf */
export function MomentComposer({ partnerName }: { partnerName: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [blob, setBlob] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  async function pick(file: File | undefined) {
    if (!file) return;
    setErr(null);
    setBusy(true);
    try {
      const b = await compress(file);
      setBlob(b);
      setPreview(URL.createObjectURL(b));
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
  }

  async function send() {
    if (!text.trim() && !blob) return;
    setBusy(true);
    setErr(null);
    const fd = new FormData();
    fd.append("text", text);
    if (blob) fd.append("photo", new File([blob], "an.jpg", { type: "image/jpeg" }));
    try {
      const res = await fetch("/api/sensiz", { method: "POST", body: fd });
      const r = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(r.error ?? "Paylaşılamadı");
      setText("");
      setBlob(null);
      setPreview(null);
      if (input.current) input.current.value = "";
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
  }

  return (
    <div className="card p-4">
      <textarea
        className="input min-h-20 text-sm"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={`Bunu görünce aklıma geldin… (${partnerName} görecek)`}
        maxLength={500}
        aria-label="Ne gördün?"
      />
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0])}
        aria-label="Fotoğraf seç"
      />
      {preview && (
        <div className="relative mt-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Seçilen fotoğraf" className="max-h-72 w-full rounded-2xl object-cover" />
          <button
            type="button"
            className="btn absolute top-2 right-2 bg-surface px-2.5 py-1 text-xs text-ink"
            onClick={() => {
              setBlob(null);
              setPreview(null);
              if (input.current) input.current.value = "";
            }}
          >
            ✕ Kaldır
          </button>
        </div>
      )}
      {err && <p className="mt-2 text-sm font-semibold text-danger">{err}</p>}
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button type="button" className="btn bg-surface text-ink" disabled={busy} onClick={() => input.current?.click()}>
          📷 {preview ? "Değiştir" : "Fotoğraf"}
        </button>
        <button className="btn bg-brand text-white" disabled={busy || (!text.trim() && !blob)} onClick={send}>
          {busy ? "..." : "💌 Paylaş"}
        </button>
      </div>
    </div>
  );
}

export function MomentCard({ m, me, partner }: { m: Moment; me: Person; partner: Person }) {
  const mine = m.author_id === me.id;
  const author = mine ? me : partner;
  const [full, setFull] = useState(false);
  const [comment, setComment] = useState("");
  const [busy, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const photoUrl = `/api/sensiz/${m.id}/foto`;

  const sendComment = () =>
    start(async () => {
      setErr(null);
      const r = await commentMomentAction(m.id, comment);
      if ("error" in r && r.error) setErr(r.error);
      else setComment("");
    });

  return (
    <article className="card overflow-hidden">
      <header className="flex items-center gap-2 px-4 pt-3">
        <span className="text-xl" aria-hidden>
          {author.emoji}
        </span>
        <span className="text-sm font-black">{mine ? "Sen" : author.name}</span>
        <span className="text-xs font-semibold text-muted">· {time(m.created_at)}</span>
        <span className="flex-1" />
        {mine && (
          <button
            className="text-xs font-semibold text-muted"
            disabled={busy}
            onClick={() => {
              if (confirm("Bu paylaşım silinsin mi?")) start(async () => void (await deleteMomentAction(m.id)));
            }}
          >
            Sil
          </button>
        )}
      </header>

      {m.text && <p className="px-4 pt-2 text-[15px] leading-relaxed whitespace-pre-wrap">{m.text}</p>}

      {m.has_photo && (
        <button type="button" className="mt-3 block w-full" onClick={() => setFull(true)} aria-label="Fotoğrafı büyüt">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photoUrl} alt={m.text || `${author.name} paylaştı`} loading="lazy" className="max-h-[28rem] w-full object-cover" />
        </button>
      )}

      <div className="space-y-3 px-4 py-3">
        {mine ? (
          m.reaction && (
            <span className="chip bg-rose-soft text-ink">
              {m.reaction} {partner.name} tepki verdi
            </span>
          )
        ) : (
          <ReactionPicker key={m.id} initial={m.reaction} label="Paylaşıma" onChange={(e) => reactMomentAction(m.id, e)} />
        )}

        {m.comments.length > 0 && (
          <ul className="space-y-1.5">
            {m.comments.map((c) => {
              const who = c.author_id === me.id ? me : partner;
              return (
                <li key={c.id} className="flex items-start gap-2 rounded-xl bg-bg px-3 py-2 text-sm">
                  <span aria-hidden>{who.emoji}</span>
                  <span className="min-w-0 flex-1">
                    <b className="font-semibold">{c.author_id === me.id ? "Sen" : who.name}</b>{" "}
                    <span className="whitespace-pre-wrap">{c.text}</span>
                    <span className="ml-1 text-xs text-muted">{time(c.created_at)}</span>
                  </span>
                  {c.author_id === me.id && (
                    <button
                      className="text-xs text-muted"
                      aria-label="Yorumu sil"
                      disabled={busy}
                      onClick={() => start(async () => void (await deleteCommentAction(c.id)))}
                    >
                      ✕
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <div className="flex gap-2">
          <input
            className="input px-3 py-2 text-sm"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && comment.trim()) sendComment();
            }}
            placeholder="Yorum yaz…"
            maxLength={300}
            aria-label="Yorum yaz"
          />
          <button className="btn bg-surface px-3 text-sm text-ink" disabled={busy || !comment.trim()} onClick={sendComment}>
            Gönder
          </button>
        </div>
        {err && <p className="text-sm font-semibold text-danger">{err}</p>}
      </div>

      {full && (
        <Portal>
          <div className="fixed inset-0 z-50 flex flex-col bg-black" onClick={() => setFull(false)} role="dialog" aria-modal="true">
            <div className="safe-top flex justify-end px-4 pb-2">
              <button className="btn bg-white/15 px-3 py-1.5 text-white">Kapat</button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoUrl} alt={m.text || "Fotoğraf"} className="min-h-0 w-full flex-1 object-contain" />
          </div>
        </Portal>
      )}
    </article>
  );
}
