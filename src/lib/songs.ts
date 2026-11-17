import "server-only";
import { ensureSchema, sql } from "./db";
import { notifyLater } from "./game";
import { EMOJI_NAME } from "./emoji";
import { parseSongLink, type SongProvider } from "./song-link";
import { todayStr } from "./time";
import type { Profile } from "./types";

export type Song = {
  id: number;
  profile_id: number;
  day: string;
  url: string | null;
  provider: SongProvider;
  title: string;
  artist: string;
  thumb: string | null;
  note: string;
  /** Partnerin bu şarkıya bıraktığı emoji (yoksa null) */
  reaction: string | null;
};

type Meta = { title: string; artist: string; thumb: string | null };

/** Spotify / YouTube'un herkese açık oEmbed servisinden şarkı adı ve kapak (5 sn sınırla) */
async function fetchMeta(url: string, provider: SongProvider): Promise<Meta | null> {
  const endpoint =
    provider === "youtube"
      ? `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`
      : provider === "spotify"
        ? `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`
        : null;
  if (endpoint) {
    try {
      const r = await fetch(endpoint, { signal: AbortSignal.timeout(5000), cache: "no-store" });
      if (r.ok) {
        const j = (await r.json()) as { title?: string; author_name?: string; thumbnail_url?: string };
        if (j.title) {
          const author = provider === "youtube" ? (j.author_name ?? "").replace(/ - Topic$/, "") : "";
          return { title: j.title.slice(0, 150), artist: author.slice(0, 100), thumb: j.thumbnail_url ?? null };
        }
      }
    } catch {
      // ad alınamazsa elle girilen ada düşülür
    }
  }
  if (provider === "apple") {
    // music.apple.com/tr/album/<albüm-adı>/123?i=456 → adresteki okunabilir ad
    const slug = new URL(url).pathname.split("/")[3];
    if (slug) return { title: decodeURIComponent(slug).replace(/-/g, " ").slice(0, 150), artist: "", thumb: null };
  }
  return null;
}

function cleanThumb(t: string | null): string | null {
  if (!t) return null;
  try {
    const u = new URL(t);
    return u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

export async function shareSong(
  me: Profile,
  partner: Profile,
  data: { url: string; title: string; note: string },
): Promise<string | null> {
  await ensureSchema();
  const rawUrl = data.url.trim();
  const parsed = rawUrl ? parseSongLink(rawUrl) : null;
  if (rawUrl && !parsed) return "Bu bir şarkı linki gibi görünmüyor.";
  const meta = parsed ? await fetchMeta(parsed.url, parsed.provider) : null;
  const title = (data.title.trim() || meta?.title || "").slice(0, 150);
  if (!title) return parsed ? "Şarkının adı alınamadı; adını da yazar mısın?" : "Link yapıştır ya da şarkının adını yaz.";
  const note = data.note.trim().slice(0, 200);
  const day = todayStr();

  const [prev] = await sql<{ id: number }[]>`select id from songs where profile_id = ${me.id} and day = ${day}`;
  await sql`
    insert into songs (profile_id, day, url, provider, title, artist, thumb, note)
    values (${me.id}, ${day}, ${parsed?.url ?? null}, ${parsed?.provider ?? "other"}, ${title},
            ${data.title.trim() ? "" : (meta?.artist ?? "")}, ${cleanThumb(meta?.thumb ?? null)}, ${note})
    on conflict (profile_id, day) do update set url = excluded.url, provider = excluded.provider,
      title = excluded.title, artist = excluded.artist, thumb = excluded.thumb, note = excluded.note,
      liked_at = null, reaction = null, created_at = now()`;
  notifyLater(partner.id, {
    title: prev ? `🎵 ${me.name} günün şarkısını değiştirdi` : `🎵 ${me.name} günün şarkısını paylaştı`,
    body: `${title}${note ? ` — "${note}"` : ""}`,
    url: "/#sarki",
    tag: `song-${me.id}`,
  });
  return null;
}

export async function removeTodaySong(me: Profile): Promise<void> {
  await sql`delete from songs where profile_id = ${me.id} and day = ${todayStr()}`;
}

/** Partnerin şarkısına emoji tepkisi bırak; null ile kaldır */
export async function reactSong(me: Profile, songId: number, emoji: string | null): Promise<string | null> {
  if (emoji !== null && !EMOJI_NAME[emoji]) return "Bu emoji kullanılamıyor.";
  const [s] = await sql<{ profile_id: number; title: string }[]>`select profile_id, title from songs where id = ${songId}`;
  if (!s || s.profile_id === me.id) return "Şarkı bulunamadı.";
  await sql`update songs set reaction = ${emoji}, liked_at = ${emoji ? sql`now()` : null} where id = ${songId}`;
  if (emoji) {
    notifyLater(s.profile_id, {
      title: `${emoji} ${me.name} şarkına tepki verdi`,
      body: s.title,
      url: "/#sarki",
      tag: `song-like-${songId}`,
    });
  }
  return null;
}

export async function songsForDay(day = todayStr()): Promise<Song[]> {
  await ensureSchema();
  return sql<Song[]>`select id, profile_id, day, url, provider, title, artist, thumb, note,
      coalesce(reaction, case when liked_at is not null then '❤️' end) as reaction
    from songs where day = ${day}`;
}

export async function songHistory(limit = 60): Promise<Song[]> {
  await ensureSchema();
  return sql<Song[]>`select id, profile_id, day, url, provider, title, artist, thumb, note,
      coalesce(reaction, case when liked_at is not null then '❤️' end) as reaction
    from songs order by day desc, profile_id limit ${limit}`;
}
