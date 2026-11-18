import "server-only";
import { ensureSchema, sql } from "./db";
import { notifyLater } from "./game";
import { QUESTIONS } from "./question-bank";
import { todayStr } from "./time";
import type { Profile } from "./types";

// Günün sorusu: her gün ikinize aynı soru. Kendi cevabını yazmadan partnerinkini göremezsin.
// Sıraya eklenmiş kendi sorularınız önce sorulur; yoksa hazır sorulardan sıradaki gelir.

export const ANSWER_CARROTS = 5;

export type DayQuestion = {
  day: string;
  text: string;
  author_id: number | null;
  answers: { profile_id: number; text: string; created_at: string }[];
};

/** Hazır soruları sabit ama karışık bir sırayla dolaşmak için (aynı soru art arda gelmesin) */
function bankIndex(n: number): number {
  const len = QUESTIONS.length;
  // 37 ile len aralarında asal olduğu sürece tüm soruları bir kez dolaşır
  const step = len % 37 === 0 ? 1 : 37;
  return (n * step) % len;
}

export async function questionFor(day = todayStr()): Promise<{ day: string; text: string; author_id: number | null }> {
  await ensureSchema();
  const [q] = await sql<{ day: string; text: string; author_id: number | null }[]>`
    select day, text, author_id from daily_questions where day = ${day}`;
  if (q) return q;
  if (day !== todayStr()) return { day, text: "", author_id: null };

  return sql.begin(async (tx) => {
    // Aynı anda iki istek gelirse ikisi de aynı soruyu görsün
    await tx`select pg_advisory_xact_lock(4242)`;
    const [again] = await tx<{ day: string; text: string; author_id: number | null }[]>`
      select day, text, author_id from daily_questions where day = ${day}`;
    if (again) return again;
    const [custom] = await tx<{ id: number; text: string; author_id: number }[]>`
      select id, text, author_id from custom_questions where used_on is null order by id limit 1`;
    let text: string;
    let author: number | null = null;
    if (custom) {
      await tx`update custom_questions set used_on = ${day} where id = ${custom.id}`;
      text = custom.text;
      author = custom.author_id;
    } else {
      const [{ n }] = await tx<{ n: number }[]>`select count(*)::int as n from daily_questions where author_id is null`;
      text = QUESTIONS[bankIndex(n)];
    }
    await tx`insert into daily_questions (day, text, author_id) values (${day}, ${text}, ${author})`;
    return { day, text, author_id: author };
  });
}

export async function todayQuestion(): Promise<DayQuestion> {
  const q = await questionFor();
  const answers = await sql<{ profile_id: number; text: string; created_at: Date }[]>`
    select profile_id, text, created_at from answers where day = ${q.day}`;
  return { ...q, answers: answers.map((a) => ({ ...a, created_at: a.created_at.toISOString() })) };
}

export async function answerQuestion(me: Profile, partner: Profile, text: string): Promise<string | null> {
  const t = text.trim().slice(0, 400);
  if (!t) return "Bir cevap yaz.";
  const q = await questionFor();
  const [row] = await sql<{ inserted: boolean }[]>`
    insert into answers (day, profile_id, text) values (${q.day}, ${me.id}, ${t})
    on conflict (day, profile_id) do update set text = excluded.text
    returning (xmax = 0) as inserted`;
  if (!row.inserted) return null; // sadece düzenleme
  await sql`insert into xp_events (profile_id, amount, kind, note, day)
            values (${me.id}, ${ANSWER_CARROTS}, 'question', 'Günün sorusu', ${q.day})`;
  const [other] = await sql`select 1 from answers where day = ${q.day} and profile_id = ${partner.id}`;
  notifyLater(partner.id, {
    title: other ? `💬 ${me.name} de cevapladı` : `❓ ${me.name} günün sorusunu cevapladı`,
    body: other ? `"${q.text}" — cevaplarınızı karşılaştırın!` : `Sen de cevapla, onun cevabını gör: "${q.text}"`,
    url: "/biz#soru",
    tag: `question-${q.day}`,
  });
  return null;
}

export async function addCustomQuestion(me: Profile, text: string): Promise<string | null> {
  await ensureSchema();
  const t = text.trim().slice(0, 200);
  if (t.length < 5) return "Soruyu biraz daha uzun yaz.";
  const [{ n }] = await sql<{ n: number }[]>`
    select count(*)::int as n from custom_questions where author_id = ${me.id} and used_on is null`;
  if (n >= 30) return "Sırada zaten 30 sorun var 🙂";
  await sql`insert into custom_questions (author_id, text) values (${me.id}, ${t})`;
  return null;
}

export async function myQueuedQuestions(me: Profile) {
  return sql<{ id: number; text: string }[]>`
    select id, text from custom_questions where author_id = ${me.id} and used_on is null order by id`;
}

export async function removeCustomQuestion(me: Profile, id: number) {
  await sql`delete from custom_questions where id = ${id} and author_id = ${me.id} and used_on is null`;
}

/** Geçmiş sorular (bugün hariç) ve cevaplar */
export async function questionHistory(limit = 60): Promise<DayQuestion[]> {
  await ensureSchema();
  const qs = await sql<{ day: string; text: string; author_id: number | null }[]>`
    select day, text, author_id from daily_questions where day < ${todayStr()} order by day desc limit ${limit}`;
  if (!qs.length) return [];
  const ans = await sql<{ day: string; profile_id: number; text: string; created_at: Date }[]>`
    select day, profile_id, text, created_at from answers where day = any(${qs.map((q) => q.day)}::text[])`;
  return qs.map((q) => ({
    ...q,
    answers: ans
      .filter((a) => a.day === q.day)
      .map((a) => ({ profile_id: a.profile_id, text: a.text, created_at: a.created_at.toISOString() })),
  }));
}
