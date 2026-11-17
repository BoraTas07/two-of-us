import "server-only";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { ensureSchema, getOrCreateConfig, sql } from "./db";
import { COLORS, type Profile } from "./types";

const COOKIE = "ikimiz_oturum";
const ONE_YEAR = 60 * 60 * 24 * 365;

export function hashPin(pin: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(pin, salt, 32).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPin(pin: string, stored: string): boolean {
  const [, salt, hash] = stored.split("$");
  const test = scryptSync(pin, salt, 32);
  const real = Buffer.from(hash, "hex");
  return real.length === test.length && timingSafeEqual(real, test);
}

async function secret(): Promise<string> {
  return getOrCreateConfig("session_secret", () => randomBytes(32).toString("hex"));
}

function sign(data: string, key: string): string {
  return createHmac("sha256", key).update(data).digest("base64url");
}

export async function startSession(profileId: number): Promise<void> {
  const exp = Math.floor(Date.now() / 1000) + ONE_YEAR;
  const data = `${profileId}.${exp}`;
  const value = `${data}.${sign(data, await secret())}`;
  (await cookies()).set(COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ONE_YEAR,
  });
}

export async function endSession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

export async function sessionProfileId(): Promise<number | null> {
  const value = (await cookies()).get(COOKIE)?.value;
  if (!value) return null;
  const [id, exp, sig] = value.split(".");
  if (!id || !exp || !sig) return null;
  const expected = sign(`${id}.${exp}`, await secret());
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  if (Number(exp) < Date.now() / 1000) return null;
  return Number(id);
}

export async function allProfiles(): Promise<Profile[]> {
  await ensureSchema();
  return sql<Profile[]>`
    select id, name, emoji, color, streak, best_streak, freezes, freezes_month, streak_through
    from profiles order by id`;
}

/**
 * İki kişinin renkleri aynıysa ya da artık listede olmayan bir renkse (eski sürümden kalma),
 * ikinci kişiye boştaki ilk rengi verir. Bir şey değiştiyse true döner.
 */
async function fixColors(profiles: Profile[]): Promise<boolean> {
  let changed = false;
  const used = new Set<string>();
  for (const p of profiles) {
    if (p.color in COLORS && !used.has(p.color)) {
      used.add(p.color);
      continue;
    }
    const free = Object.keys(COLORS).find((k) => !used.has(k) && !profiles.some((o) => o.id !== p.id && o.color === k))!;
    await sql`update profiles set color = ${free} where id = ${p.id}`;
    used.add(free);
    changed = true;
  }
  return changed;
}

/**
 * Giriş yapmış kişiyi ve partnerini döndürür. Giriş yoksa giriş sayfasına,
 * hiç profil yoksa kurulum sayfasına yönlendirir.
 */
export async function requireUser(): Promise<{ me: Profile; partner: Profile }> {
  await connection(); // her istekte yeniden oluştur, asla önceden statik üretme
  let profiles = await allProfiles();
  if (profiles.length < 2) redirect("/kurulum");
  if (await fixColors(profiles)) profiles = await allProfiles();
  const id = await sessionProfileId();
  const me = profiles.find((p) => p.id === id);
  if (!me) redirect("/giris");
  const partner = profiles.find((p) => p.id !== me.id)!;
  return { me, partner };
}

// ---------------------------------------------------------------- bildirim işlemleri
// Bildirimdeki "Tamamla" / "Onayla" butonları için imzalı, süreli anahtar.
// Uygulama açık olmasa bile hangi kişinin hangi işlemi yapabileceğini gösterir.

export type ActionKind = "complete" | "decide";

export async function signAction(kind: ActionKind, profileId: number, id: number, ttlSec = 3 * 24 * 3600) {
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  const data = `act.${kind}.${profileId}.${id}.${exp}`;
  return `${data}.${sign(data, await secret())}`;
}

export async function verifyAction(
  token: string,
): Promise<{ kind: ActionKind; profileId: number; id: number } | null> {
  const parts = String(token).split(".");
  if (parts.length !== 6 || parts[0] !== "act") return null;
  const [, kind, pid, id, exp, sig] = parts;
  if (kind !== "complete" && kind !== "decide") return null;
  const expected = sign(parts.slice(0, 5).join("."), await secret());
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  if (Number(exp) < Date.now() / 1000) return null;
  return { kind, profileId: Number(pid), id: Number(id) };
}

// ---------------------------------------------------------------- widget bağlantısı
// Ana ekran widget'ının (iPhone Scriptable / Android) salt-okunur veri çekmesi için kişiye özel,
// süresiz anahtar. "Bağlantıyı yenile" ile nonce değişir ve eski bağlantılar çalışmaz olur.

async function widgetNonce(profileId: number, renew = false): Promise<string> {
  await ensureSchema();
  if (!renew) {
    const [r] = await sql<{ widget_nonce: string | null }[]>`select widget_nonce from profiles where id = ${profileId}`;
    if (r?.widget_nonce) return r.widget_nonce;
  }
  const nonce = randomBytes(9).toString("base64url");
  await sql`update profiles set widget_nonce = ${nonce} where id = ${profileId}`;
  return nonce;
}

export async function widgetToken(profileId: number, renew = false): Promise<string> {
  const nonce = await widgetNonce(profileId, renew);
  return `w.${profileId}.${sign(`w.${profileId}.${nonce}`, await secret())}`;
}

export async function verifyWidgetToken(token: string): Promise<number | null> {
  const parts = String(token).split(".");
  if (parts.length !== 3 || parts[0] !== "w") return null;
  const pid = Number(parts[1]);
  if (!Number.isInteger(pid)) return null;
  await ensureSchema();
  const [r] = await sql<{ widget_nonce: string | null }[]>`select widget_nonce from profiles where id = ${pid}`;
  if (!r?.widget_nonce) return null;
  const expected = sign(`w.${pid}.${r.widget_nonce}`, await secret());
  const a = Buffer.from(parts[2]);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b) ? pid : null;
}
