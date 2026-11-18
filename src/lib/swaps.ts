import "server-only";
import { ensureSchema, sql } from "./db";
import { assigneeOn, getTask, notifyLater } from "./game";
import { isDueOn } from "./recurrence";
import { balanceOf } from "./shop";
import { todayStr } from "./time";
import type { Profile } from "./types";

// Görev takası: kişi bugünkü görevini, isterse kendi bakiyesinden bonus havuç ekleyerek partnerine
// teklif eder. Kabul edilirse görev o gün için partnerin olur (tek seferlik görevde görev tamamen
// devredilir). Devralan bitirince görevin havucunu + bonusu kazanır. Teklifler gün sonunda geçersizleşir.

export const MAX_SWAP_BONUS = 200;

export type Swap = {
  id: number;
  task_id: number;
  title: string;
  emoji: string;
  xp: number;
  from_id: number;
  to_id: number;
  bonus: number;
  status: "pending" | "accepted";
};

/** Bugünün açık (bekleyen ya da kabul edilmiş) takasları */
export async function liveSwaps(day = todayStr()): Promise<Swap[]> {
  await ensureSchema();
  return sql<Swap[]>`
    select s.id, s.task_id, t.title, t.emoji, t.xp, s.from_id, s.to_id, s.bonus, s.status
    from swaps s join tasks t on t.id = s.task_id
    where s.occ_date = ${day} and s.status in ('pending', 'accepted') and not t.archived
    order by s.id`;
}

export async function offerSwap(me: Profile, partner: Profile, taskId: number, bonus: number): Promise<string | null> {
  await ensureSchema();
  const today = todayStr();
  const t = await getTask(taskId);
  if (!t || t.archived) return "Görev bulunamadı.";
  if (t.assignee_id === null) return "Ortak görevler takas edilemez.";
  if (assigneeOn(t, today) !== me.id) return "Sadece bugün sana ait bir görevi teklif edebilirsin.";
  if (t.kind !== "once" && !isDueOn(t, today)) return "Bu görev bugün yapılacaklar arasında değil.";
  const done =
    t.kind === "once"
      ? await sql`select 1 from completions where task_id = ${t.id} limit 1`
      : await sql`select 1 from completions where task_id = ${t.id} and occ_date = ${today}`;
  if (done.length) return "Bu görev zaten tamamlanmış.";
  const b = Math.round(Number(bonus));
  if (!Number.isFinite(b) || b < 0 || b > MAX_SWAP_BONUS) return `Bonus 0–${MAX_SWAP_BONUS} arası olmalı.`;
  if (b > 0 && (await balanceOf(me.id)) < b) return "Bu kadar havucun yok.";

  const [row] = await sql<{ id: number }[]>`
    insert into swaps (task_id, occ_date, from_id, to_id, bonus)
    values (${t.id}, ${today}, ${me.id}, ${partner.id}, ${b})
    on conflict do nothing returning id`;
  if (!row) return "Bu görev için zaten bir takas teklifi var.";
  notifyLater(partner.id, {
    title: `🔄 ${me.name} bir görevini sana devretmek istiyor`,
    body: `${t.emoji} ${t.title} — kabul edersen +${t.xp}${b ? ` ve ${b} bonus` : ""} 🥕`,
    url: "/#takas",
    tag: `swap-${row.id}`,
  });
  return null;
}

export async function cancelSwap(me: Profile, id: number): Promise<void> {
  await sql`update swaps set status = 'cancelled', decided_at = now()
            where id = ${id} and from_id = ${me.id} and status = 'pending'`;
}

export async function answerSwap(me: Profile, id: number, accept: boolean): Promise<string | null> {
  const today = todayStr();
  const [s] = await sql<{ id: number; task_id: number; from_id: number; to_id: number; bonus: number; occ_date: string }[]>`
    select id, task_id, from_id, to_id, bonus, occ_date from swaps where id = ${id} and status = 'pending'`;
  if (!s || s.to_id !== me.id) return "Teklif bulunamadı.";
  if (s.occ_date !== today) return "Bu teklifin süresi geçti.";
  const t = await getTask(s.task_id);
  if (!t || t.archived) return "Görev bulunamadı.";

  if (!accept) {
    await sql`update swaps set status = 'declined', decided_at = now() where id = ${id}`;
    notifyLater(s.from_id, {
      title: `↩️ ${me.name} takası kabul etmedi`,
      body: `${t.emoji} ${t.title} sende kaldı.`,
      url: `/gorevler/${t.id}`,
      tag: `swap-${id}`,
    });
    return null;
  }
  if (s.bonus > 0 && (await balanceOf(s.from_id)) < s.bonus) {
    await sql`update swaps set status = 'cancelled', decided_at = now() where id = ${id}`;
    return "Teklif edenin artık yeterli havucu yok; teklif iptal oldu.";
  }
  await sql`update swaps set status = 'accepted', decided_at = now() where id = ${id} and status = 'pending'`;
  // Tek seferlik görev: görevin kendisi devredilir
  if (t.kind === "once") await sql`update tasks set assignee_id = ${me.id} where id = ${t.id}`;
  notifyLater(s.from_id, {
    title: `🤝 ${me.name} takası kabul etti`,
    body: `${t.emoji} ${t.title} bugün onda${s.bonus ? ` · bitirince ${s.bonus} 🥕 bonusun ona geçecek` : ""}.`,
    url: "/",
    tag: `swap-${id}`,
  });
  return null;
}
