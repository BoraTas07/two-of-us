"use client";

import { useState, useTransition } from "react";
import { addDeedAction, removeDeedAction, thankDeedAction } from "@/app/actions";
import { DEED_PRESETS } from "@/lib/mood-options";
import type { Deed } from "@/lib/moods";

export default function DeedCard({
  meId,
  deeds,
  partner,
}: {
  meId: number;
  deeds: Deed[];
  partner: { name: string; emoji: string };
}) {
  const [open, setOpen] = useState(false);
  const [emoji, setEmoji] = useState("💝");
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const forMe = deeds.filter((d) => d.from_id !== meId);
  const mine = deeds.filter((d) => d.from_id === meId);

  const save = () =>
    start(async () => {
      setErr(null);
      const r = await addDeedAction(emoji, text);
      if ("error" in r && r.error) {
        setErr(r.error);
        return;
      }
      setText("");
      setEmoji("💝");
      setOpen(false);
    });

  return (
    <div className="card p-4">
      {forMe.length > 0 && (
        <div className="mb-3">
          <div className="mb-1.5 text-xs font-semibold text-muted">
            {partner.emoji} {partner.name} bugün senin için
          </div>
          <ul className="space-y-1.5">
            {forMe.map((d) => (
              <li key={d.id} className="flex items-center gap-2 rounded-xl bg-rose-soft px-3 py-2 text-sm font-semibold">
                <span className="text-lg">{d.emoji}</span>
                <span className="min-w-0 flex-1">{d.text}</span>
                {d.thanked ? (
                  <span className="text-xs text-muted">❤️ teşekkür ettin</span>
                ) : (
                  <button
                    className="btn bg-surface px-2.5 py-1 text-xs text-ink"
                    disabled={busy}
                    onClick={() => start(async () => void (await thankDeedAction(d.id)))}
                  >
                    ❤️ Teşekkür et
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {mine.length > 0 && (
        <div className="mb-3">
          <div className="mb-1.5 text-xs font-semibold text-muted">Bugün {partner.name} için yaptıkların</div>
          <ul className="space-y-1.5">
            {mine.map((d) => (
              <li key={d.id} className="flex items-center gap-2 rounded-xl bg-bg px-3 py-2 text-sm font-semibold">
                <span className="text-lg">{d.emoji}</span>
                <span className="min-w-0 flex-1">{d.text}</span>
                {d.thanked && <span className="text-xs text-muted">❤️ teşekkür etti</span>}
                <button
                  className="px-1 text-muted"
                  aria-label="Sil"
                  disabled={busy}
                  onClick={() => start(async () => void (await removeDeedAction(d.id)))}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!open ? (
        <button className="btn w-full bg-brand text-white" onClick={() => setOpen(true)}>
          💝 Bugün {partner.name} için ne yaptın?
        </button>
      ) : (
        <div className="animate-pop space-y-2">
          <div className="text-sm font-black">Bugün {partner.name} için ne yaptın?</div>
          <div className="flex flex-wrap gap-1.5">
            {DEED_PRESETS.map((p) => (
              <button
                key={p.text}
                type="button"
                onClick={() => {
                  setEmoji(p.emoji);
                  setText(p.text);
                }}
                className={`chip px-3 py-1.5 ${text === p.text ? "bg-brand text-white" : "bg-bg text-ink"}`}
              >
                {p.emoji} {p.text}
              </button>
            ))}
          </div>
          <input
            className="input text-sm"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (!DEED_PRESETS.some((p) => p.text === e.target.value)) setEmoji("💝");
            }}
            placeholder="…ya da kendin yaz"
            maxLength={140}
          />
          {err && <p className="text-sm font-semibold text-danger">{err}</p>}
          <div className="grid grid-cols-2 gap-2">
            <button className="btn bg-surface text-muted" onClick={() => setOpen(false)}>
              Vazgeç
            </button>
            <button className="btn bg-brand text-white" disabled={busy || !text.trim()} onClick={save}>
              Kaydet
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
