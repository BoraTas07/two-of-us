import "server-only";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { ensureSchema, getOrCreateConfig, sql } from "./db";
import type { Profile } from "./types";

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
 * Giriş yapmış kişiyi ve partnerini döndürür. Giriş yoksa giriş sayfasına,
 * hiç profil yoksa kurulum sayfasına yönlendirir.
 */
export async function requireUser(): Promise<{ me: Profile; partner: Profile }> {
  await connection(); // her istekte yeniden oluştur, asla önceden statik üretme
  const profiles = await allProfiles();
  if (profiles.length < 2) redirect("/kurulum");
  const id = await sessionProfileId();
  const me = profiles.find((p) => p.id === id);
  if (!me) redirect("/giris");
  const partner = profiles.find((p) => p.id !== me.id)!;
  return { me, partner };
}
