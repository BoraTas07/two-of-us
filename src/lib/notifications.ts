import "server-only";
import { ensureSchema, sql } from "./db";
import type { PushMessage } from "./push";

// Uygulama içi bildirim merkezi (🔔). Partnerin yaptığı her şey `notifyLater` üzerinden
// buraya da yazılır; üst çubukta okunmamış sayısı görünür.

export type AppNotification = {
  id: number;
  title: string;
  body: string;
  url: string;
  created_at: string;
  read: boolean;
};

/** Bildirimi kaydet; hata olursa sessizce geç (asıl işlemi bozmasın) */
export async function storeNotification(profileId: number, msg: PushMessage): Promise<void> {
  try {
    await ensureSchema();
    await sql`insert into notifications (profile_id, title, body, url)
              values (${profileId}, ${msg.title.slice(0, 200)}, ${(msg.body ?? "").slice(0, 400)}, ${msg.url ?? "/"})`;
  } catch (e) {
    console.error("Bildirim kaydedilemedi:", e);
  }
}

export async function unreadCount(profileId: number): Promise<number> {
  await ensureSchema();
  const [r] = await sql<{ n: number }[]>`
    select count(*)::int as n from notifications where profile_id = ${profileId} and read_at is null`;
  return r.n;
}

export async function listNotifications(profileId: number, limit = 60): Promise<AppNotification[]> {
  await ensureSchema();
  const rows = await sql<{ id: number; title: string; body: string; url: string; created_at: Date; read: boolean }[]>`
    select id, title, body, url, created_at, read_at is not null as read from notifications
    where profile_id = ${profileId} order by created_at desc limit ${limit}`;
  return rows.map((r) => ({ ...r, created_at: r.created_at.toISOString() }));
}

export async function markAllRead(profileId: number): Promise<void> {
  await sql`update notifications set read_at = now() where profile_id = ${profileId} and read_at is null`;
}

/** 60 günden eski bildirimleri sil (zamanlayıcıdan) */
export async function purgeOldNotifications(): Promise<void> {
  await ensureSchema();
  await sql`delete from notifications where created_at < now() - interval '60 days'`;
}
