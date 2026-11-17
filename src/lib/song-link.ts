// Şarkı linklerini tanır ve gömülü oynatıcı adresine çevirir. Sunucu ve istemci ortak kullanır.

export type SongProvider = "spotify" | "youtube" | "apple" | "other";

export type ParsedSong = {
  provider: SongProvider;
  /** Uygulama içinde oynatıcı olarak gösterilecek adres (yoksa sadece link) */
  embedUrl: string | null;
  /** Kayıtta tutulacak temiz link */
  url: string;
};

const YT_ID = /^[A-Za-z0-9_-]{11}$/;

export function parseSongLink(raw: string): ParsedSong | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  const host = u.hostname.replace(/^www\./, "").replace(/^m\./, "");
  const parts = u.pathname.split("/").filter(Boolean);

  // Spotify: open.spotify.com/track/ID, /intl-tr/track/ID, album, playlist, episode
  if (host === "open.spotify.com") {
    const i = parts.findIndex((p) => ["track", "album", "playlist", "episode"].includes(p));
    if (i >= 0 && parts[i + 1] && /^[A-Za-z0-9]+$/.test(parts[i + 1])) {
      const kind = parts[i];
      const id = parts[i + 1];
      return {
        provider: "spotify",
        embedUrl: `https://open.spotify.com/embed/${kind}/${id}`,
        url: `https://open.spotify.com/${kind}/${id}`,
      };
    }
    return { provider: "spotify", embedUrl: null, url: u.toString() };
  }
  if (host === "spotify.link" || host === "spotify.app.link") {
    return { provider: "spotify", embedUrl: null, url: u.toString() };
  }

  // YouTube / YouTube Music
  let yt: string | null = null;
  if (host === "youtu.be") yt = parts[0] ?? null;
  else if (host === "youtube.com" || host === "music.youtube.com") {
    if (parts[0] === "watch") yt = u.searchParams.get("v");
    else if (parts[0] === "shorts" || parts[0] === "embed" || parts[0] === "live") yt = parts[1] ?? null;
  }
  if (yt !== null) {
    if (!YT_ID.test(yt)) return null;
    return {
      provider: "youtube",
      embedUrl: `https://www.youtube-nocookie.com/embed/${yt}`,
      url: host === "music.youtube.com" ? `https://music.youtube.com/watch?v=${yt}` : `https://www.youtube.com/watch?v=${yt}`,
    };
  }

  // Apple Music: music.apple.com/tr/album/...?i=123 → embed.music.apple.com/...
  if (host === "music.apple.com") {
    return {
      provider: "apple",
      embedUrl: `https://embed.music.apple.com${u.pathname}${u.search}`,
      url: u.toString(),
    };
  }

  return { provider: "other", embedUrl: null, url: u.toString() };
}

export const PROVIDER_LABEL: Record<SongProvider, string> = {
  spotify: "Spotify",
  youtube: "YouTube",
  apple: "Apple Music",
  other: "Link",
};
