import "server-only";
import { ensureSchema, sql } from "./db";
import { notifyLater } from "./game";
import type { Profile } from "./types";

// Mağaza: her ödülü bir kişi tanımlar ve kimin alabileceğini seçer.
//  - "Kendime": kendine koyduğun hedef ödül (ör. "1 saat oyun"). Alınca kendin "kullandım" dersin.
//  - "Partnerime": partnerine sunduğun hediye (ör. "Sana masaj yaparım"). Partnerin alınca
//    sen yerine getirip "teslim ettim" dersin.
// Seviye ömür boyu kazanılan havuca göre hesaplanır; harcamak seviyeyi düşürmez.

type Db = typeof sql;

export type Reward = {
  id: number;
  title: string;
  emoji: string;
  cost: number;
  creator_id: number;
  buyer_id: number;
};

export type Purchase = {
  id: number;
  reward_id: number | null;
  buyer_id: number;
  giver_id: number;
  title: string;
  emoji: string;
  cost: number;
  status: "bekliyor" | "teslim";
  created_at: Date;
  fulfilled_at: Date | null;
};

export async function balanceOf(profileId: number, db: Db = sql): Promise<number> {
  await ensureSchema();
  const [r] = await db<{ earned: number; spent: number }[]>`
    select
      (select coalesce(sum(amount), 0)::int from xp_events where profile_id = ${profileId}) as earned,
      (select coalesce(sum(cost), 0)::int from purchases where buyer_id = ${profileId}) as spent`;
  return r.earned - r.spent;
}

export async function getReward(id: number): Promise<Reward | undefined> {
  const [r] = await sql<Reward[]>`
    select id, title, emoji, cost, creator_id, buyer_id from rewards where id = ${id} and not archived`;
  return r;
}

export async function shopView(me: Profile, partner: Profile) {
  await ensureSchema();
  const rewards = await sql<Reward[]>`
    select id, title, emoji, cost, creator_id, buyer_id from rewards
    where not archived order by cost, id`;
  const purchases = await sql<Purchase[]>`
    select * from purchases order by created_at desc limit 40`;
  const ser = (p: Purchase) => ({
    ...p,
    created_at: p.created_at.toISOString(),
    fulfilled_at: p.fulfilled_at?.toISOString() ?? null,
  });
  return {
    balance: await balanceOf(me.id),
    partnerBalance: await balanceOf(partner.id),
    /** Benim alabileceklerim */
    forMe: rewards.filter((r) => r.buyer_id === me.id),
    /** Partnerimin alabileceği tüm ödüller: kendine koydukları + benim ona hediyelerim */
    forPartner: rewards.filter((r) => r.buyer_id === partner.id),
    /** Partnerimin kendine aldığı, henüz kullanmadığı ödüller */
    partnerWaiting: purchases
      .filter((p) => p.status === "bekliyor" && p.buyer_id === partner.id && p.giver_id === partner.id)
      .map(ser),
    /** Benim yerine getirmem gerekenler */
    toFulfill: purchases.filter((p) => p.status === "bekliyor" && p.giver_id === me.id && p.buyer_id !== me.id).map(ser),
    /** Aldığım ama henüz kullanılmamış / teslim edilmemiş ödüller */
    waiting: purchases.filter((p) => p.status === "bekliyor" && p.buyer_id === me.id).map(ser),
    history: purchases.filter((p) => p.status === "teslim").slice(0, 15).map(ser),
  };
}

/** Bugün sayfası için: bekleyen ödül sayıları */
export async function pendingRewardCounts(meId: number) {
  await ensureSchema();
  const [r] = await sql<{ to_fulfill: number; waiting: number }[]>`
    select
      count(*) filter (where giver_id = ${meId} and buyer_id <> ${meId})::int as to_fulfill,
      count(*) filter (where buyer_id = ${meId})::int as waiting
    from purchases where status = 'bekliyor'`;
  return { toFulfill: r.to_fulfill, waiting: r.waiting };
}

