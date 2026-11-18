"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { addDreamAction, removeDreamAction } from "@/app/actions";
import type { Dream } from "@/lib/dreams";
import CarrotSlider from "./carrot-slider";
import { Portal, compress } from "./photo";
import { EmojiPicker } from "./pickers";
import { CarrotChip } from "./ui";

type Person = { id: number; name: string; emoji: string };

const DREAM_EMOJIS = ["🌟", "✈️", "🏖️", "🎈", "⛺", "🍝", "🎢", "🏔️", "🎤", "🐶", "🏠", "📚", "🚗", "🎨", "🌌", "💍"];

export function DreamForm() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [emoji, setEmoji] = useState("🌟");
  const [notes, setNotes] = useState("");
  const [xp, setXp] = useState(50);
  const [busy, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  if (!open)
    return (
      <button className="btn w-full bg-brand text-on-brand" onClick={() => setOpen(true)}>
        + Yeni hayal ekle
      </button>
    );

  const save = () =>
    start(async () => {
      setErr(null);
      const r = await addDreamAction(title, emoji, notes, xp);
      if ("error" in r && r.error) return setErr(r.error);
      setTitle("");
      setNotes("");
      setOpen(false);
    });

  return (
    <div className="card animate-pop space-y-3 p-4">
      <input
        className="input"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Örn: Kapadokya'da balona binmek"
        maxLength={120}
        aria-label="Hayal"
        autoFocus
      />
      <EmojiPicker name="emoji" options={DREAM_EMOJIS} value={emoji} onChange={setEmoji} />
      <textarea
        className="input min-h-16 text-sm"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Not (isteğe bağlı): ne zaman, nerede…"
        maxLength={500}
        aria-label="Not"
      />
      <div>
        <div className="mb-1 px-1 text-sm font-black">Gerçekleşince ikinize de kaç havuç?</div>
        <CarrotSlider name="xp" value={xp} onChange={setXp} />
      </div>
      {err && <p className="text-sm font-semibold text-danger">{err}</p>}
      <div className="grid grid-cols-2 gap-2">
        <button className="btn bg-surface text-muted" onClick={() => setOpen(false)} disabled={busy}>
          Vazgeç
        </button>
        <button className="btn bg-brand text-on-brand" onClick={save} disabled={busy || !title.trim()}>
          Ekle
        </button>
      </div>
    </div>
  );
}

export function DreamCard({ d, me, partner }: { d: Dream; me: Person; partner: Person }) {
  const [sheet, setSheet] = useState(false);
  const [full, setFull] = useState(false);
  const [busy, start] = useTransition();
  const creator = d.creator_id === me.id ? "Sen ekledin" : `${partner.name} ekledi`;

  if (d.done_at) {
    const who = d.done_by === me.id ? me : partner;
    return (
      <article className="card overflow-hidden">
        {d.has_photo && (
          <button type="button" className="block w-full" onClick={() => setFull(true)} aria-label="Fotoğrafı büyüt">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/hayaller/${d.id}/foto`} alt={d.title} loading="lazy" className="max-h-72 w-full object-cover" />
          </button>
        )}
        <div className="flex items-center gap-3 p-3">
          <span className="text-2xl">{d.emoji}</span>
          <div className="min-w-0 flex-1">
            <div className="font-extrabold">{d.title}</div>
            <div className="text-xs font-semibold text-muted">
              ✨ {new Date(d.done_at).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Istanbul" })}{" "}
              · {who.emoji} işaretledi · ikinize +{d.xp} 🥕
            </div>
          </div>
        </div>
        {full && (
          <Portal>
            <div className="fixed inset-0 z-50 flex flex-col bg-black" onClick={() => setFull(false)} role="dialog" aria-modal="true">
              <div className="safe-top flex justify-end px-4 pb-2">
                <button className="btn bg-white/15 px-3 py-1.5 text-white">Kapat</button>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/hayaller/${d.id}/foto`} alt={d.title} className="min-h-0 w-full flex-1 object-contain" />
            </div>
          </Portal>
        )}
      </article>
    );
  }

  return (
    <article className="card p-3">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rose-soft text-xl">{d.emoji}</span>
        <div className="min-w-0 flex-1">
          <div className="leading-tight font-extrabold">{d.title}</div>
          <div className="mt-1 flex flex-wrap items-center gap-1 text-xs font-semibold text-muted">
            <CarrotChip n={d.xp} /> ikinize · {creator}
          </div>
        </div>
        <button className="btn shrink-0 bg-brand px-3 py-2 text-sm text-on-brand" onClick={() => setSheet(true)}>
          ✨ Yaptık
        </button>
      </div>
      {d.notes && <p className="mt-2 rounded-xl bg-bg px-3 py-2 text-sm whitespace-pre-wrap">{d.notes}</p>}
      {d.creator_id === me.id && (
        <button
          className="mt-2 px-1 text-xs font-semibold text-muted"
          disabled={busy}
          onClick={() => confirm("Bu hayal listeden silinsin mi?") && start(async () => void (await removeDreamAction(d.id)))}
        >
          Sil
        </button>
      )}
      {sheet && <CompleteSheet d={d} onClose={() => setSheet(false)} />}
    </article>
  );
}

function CompleteSheet({ d, onClose }: { d: Dream; onClose: () => void }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
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
    setBusy(true);
    setErr(null);
    const fd = new FormData();
    if (blob) fd.append("photo", new File([blob], "hayal.jpg", { type: "image/jpeg" }));
    try {
      const res = await fetch(`/api/hayaller/${d.id}/tamamla`, { method: "POST", body: fd });
      const r = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(r.error ?? "Kaydedilemedi");
      onClose();
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={onClose} role="dialog" aria-modal="true">
        <div className="safe-bottom mx-auto w-full max-w-md rounded-t-3xl bg-surface p-5" onClick={(e) => e.stopPropagation()}>
          <div className="text-center text-4xl">{d.emoji}</div>
          <h2 className="mt-1 text-center text-xl">{d.title}</h2>
          <p className="mt-1 text-center text-sm font-semibold text-muted">
            Gerçekleşti mi? Bir anı fotoğrafı ekle, ikinize de +{d.xp} 🥕
          </p>
          <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} aria-label="Fotoğraf seç" />
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Seçilen fotoğraf" className="mt-3 max-h-64 w-full rounded-2xl object-cover" />
          ) : null}
          {err && <p className="mt-2 text-sm font-semibold text-danger">{err}</p>}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button className="btn bg-bg text-ink" disabled={busy} onClick={() => input.current?.click()}>
              📷 {preview ? "Değiştir" : "Fotoğraf"}
            </button>
            <button className="btn bg-brand text-on-brand" disabled={busy} onClick={send}>
              {busy ? "..." : preview ? "✨ Kaydet" : "✨ Fotoğrafsız kaydet"}
            </button>
          </div>
          <button className="mt-3 w-full text-sm font-semibold text-muted" onClick={onClose}>
            Vazgeç
          </button>
        </div>
      </div>
    </Portal>
  );
}
