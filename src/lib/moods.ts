import "server-only";
import { createHash } from "node:crypto";
import { ensureSchema, sql } from "./db";
import { notifyLater } from "./game";
import { MOOD_BY_KEY } from "./mood-options";
import { todayStr } from "./time";
import type { Profile } from "./types";

export type Mood = { profile_id: number; mood: string; note: string; updated_at: string };

export type Deed = {
  id: number;
  from_id: number;
  emoji: string;
  text: string;
  thanked: boolean;
  created_at: string;
};

// ---------------------------------------------------------------- ruh hali

/**
 * Kişinin o günkü "nasıl hissediyorsun?" bildirim saati: 10:00–20:00 arasında,
 * kişi ve güne göre değişen ama gün içinde sabit bir saat ("HH:MM").
 */
export function moodAskTime(profileId: number, day: string): string {
  const h = createHash("sha256").update(`mood:${profileId}:${day}`).digest();
  const minutes = 10 * 60 + (h.readUInt32BE(0) % (10 * 60));
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

export async function setMood(me: Profile, partner: Profile, mood: string, note: string): Promise<string | null> {
  await ensureSchema();
  const m = MOOD_BY_KEY[mood];
  if (!m) return "Bir seçenek seç.";
  const clean = note.trim().slice(0, 140);
  const day = todayStr();
  await sql`
    insert into moods (profile_id, day, mood, note) values (${me.id}, ${day}, ${mood}, ${clean})
    on conflict (profile_id, day) do update set mood = excluded.mood, note = excluded.note, updated_at = now()`;
  notifyLater(partner.id, {
    title: `${m.emoji} ${me.name} şu an ${m.label.toLocaleLowerCase("tr")} hissediyor`,
    body: clean ? `"${clean}"` : "Bugün sayfasından görebilirsin.",
    url: "/#his",
    tag: `mood-${me.id}`,
  });
  return null;
}

export async function moodsForDay(day = todayStr()): Promise<Mood[]> {
  await ensureSchema();
  const rows = await sql<{ profile_id: number; mood: string; note: string; updated_at: Date }[]>`
    select profile_id, mood, note, updated_at from moods where day = ${day}`;
  return rows.map((r) => ({ ...r, updated_at: r.updated_at.toISOString() }));
}

// ---------------------------------------------------------------- partnerin için ne yaptın

export async function addDeed(me: Profile, partner: Profile, emoji: string, text: string): Promise<string | null> {
  await ensureSchema();
  const t = text.trim().slice(0, 140);
  if (!t) return "Ne yaptığını kısaca yaz ya da bir seçenek seç.";
  const e = [...(emoji || "💝")].slice(0, 2).join("");
  const day = todayStr();
  const [{ n }] = await sql<{ n: number }[]>`select count(*)::int as n from deeds where from_id = ${me.id} and day = ${day}`;
  if (n >= 20) return "Bugün için yeterince eklendi 🙂";
  await sql`insert into deeds (from_id, to_id, day, emoji, text) values (${me.id}, ${partner.id}, ${day}, ${e}, ${t})`;
  notifyLater(partner.id, {
    title: `💝 ${me.name} bugün senin için bir şey yaptı`,
    body: `${e} ${t}`,
    url: "/#icin",
    tag: `deed-${me.id}`,
  });
  return null;
}

export async function removeDeed(me: Profile, id: number): Promise<void> {
  await sql`delete from deeds where id = ${id} and from_id = ${me.id}`;
}

export async function thankDeed(me: Profile, id: number): Promise<string | null> {
  const [d] = await sql<{ from_id: number; to_id: number; emoji: string; text: string; thanked: boolean }[]>`
    select from_id, to_id, emoji, text, thanked_at is not null as thanked from deeds where id = ${id}`;
  if (!d || d.to_id !== me.id) return "Bulunamadı.";
  if (d.thanked) return null;
  await sql`update deeds set thanked_at = now() where id = ${id}`;
  notifyLater(d.from_id, {
    title: `❤️ ${me.name} teşekkür etti`,
    body: `${d.emoji} ${d.text}`,
    url: "/#icin",
    tag: `deed-thanks-${id}`,
  });
  return null;
}

export async function deedsForDay(day = todayStr()): Promise<Deed[]> {
  await ensureSchema();
  const rows = await sql<{ id: number; from_id: number; emoji: string; text: string; thanked: boolean; created_at: Date }[]>`
    select id, from_id, emoji, text, thanked_at is not null as thanked, created_at
    from deeds where day = ${day} order by created_at`;
  return rows.map((r) => ({ ...r, created_at: r.created_at.toISOString() }));
}
