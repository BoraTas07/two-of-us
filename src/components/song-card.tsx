"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { reactSongAction, removeSongAction, shareSongAction } from "@/app/actions";
import { EMOJI_NAME } from "@/lib/emoji";
import ReactionPicker from "./reaction-picker";
import { PROVIDER_LABEL, parseSongLink } from "@/lib/song-link";
import type { Song } from "@/lib/songs";

/** Spotify / YouTube / Apple Music için gömülü oynatıcı; diğerleri için link */
export function SongPlayer({ song, compact = false }: { song: Song; compact?: boolean }) {
  const parsed = song.url ? parseSongLink(song.url) : null;
  if (!parsed) return null;
  if (!parsed.embedUrl || compact) {
    return (
      <a href={parsed.url} target="_blank" rel="noopener" className="chip bg-line px-3 py-1.5 text-ink">
        ▶ {PROVIDER_LABEL[parsed.provider]}&apos;da dinle
      </a>
    );
  }
  const allow = "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";
  if (parsed.provider === "youtube") {
    return (
      <iframe
        src={parsed.embedUrl}
        title={song.title}
        className="aspect-video w-full rounded-xl"
        allow={allow}
        allowFullScreen
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    );
  }
  return (
    <iframe
      src={parsed.embedUrl}
      title={song.title}
      className="w-full rounded-xl"
      height={parsed.provider === "spotify" ? 80 : 175}
      allow={allow}
      loading="lazy"
    />
  );
}

function ShareForm({ onDone, initial }: { onDone: () => void; initial?: Song | null }) {
  const [state, action, pending] = useActionState(shareSongAction, undefined);
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);
  return (
    <form action={action} className="space-y-2">
      <input
        className="input"
        name="url"
        inputMode="url"
        defaultValue={initial?.url ?? ""}
        placeholder="Spotify / YouTube / Apple Music linki"
        autoComplete="off"
      />
      <input
        className="input"
        name="title"
        defaultValue={initial && !initial.url ? initial.title : ""}
        placeholder="…ya da şarkı adı — sanatçı (link varsa boş bırak)"
        maxLength={150}
        autoComplete="off"
      />
      <input
        className="input"
        name="note"
        defaultValue={initial?.note ?? ""}
        placeholder="Not ekle (isteğe bağlı)"
        maxLength={200}
        autoComplete="off"
      />
      {state?.error && <p className="text-sm font-semibold text-danger">{state.error}</p>}
      <button className="btn w-full bg-brand text-white" disabled={pending}>
        {pending ? "Paylaşılıyor..." : "🎵 Paylaş"}
      </button>
    </form>
  );
}

export default function SongCard({
  mine,
  theirs,
  partner,
}: {
  mine: Song | null;
  theirs: Song | null;
  partner: { name: string; emoji: string };
}) {
  const [editing, setEditing] = useState(false);
  const [busy, start] = useTransition();

  return (
    <div className="card p-4">
      {/* Partnerin şarkısı */}
      {theirs ? (
        <div>
          <div className="text-xs font-semibold text-muted">
            {partner.emoji} {partner.name} paylaştı
          </div>
          <div className="mt-0.5 font-black leading-snug">{theirs.title}</div>
          {theirs.artist && <div className="text-sm font-semibold text-muted">{theirs.artist}</div>}
          {theirs.note && <p className="mt-1.5 text-sm italic">&ldquo;{theirs.note}&rdquo;</p>}
          <div className="mt-2">
            <SongPlayer song={theirs} />
          </div>
          <div className="mt-3">
            <ReactionPicker
              key={theirs.id}
              initial={theirs.reaction}
              label="Şarkıya"
              onChange={(e) => reactSongAction(theirs.id, e)}
            />
          </div>
        </div>
      ) : (
        <p className="text-sm font-semibold text-muted">
          {partner.emoji} {partner.name} bugün henüz şarkı paylaşmadı.
        </p>
      )}

      <div className="my-4 border-t border-line" />

      {/* Benim şarkım */}
      {mine && !editing ? (
        <div>
          <div className="text-xs font-semibold text-muted">Senin şarkın</div>
          <div className="mt-0.5 font-black leading-snug">{mine.title}</div>
          {mine.artist && <div className="text-sm font-semibold text-muted">{mine.artist}</div>}
          {mine.note && <p className="mt-1 text-sm italic">&ldquo;{mine.note}&rdquo;</p>}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <SongPlayer song={mine} compact />
            {mine.reaction && (
              <span className="chip bg-rose-soft text-ink" title={EMOJI_NAME[mine.reaction] ?? ""}>
                {mine.reaction} {partner.name} tepki verdi
              </span>
            )}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button className="btn bg-surface text-sm text-ink" onClick={() => setEditing(true)}>
              Değiştir
            </button>
            <button
              className="btn bg-surface text-sm text-muted"
              disabled={busy}
              onClick={() => {
                if (confirm("Bugünkü şarkın kaldırılsın mı?")) start(async () => void (await removeSongAction()));
              }}
            >
              Kaldır
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div className="mb-2 text-sm font-black">{mine ? "Şarkını değiştir" : "Bugün hangi şarkı?"}</div>
          <ShareForm initial={mine} onDone={() => setEditing(false)} />
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
