import "server-only";
import * as webpush from "web-push";
import { getOrCreateConfig, sql } from "./db";

// Bildirim anahtarları ilk ihtiyaçta otomatik üretilip veritabanında saklanır.
// Böylece kurulumda ayrıca anahtar oluşturmaya gerek kalmaz.

type Keys = { publicKey: string; privateKey: string };

async function vapidKeys(): Promise<Keys> {
  const raw = await getOrCreateConfig("vapid_keys", () =>
    JSON.stringify(webpush.generateVAPIDKeys()),
  );
  return JSON.parse(raw) as Keys;
}

export async function vapidPublicKey(): Promise<string> {
  return (await vapidKeys()).publicKey;
}

function subject(): string {
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  // Apple, "localhost" içeren bir adresi reddeder; o yüzden yedek olarak e-posta biçimi kullanılır.
  return host ? `https://${host}` : "mailto:bildirim@twoofus.app";
}

export type PushMessage = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

export async function saveSubscription(
  profileId: number,
  sub: { endpoint: string; keys: { p256dh: string; auth: string } },
): Promise<void> {
  await sql`
    insert into push_subscriptions (endpoint, profile_id, keys)
    values (${sub.endpoint}, ${profileId}, ${sql.json(sub.keys)})
    on conflict (endpoint) do update set profile_id = excluded.profile_id, keys = excluded.keys`;
}

export async function removeSubscription(endpoint: string): Promise<void> {
  await sql`delete from push_subscriptions where endpoint = ${endpoint}`;
}

export async function hasSubscription(profileId: number): Promise<boolean> {
  const rows = await sql`select 1 from push_subscriptions where profile_id = ${profileId} limit 1`;
  return rows.length > 0;
}

/** Bir kişinin kayıtlı tüm cihazlarına bildirim gönderir. Hata uygulamayı durdurmaz. */
export async function sendPush(profileId: number, msg: PushMessage): Promise<number> {
  try {
    const subs = await sql<{ endpoint: string; keys: { p256dh: string; auth: string } }[]>`
      select endpoint, keys from push_subscriptions where profile_id = ${profileId}`;
    if (subs.length === 0) return 0;
    const keys = await vapidKeys();
    const payload = JSON.stringify({ url: "/", ...msg });
    let sent = 0;
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, payload, {
            vapidDetails: { subject: subject(), publicKey: keys.publicKey, privateKey: keys.privateKey },
            TTL: 60 * 60 * 12,
            urgency: "high",
          });
          sent++;
        } catch (e) {
          const status = (e as { statusCode?: number }).statusCode;
          // 404/410: cihaz aboneliği artık geçerli değil, temizle.
          if (status === 404 || status === 410) await removeSubscription(s.endpoint);
          else console.error("Bildirim gönderilemedi:", status, (e as Error).message);
        }
      }),
    );
    return sent;
  } catch (e) {
    console.error("Bildirim hatası:", e);
    return 0;
  }
}

/** Aynı bildirimin iki kez gitmesini engellemek için anahtar kaydı. İlk kez ise true döner. */
export async function markSent(key: string): Promise<boolean> {
  const rows = await sql`insert into sent_log (key) values (${key}) on conflict do nothing returning key`;
  return rows.length > 0;
}

export async function cronKey(): Promise<string> {
  const { randomBytes } = await import("node:crypto");
  return getOrCreateConfig("cron_key", () => randomBytes(18).toString("base64url"));
}

