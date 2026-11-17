import "server-only";
import { ensureSchema, sql, txGuard } from "./db";
import { notifyLater } from "./game";
import type { Profile } from "./types";

// Tek gösterimlik kanıt fotoğrafı: onay bekleyen bir tamamlamaya, tamamlayan kişi ekler.
// Onaylayacak kişi bir kez açabilir; açıldığı anda fotoğraf verisi veritabanından silinir.
// Onay/ret anında ya da 3 gün açılmazsa da silinir. Gönderen kişi fotoğrafı tekrar göremez.

export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

export type PhotoState = "sent" | "viewed" | null;

/** Yükleme: sadece kendi, onay bekleyen tamamlamana */
export async function attachPhoto(
  me: Profile,
  completionId: number,
  bytes: Buffer,
  mime: string,
): Promise<string | null> {
  await ensureSchema();
  if (!ALLOWED.has(mime)) return "Sadece fotoğraf (JPEG/PNG/WebP) gönderilebilir.";
  if (bytes.length === 0 || bytes.length > MAX_PHOTO_BYTES) return "Fotoğraf çok büyük.";
  if (!looksLikeImage(bytes, mime)) return "Dosya bir fotoğraf gibi görünmüyor.";

  const [c] = await sql<{ id: number; profile_id: number; status: string; title: string; emoji: string; partner_id: number }[]>`
    select c.id, c.profile_id, c.status, t.title, t.emoji,
      (select id from profiles where id <> c.profile_id order by id limit 1) as partner_id
    from completions c join tasks t on t.id = c.task_id where c.id = ${completionId}`;
  if (!c || c.profile_id !== me.id) return "Görev bulunamadı.";
  if (c.status !== "pending") return "Bu görev artık onay beklemiyor.";

  const [prev] = await sql<{ viewed: boolean }[]>`
    select viewed_at is not null as viewed from photos where completion_id = ${c.id}`;
  if (prev?.viewed) return "Fotoğrafın zaten görüldü.";

  await sql`
    insert into photos (completion_id, uploader_id, mime, data)
    values (${c.id}, ${me.id}, ${mime}, ${bytes})
    on conflict (completion_id) do update set mime = excluded.mime, data = excluded.data, created_at = now()`;
  notifyLater(c.partner_id, {
    title: `📷 ${me.name} kanıt fotoğrafı gönderdi`,
    body: `${c.emoji} ${c.title} — tek gösterimlik, açınca silinir`,
    url: "/#onay",
    tag: `approve-${c.id}`,
  });
  return null;
}

/**
 * Tek seferlik görüntüleme: veriyi döndürür ve aynı anda siler. Sadece onaylayacak kişi
 * (gönderen olmayan) açabilir. İkinci açılışta null döner.
 */
export async function takePhoto(me: Profile, completionId: number): Promise<{ data: Buffer; mime: string } | null> {
  await ensureSchema();
  let photo: { data: Buffer; mime: string } | null = null;
  // Kilitle → oku → sil: aynı anda iki açma denemesinden sadece biri fotoğrafı alır
  await sql.begin(async (tx) => {
    await txGuard(tx);
    const [p] = await tx<{ data: Buffer; mime: string }[]>`
      select data, mime from photos
      where completion_id = ${completionId} and uploader_id <> ${me.id} and data is not null
      for update`;
    if (!p) return;
    await tx`update photos set data = null, viewed_at = now() where completion_id = ${completionId}`;
    photo = { data: Buffer.from(p.data), mime: p.mime };
  });
  return photo;
}

/** Tamamlama id'si → fotoğraf durumu */
export async function photoStates(completionIds: number[]): Promise<Map<number, PhotoState>> {
  await ensureSchema();
  if (completionIds.length === 0) return new Map();
  const rows = await sql<{ completion_id: number; viewed: boolean }[]>`
    select completion_id, viewed_at is not null as viewed from photos
    where completion_id = any(${completionIds}::int[])`;
  return new Map(rows.map((r) => [r.completion_id, r.viewed ? "viewed" : "sent"]));
}

/** Onay/ret sonrası: veri silinir (görülmemiş olsa bile) */
export async function dropPhoto(completionId: number) {
  await sql`update photos set data = null where completion_id = ${completionId}`;
}

/** 3 günden eski, açılmamış fotoğrafları sil (zamanlayıcıdan çağrılır) */
export async function purgeOldPhotos() {
  await ensureSchema();
  await sql`update photos set data = null where data is not null and created_at < now() - interval '3 days'`;
}

function looksLikeImage(b: Buffer, mime: string): boolean {
  if (mime === "image/jpeg") return b[0] === 0xff && b[1] === 0xd8;
  if (mime === "image/png") return b.subarray(0, 4).toString("hex") === "89504e47";
  if (mime === "image/webp") return b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP";
  return false;
}
