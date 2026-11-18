import "server-only";
import { ensureSchema, sql } from "./db";
import { MOOD_BY_KEY } from "./mood-options";
import { addDays, daysInMonth } from "./time";

// Anı takvimi: her günün ruh halleri, şarkıları, paylaşımları, görevleri… tek yerde.

export type DaySummary = {
  moods: { profile_id: number; emoji: string }[];
  songs: number;
  moments: number;
  deeds: number;
  tasks: number;
  answers: number;
  dreams: number;
};

export async function monthSummary(month: string): Promise<Map<string, DaySummary>> {
  await ensureSchema();
  const from = `${month}-01`;
  const to = addDays(from, daysInMonth(from) - 1);
  const map = new Map<string, DaySummary>();
  const get = (d: string) => {
    let s = map.get(d);
    if (!s) map.set(d, (s = { moods: [], songs: 0, moments: 0, deeds: 0, tasks: 0, answers: 0, dreams: 0 }));
    return s;
  };
  const [moods, songs, deeds, answers, moments, tasks, dreams] = await Promise.all([
    sql<{ day: string; profile_id: number; mood: string }[]>`
      select day, profile_id, mood from moods where day between ${from} and ${to} order by profile_id`,
    sql<{ day: string; n: number }[]>`select day, count(*)::int as n from songs where day between ${from} and ${to} group by day`,
    sql<{ day: string; n: number }[]>`select day, count(*)::int as n from deeds where day between ${from} and ${to} group by day`,
    sql<{ day: string; n: number }[]>`select day, count(*)::int as n from answers where day between ${from} and ${to} group by day`,
    sql<{ day: string; n: number }[]>`
      select to_char(created_at at time zone 'Europe/Istanbul', 'YYYY-MM-DD') as day, count(*)::int as n from moments group by 1 having to_char(created_at at time zone 'Europe/Istanbul', 'YYYY-MM-DD') between ${from} and ${to}`,
    sql<{ day: string; n: number }[]>`
      select to_char(completed_at at time zone 'Europe/Istanbul', 'YYYY-MM-DD') as day, count(*)::int as n from completions where status = 'approved'
      group by 1 having to_char(completed_at at time zone 'Europe/Istanbul', 'YYYY-MM-DD') between ${from} and ${to}`,
    sql<{ day: string; n: number }[]>`
      select to_char(done_at at time zone 'Europe/Istanbul', 'YYYY-MM-DD') as day, count(*)::int as n from dreams where done_at is not null and not archived
      group by 1 having to_char(done_at at time zone 'Europe/Istanbul', 'YYYY-MM-DD') between ${from} and ${to}`,
  ]);
  for (const m of moods) get(m.day).moods.push({ profile_id: m.profile_id, emoji: MOOD_BY_KEY[m.mood]?.emoji ?? "💭" });
  for (const r of songs) get(r.day).songs = r.n;
  for (const r of deeds) get(r.day).deeds = r.n;
  for (const r of answers) get(r.day).answers = r.n;
  for (const r of moments) get(r.day).moments = r.n;
  for (const r of tasks) get(r.day).tasks = r.n;
  for (const r of dreams) get(r.day).dreams = r.n;
  return map;
}

export async function dayDetail(day: string) {
  await ensureSchema();
  const [moods, songs, deeds, moments, tasks, question, answers, dreams] = await Promise.all([
    sql<{ profile_id: number; mood: string; note: string }[]>`
      select profile_id, mood, note from moods where day = ${day} order by profile_id`,
    sql<{ profile_id: number; title: string; artist: string; reaction: string | null }[]>`
      select profile_id, title, artist, reaction from songs where day = ${day} order by id`,
    sql<{ from_id: number; emoji: string; text: string; thanked: boolean }[]>`
      select from_id, emoji, text, thanked_at is not null as thanked from deeds where day = ${day} order by id`,
    sql<{ id: number; author_id: number; text: string; has_photo: boolean }[]>`
      select id, author_id, text, photo is not null as has_photo from moments
      where to_char(created_at at time zone 'Europe/Istanbul', 'YYYY-MM-DD') = ${day} order by id`,
    sql<{ title: string; emoji: string; profile_id: number; shared: boolean }[]>`
      select t.title, t.emoji, c.profile_id, t.assignee_id is null as shared
      from completions c join tasks t on t.id = c.task_id
      where c.status = 'approved' and to_char(c.completed_at at time zone 'Europe/Istanbul', 'YYYY-MM-DD') = ${day} order by c.completed_at`,
    sql<{ text: string }[]>`select text from daily_questions where day = ${day}`,
    sql<{ profile_id: number; text: string }[]>`select profile_id, text from answers where day = ${day}`,
    sql<{ id: number; title: string; emoji: string; has_photo: boolean }[]>`
      select id, title, emoji, photo is not null as has_photo from dreams
      where done_at is not null and not archived and to_char(done_at at time zone 'Europe/Istanbul', 'YYYY-MM-DD') = ${day}`,
  ]);
  return {
    moods: moods.map((m) => ({ ...m, emoji: MOOD_BY_KEY[m.mood]?.emoji ?? "💭", label: MOOD_BY_KEY[m.mood]?.label ?? "" })),
    songs,
    deeds,
    moments,
    tasks,
    question: question[0]?.text ?? null,
    answers,
    dreams,
  };
}