export async function saveReward(
  me: Profile,
  partner: Profile,
  data: { id?: number; title: string; emoji: string; cost: number; forWho: "me" | "partner" },
): Promise<string | null> {
  const buyer = data.forWho === "me" ? me.id : partner.id;
  if (data.id) {
    const r = await getReward(data.id);
    if (!r) return "Ödül bulunamadı.";
    if (r.creator_id !== me.id) return "Bu ödülü sadece oluşturan kişi değiştirebilir.";
    await sql`update rewards set title = ${data.title}, emoji = ${data.emoji}, cost = ${data.cost},
              buyer_id = ${buyer} where id = ${data.id}`;
    return null;
  }
  await sql`insert into rewards (title, emoji, cost, creator_id, buyer_id)
            values (${data.title}, ${data.emoji}, ${data.cost}, ${me.id}, ${buyer})`;
  if (buyer === partner.id) {
    notifyLater(partner.id, {
      title: `🎁 ${me.name} mağazaya senin için ödül ekledi`,
      body: `${data.emoji} ${data.title} — ${data.cost} 🥕`,
      url: "/magaza",
      tag: "reward-new",
    });
  }
  return null;
}

export async function archiveReward(me: Profile, id: number): Promise<string | null> {
  const r = await getReward(id);
  if (!r) return "Ödül bulunamadı.";
  if (r.creator_id !== me.id) return "Bu ödülü sadece oluşturan kişi silebilir.";
  await sql`update rewards set archived = true where id = ${id}`;
  return null;
}

export async function buyReward(
  me: Profile,
  partner: Profile,
  rewardId: number,
): Promise<{ error: string } | { ok: true; balance: number; title: string; emoji: string }> {
  let result: { error: string } | { ok: true; balance: number; title: string; emoji: string } = {
    error: "Bir sorun oldu.",
  };
  let bought: { title: string; emoji: string; cost: number; gift: boolean } | null = null;
  await sql.begin(async (tx) => {
    const db = tx as unknown as Db;
    // Aynı anda iki satın alma bakiyeyi aşmasın diye kişinin satırını kilitle
    await db`select id from profiles where id = ${me.id} for update`;
    const [r] = await db<Reward[]>`
      select id, title, emoji, cost, creator_id, buyer_id from rewards where id = ${rewardId} and not archived`;
    if (!r || r.buyer_id !== me.id) {
      result = { error: "Bu ödülü alamazsın." };
      return;
    }
    const balance = await balanceOf(me.id, db);
    if (balance < r.cost) {
      result = { error: `${r.cost - balance} havuç daha lazım.` };
      return;
    }
    const gift = r.creator_id !== me.id;
    await db`insert into purchases (reward_id, buyer_id, giver_id, title, emoji, cost)
             values (${r.id}, ${me.id}, ${gift ? r.creator_id : me.id}, ${r.title}, ${r.emoji}, ${r.cost})`;
    bought = { title: r.title, emoji: r.emoji, cost: r.cost, gift };
    result = { ok: true, balance: balance - r.cost, title: r.title, emoji: r.emoji };
  });
  if (bought) {
    const b = bought as { title: string; emoji: string; cost: number; gift: boolean };
    notifyLater(partner.id, {
      title: b.gift ? `🎁 ${me.name} hediyeni aldı!` : `🛍️ ${me.name} kendine ödül aldı`,
      body: b.gift
        ? `${b.emoji} ${b.title} (${b.cost} 🥕) — sıra sende, yerine getirince "Teslim ettim" de.`
        : `${b.emoji} ${b.title} (${b.cost} 🥕)`,
      url: "/magaza",
      tag: "purchase",
    });
  }
  return result;
}

export async function fulfillPurchase(me: Profile, purchaseId: number): Promise<string | null> {
  const [p] = await sql<Purchase[]>`select * from purchases where id = ${purchaseId}`;
  if (!p || p.status !== "bekliyor") return "Ödül bulunamadı.";
  if (p.giver_id !== me.id) return "Bunu sadece ödülü verecek kişi işaretleyebilir.";
  await sql`update purchases set status = 'teslim', fulfilled_at = now() where id = ${p.id}`;
  if (p.buyer_id !== me.id) {
    notifyLater(p.buyer_id, {
      title: `💝 ${me.name} ödülünü teslim etti`,
      body: `${p.emoji} ${p.title} — keyfini çıkar!`,
      url: "/magaza",
      tag: `purchase-${p.id}`,
    });
  }
  return null;
}
