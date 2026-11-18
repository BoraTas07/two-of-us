import "server-only";
import { ensureSchema, sql } from "./db";
import { EMOJI_NAME } from "./emoji";
import { notifyLater } from "./game";
import { MAX_PHOTO_BYTES, looksLikeImage } from "./photos";
import type { Profile } from "./types";

// "Sensiz İçime Sinmiyor": gün içinde ayrıyken görülüp beğenilen şeyler (yazı ve/veya fotoğraf).
// Paylaşımlar kalıcıdır; herkes kendi paylaşımını ve yorumunu silebilir.
// Partner bir emoji tepkisi bırakabilir; iki taraf da kısa yorum yazabilir.

export type MomentComment = { id: number; author_id: number; text: string; created_at: string };

export type Moment = {
  id: number;
  author_id: number;
  text: string;
  has_photo: boolean;
  reaction: string | null;
  created_at: string;
  comments: MomentComment[];
};

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function createMoment(
  me: Profile,
  partner: Profile,
  text: string,
  photo: { bytes: Buffer; mime: string } | null,
): Promise<string | null> {
  await ensureSchema();
  const t = text.trim().slice(0, 500);
  if (!t && !photo) return "Bir şey yaz ya da fotoğraf ekle.";
  if (photo) {
    if (!ALLOWED.has(photo.mime)) return "Sadece fotoğraf (JPEG/PNG/WebP) gönderilebilir.";
    if (photo.bytes.length === 0 || photo.bytes.length > MAX_PHOTO_BYTES) return "Fotoğraf çok büyük.";
    if (!looksLikeImage(photo.bytes, photo.mime)) return "Dosya bir fotoğraf gibi görünmüyor.";
  }
  const [{ n }] = await sql<{ n: number }[]>`
    select count(*)::int as n from moments where author_id = ${me.id} and created_at > now() - interval '1 hour'`;
  if (n >= 60) return "Biraz yavaş 🙂 Birazdan tekrar dene.";

  await sql`
    insert into moments (author_id, text, photo, photo_mime)
    values (${me.id}, ${t}, ${photo?.bytes ?? null}, ${photo?.mime ?? null})`;
  notifyLater(partner.id, {
    title: `💌 ${me.name}: sensiz içime sinmiyor`,
    body: t ? (t.length > 90 ? t.slice(0, 90) + "…" : t) : "📷 Bir fotoğraf paylaştı",
    url: "/sensiz",
    tag: `moment-${me.id}`,
  });
  return null;
}

/** En yeniden eskiye; `before` verilirse o id'den eskiler */
export async function momentsPage(before: number | null, limit = 20): Promise<{ items: Moment[]; more: boolean }> {
  await ensureSchema();
  const rows = await sql<
    { id: number; author_id: number; text: string; has_photo: boolean; reaction: string | null; created_at: Date }[]
  >`
    select id, author_id, text, photo is not null as has_photo, reaction, created_at
    from moments ${before ? sql`where id < ${before}` : sql``}
    order by id desc limit ${limit + 1}`;
  const page = rows.slice(0, limit);
  const ids = page.map((r) => r.id);
  const comments = ids.length
    ? await sql<{ id: number; moment_id: number; author_id: number; text: string; created_at: Date }[]>`
        select id, moment_id, author_id, text, created_at from moment_comments
        where moment_id = any(${ids}::int[]) order by id`
    : [];
  return {
    more: rows.length > limit,
    items: page.map((r) => ({
      ...r,
      created_at: r.created_at.toISOString(),
      comments: comments
        .filter((c) => c.moment_id === r.id)
        .map((c) => ({ id: c.id, author_id: c.author_id, text: c.text, created_at: c.created_at.toISOString() })),
    })),
  };
}

export async function momentPhoto(id: number): Promise<{ data: Buffer; mime: string } | null> {
  await ensureSchema();
  const [r] = await sql<{ photo: Buffer | null; photo_mime: string | null }[]>`
    select photo, photo_mime from moments where id = ${id}`;
  return r?.photo && r.photo_mime ? { data: Buffer.from(r.photo), mime: r.photo_mime } : null;
}

export async function deleteMoment(me: Profile, id: number): Promise<string | null> {
  const rows = await sql`delete from moments where id = ${id} and author_id = ${me.id} returning id`;
  return rows.length ? null : "Sadece kendi paylaşımını silebilirsin.";
}

export async function reactMoment(me: Profile, id: number, emoji: string | null): Promise<string | null> {
  if (emoji !== null && !EMOJI_NAME[emoji]) return "Bu emoji kullanılamıyor.";
  const [m] = await sql<{ author_id: number; text: string }[]>`select author_id, text from moments where id = ${id}`;
  if (!m || m.author_id === me.id) return "Paylaşım bulunamadı.";
  await sql`update moments set reaction = ${emoji} where id = ${id}`;
  if (emoji) {
    notifyLater(m.author_id, {
      title: `${emoji} ${me.name} paylaşımına tepki verdi`,
      body: m.text ? m.text.slice(0, 90) : "📷 Fotoğrafın",
      url: "/sensiz",
      tag: `moment-react-${id}`,
    });
  }
  return null;
}

export async function addComment(me: Profile, partner: Profile, id: number, text: string): Promise<string | null> {
  const t = text.trim().slice(0, 300);
  if (!t) return "Yorum boş olamaz.";
  const [m] = await sql<{ id: number }[]>`select id from moments where id = ${id}`;
  if (!m) return "Paylaşım bulunamadı.";
  await sql`insert into moment_comments (moment_id, author_id, text) values (${id}, ${me.id}, ${t})`;
  notifyLater(partner.id, {
    title: `💬 ${me.name} yorum yaptı`,
    body: t.length > 90 ? t.slice(0, 90) + "…" : t,
    url: "/sensiz",
    tag: `moment-comment-${id}`,
  });
  return null;
}

export async function deleteComment(me: Profile, id: number): Promise<void> {
  await sql`delete from moment_comments where id = ${id} and author_id = ${me.id}`;
}

export async function markMomentsSeen(meId: number): Promise<void> {
  await ensureSchema();
  await sql`update profiles set moments_seen_at = now() where id = ${meId}`;
}

/** Partnerin, benim en son bakışımdan sonra paylaştıkları */
export async function unseenMoments(meId: number): Promise<{ count: number; latest: { text: string; has_photo: boolean } | null }> {
  await ensureSchema();
  const rows = await sql<{ text: string; has_photo: boolean }[]>`
    select m.text, m.photo is not null as has_photo from moments m, profiles p
    where p.id = ${meId} and m.author_id <> ${meId}
      and (p.moments_seen_at is null or m.created_at > p.moments_seen_at)
    order by m.id desc`;
  return { count: rows.length, latest: rows[0] ?? null };
}
