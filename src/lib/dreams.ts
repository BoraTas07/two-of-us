import "server-only";
import { ensureSchema, sql } from "./db";
import { MAX_CARROTS, MIN_CARROTS } from "./carrots";
import { notifyLater } from "./game";
import { MAX_PHOTO_BYTES, looksLikeImage } from "./photos";
import { todayStr } from "./time";
import type { Profile } from "./types";

// "Birlikte yapacaklarımız": ortak hayal listesi. Gerçekleşince (isteğe bağlı) fotoğrafla
// işaretlenir ve ekleyenin belirlediği kadar havucu ikiniz de kazanırsınız.

export type Dream = {
  id: number;
  title: string;
  emoji: string;
  notes: string;
  creator_id: number;
  xp: number;
  done_at: string | null;
  done_by: number | null;
  has_photo: boolean;
};

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function listDreams(): Promise<Dream[]> {
  await ensureSchema();
  const rows = await sql<(Omit<Dream, "done_at"> & { done_at: Date | null })[]>`
    select id, title, emoji, notes, creator_id, xp, done_at, done_by, photo is not null as has_photo
    from dreams where not archived
    order by done_at desc nulls first, id desc`;
  return rows.map((r) => ({ ...r, done_at: r.done_at?.toISOString() ?? null }));
}

export async function addDream(me: Profile, partner: Profile, title: string, emoji: string, notes: string, xp: number) {
  await ensureSchema();
  const t = title.trim().slice(0, 120);
  if (!t) return "Hayalinizi kısaca yaz.";
  const x = Math.round(Number(xp));
  if (!Number.isFinite(x) || x < MIN_CARROTS || x > MAX_CARROTS) return `Havuç ${MIN_CARROTS}–${MAX_CARROTS} arası olmalı.`;
  const e = [...(emoji || "🌟")].slice(0, 2).join("");
  await sql`insert into dreams (title, emoji, notes, creator_id, xp)
            values (${t}, ${e}, ${notes.trim().slice(0, 500)}, ${me.id}, ${x})`;
  notifyLater(partner.id, {
    title: `🌟 ${me.name} listeye yeni bir hayal ekledi`,
    body: `${e} ${t}`,
    url: "/hayaller",
    tag: `dream-add-${me.id}`,
  });
  return null;
}

export async function removeDream(me: Profile, id: number) {
  await sql`update dreams set archived = true where id = ${id} and creator_id = ${me.id} and done_at is null`;
}

export async function completeDream(
  me: Profile,
  partner: Profile,
  id: number,
  photo: { bytes: Buffer; mime: string } | null,
): Promise<string | null> {
  await ensureSchema();
  if (photo) {
    if (!ALLOWED.has(photo.mime)) return "Sadece fotoğraf (JPEG/PNG/WebP) eklenebilir.";
    if (photo.bytes.length === 0 || photo.bytes.length > MAX_PHOTO_BYTES) return "Fotoğraf çok büyük.";
    if (!looksLikeImage(photo.bytes, photo.mime)) return "Dosya bir fotoğraf gibi görünmüyor.";
  }
  const [d] = await sql<{ title: string; emoji: string; xp: number }[]>`
    update dreams set done_at = now(), done_by = ${me.id},
      photo = ${photo?.bytes ?? null}, photo_mime = ${photo?.mime ?? null}
    where id = ${id} and not archived and done_at is null
    returning title, emoji, xp`;
  if (!d) return "Bu hayal zaten gerçekleşmiş ya da silinmiş.";
  const day = todayStr();
  for (const pid of [me.id, partner.id]) {
    await sql`insert into xp_events (profile_id, amount, kind, note, day)
              values (${pid}, ${d.xp}, 'dream', ${`Hayal: ${d.title}`}, ${day})`;
  }
  notifyLater(partner.id, {
    title: `✨ Bir hayaliniz gerçekleşti!`,
    body: `${d.emoji} ${d.title} — ikinize de +${d.xp} 🥕`,
    url: "/hayaller",
    tag: `dream-${id}`,
  });
  return null;
}

export async function dreamPhoto(id: number): Promise<{ data: Buffer; mime: string } | null> {
  const [r] = await sql<{ photo: Buffer | null; photo_mime: string | null }[]>`
    select photo, photo_mime from dreams where id = ${id}`;
  return r?.photo && r.photo_mime ? { data: r.photo, mime: r.photo_mime } : null;
}
