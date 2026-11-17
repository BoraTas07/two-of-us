import "server-only";
import { ensureSchema, sql } from "./db";
import { notifyLater } from "./game";
import { markSent } from "./push";
import type { Profile } from "./types";

// Konum paylaşımı. Kurallar:
//  - Her kişi kendi paylaşımını kendisi açar/kapatır; kapatınca kayıtlı konumu silinir.
//  - Sadece en son konum tutulur, konum geçmişi saklanmaz.
//  - Partnerin konumu yalnızca o kişinin paylaşımı açıksa okunabilir.

export type SharedLocation = { lat: number; lng: number; accuracy: number | null; updatedAt: string };

export async function sharingOf(profileId: number): Promise<boolean> {
  await ensureSchema();
  const [r] = await sql<{ sharing: boolean }[]>`select location_sharing as sharing from profiles where id = ${profileId}`;
  return !!r?.sharing;
}

export async function setSharing(me: Profile, on: boolean): Promise<void> {
  await ensureSchema();
  await sql`update profiles set location_sharing = ${on} where id = ${me.id}`;
  if (!on) await sql`delete from locations where profile_id = ${me.id}`;
}

export async function saveLocation(me: Profile, lat: number, lng: number, accuracy: number | null): Promise<string | null> {
  if (!(await sharingOf(me.id))) return "Konum paylaşımın kapalı.";
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180)
    return "Geçersiz konum.";
  const acc = accuracy !== null && Number.isFinite(accuracy) ? Math.min(100000, Math.max(0, accuracy)) : null;
  await sql`
    insert into locations (profile_id, lat, lng, accuracy) values (${me.id}, ${lat}, ${lng}, ${acc})
    on conflict (profile_id) do update set lat = excluded.lat, lng = excluded.lng,
      accuracy = excluded.accuracy, updated_at = now()`;
  return null;
}

/** Bir kişinin paylaştığı konum (paylaşımı kapalıysa null) */
export async function locationOf(profileId: number): Promise<SharedLocation | null> {
  await ensureSchema();
  const [r] = await sql<{ lat: number; lng: number; accuracy: number | null; updated_at: Date }[]>`
    select l.lat, l.lng, l.accuracy, l.updated_at from locations l
    join profiles p on p.id = l.profile_id
    where l.profile_id = ${profileId} and p.location_sharing`;
  return r ? { lat: r.lat, lng: r.lng, accuracy: r.accuracy, updatedAt: r.updated_at.toISOString() } : null;
}

/** "Konumunu paylaşır mısın?" bildirimi; 10 dakikada en fazla bir kez */
export async function requestLocation(me: Profile, partner: Profile): Promise<string | null> {
  const slot = Math.floor(Date.now() / (10 * 60 * 1000));
  if (!(await markSent(`loc:${me.id}:${slot}`))) return "Az önce istedin; biraz bekle.";
  const sharing = await sharingOf(partner.id);
  notifyLater(partner.id, {
    title: `📍 ${me.name} konumunu merak ediyor`,
    body: sharing
      ? "Uygulamayı açman yeterli; konumun güncellenir."
      : "Konum paylaşımın kapalı. İstersen Konum sayfasından açabilirsin.",
    url: "/konum",
    tag: `loc-request-${me.id}`,
  });
  return null;
}

/** İki nokta arası mesafe (metre) */
export function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
