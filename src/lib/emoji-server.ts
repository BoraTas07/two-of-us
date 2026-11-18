import "server-only";
import { ensureSchema, sql } from "./db";
import { EMOJI_NAME } from "./emoji";
import { notifyLater } from "./game";
import type { Profile } from "./types";

export type EmojiMessage = {
  id: number;
  from_id: number;
  emoji: string;
  created_at: string;
};

/** Emoji gönder: sadece listedeki emojiler; kısa sürede aşırı gönderimi sınırla */
export async function sendEmoji(me: Profile, partner: Profile, emoji: string): Promise<string | null> {
  await ensureSchema();
  const name = EMOJI_NAME[emoji];
  if (!name) return "Bu emoji gönderilemiyor.";
  const [{ n }] = await sql<{ n: number }[]>`
    select count(*)::int as n from emoji_messages
    where from_id = ${me.id} and created_at > now() - interval '1 minute'`;
  if (n >= 20) return "Biraz yavaş 🙂 Bir dakika sonra tekrar dene.";
  await sql`insert into emoji_messages (from_id, to_id, emoji) values (${me.id}, ${partner.id}, ${emoji})`;
  notifyLater(partner.id, {
    title: `${emoji} ${me.name} sana ${name} gönderdi`,
    body: "Two Of Us'ı açınca görebilirsin",
    url: "/biz#emoji",
    tag: `emoji-${me.id}`,
  });
  return null;
}

/** Henüz görmediğim emojiler (uygulama açılınca animasyonla gösterilir) */
export async function unseenEmojis(meId: number): Promise<EmojiMessage[]> {
  await ensureSchema();
  const rows = await sql<{ id: number; from_id: number; emoji: string; created_at: Date }[]>`
    select id, from_id, emoji, created_at from emoji_messages
    where to_id = ${meId} and seen_at is null order by created_at limit 20`;
  return rows.map((r) => ({ ...r, created_at: r.created_at.toISOString() }));
}

export async function markEmojisSeen(meId: number, ids: number[]): Promise<void> {
  if (!ids.length) return;
  await sql`update emoji_messages set seen_at = now()
            where to_id = ${meId} and id = any(${ids}::int[]) and seen_at is null`;
}

/** İkimiz arasındaki son emojiler (her iki yön) */
export async function recentEmojis(limit = 8): Promise<(EmojiMessage & { seen: boolean })[]> {
  await ensureSchema();
  const rows = await sql<{ id: number; from_id: number; emoji: string; created_at: Date; seen: boolean }[]>`
    select id, from_id, emoji, created_at, seen_at is not null as seen from emoji_messages
    order by created_at desc limit ${limit}`;
  return rows.map((r) => ({ ...r, created_at: r.created_at.toISOString() }));
}
