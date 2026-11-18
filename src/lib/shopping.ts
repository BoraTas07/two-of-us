import "server-only";
import { ensureSchema, sql } from "./db";
import { notifyLater } from "./game";
import { markSent } from "./push";
import type { Profile } from "./types";

// Ortak alışveriş listesi. Alınanlar üstü çizili kalır; "Alınanları temizle" ile listeden kalkar
// (geçmişte kalır, "sık alınanlar" önerileri buradan çıkar).

export type ShopItem = { id: number; text: string; added_by: number; checked: boolean; checked_by: number | null };

export async function openItems(): Promise<ShopItem[]> {
  await ensureSchema();
  return sql<ShopItem[]>`
    select id, text, added_by, checked_at is not null as checked, checked_by
    from shopping_items where cleared_at is null
    order by (checked_at is not null), coalesce(checked_at, created_at) desc, id desc`;
}

export async function openCount(): Promise<number> {
  await ensureSchema();
  const [r] = await sql<{ n: number }[]>`
    select count(*)::int as n from shopping_items where cleared_at is null and checked_at is null`;
  return r.n;
}

/** Sık alınan ama şu an listede olmayanlar */
export async function frequentItems(limit = 10): Promise<string[]> {
  const rows = await sql<{ text: string }[]>`
    select min(text) as text from shopping_items
    where lower(text) not in (select lower(text) from shopping_items where cleared_at is null)
    group by lower(text) order by count(*) desc, max(id) desc limit ${limit}`;
  return rows.map((r) => r.text);
}

export async function addItems(me: Profile, partner: Profile, raw: string): Promise<string | null> {
  await ensureSchema();
  const parts = raw
    .split(/[\n,]+/)
    .map((x) => x.trim().slice(0, 80))
    .filter(Boolean)
    .slice(0, 20);
  if (!parts.length) return "Bir şey yaz.";
  const [{ n }] = await sql<{ n: number }[]>`select count(*)::int as n from shopping_items where cleared_at is null`;
  if (n + parts.length > 150) return "Liste çok uzun; önce alınanları temizleyin.";
  for (const p of parts) {
    const [dup] = await sql`select 1 from shopping_items where cleared_at is null and checked_at is null and lower(text) = lower(${p})`;
    if (!dup) await sql`insert into shopping_items (text, added_by) values (${p}, ${me.id})`;
  }
  // Partneri her ürün için rahatsız etmemek adına en fazla yarım saatte bir haber ver
  const bucket = Math.floor(Date.now() / (30 * 60 * 1000));
  if (await markSent(`shop:${me.id}:${bucket}`)) {
    notifyLater(partner.id, {
      title: `🛒 ${me.name} alışveriş listesine ekledi`,
      body: parts.join(", "),
      url: "/liste",
      tag: "shopping",
    });
  }
  return null;
}

export async function toggleItem(me: Profile, id: number): Promise<void> {
  await sql`
    update shopping_items set
      checked_at = case when checked_at is null then now() else null end,
      checked_by = case when checked_at is null then ${me.id}::int else null end
    where id = ${id} and cleared_at is null`;
}

export async function removeItem(id: number): Promise<void> {
  // Yanlış eklenenler tamamen silinir (öneri listesini kirletmesin)
  await sql`delete from shopping_items where id = ${id} and cleared_at is null and checked_at is null`;
}

export async function clearChecked(): Promise<void> {
  await sql`update shopping_items set cleared_at = now() where cleared_at is null and checked_at is not null`;
}
