import "server-only";
import { MAX_CARROTS, MIN_CARROTS } from "./carrots";
import { ensureSchema, sql } from "./db";
import { getTask, loadSubtasks, notifyLater } from "./game";
import type { Profile } from "./types";

// İtiraz: görevi oluşturmayan kişi itiraz edebilir. Hedef ya ana görev ya da tek bir adım (alt görev):
//  - Görev itirazı: kabul edilirse görev (ya da sadece o adım) kaldırılır.
//  - Havuç itirazı: kabul edilirse ana görevin havucu / bonusu ya da o adımın havucu önerilen
//    miktara güncellenir (sonraki tamamlamalar için).
// Reddedilirse her şey olduğu gibi kalır.

export type Objection = {
  id: number;
  task_id: number;
  subtask_id: number | null;
  /** Hedef adımın adı (adım itirazıysa) */
  sub_title: string | null;
  by_id: number;
  kind: "task" | "amount";
  reason: string;
  proposed_xp: number | null;
  old_xp: number | null;
  status: "acik" | "kabul" | "red" | "geri";
  response: string;
  created_at: Date;
  resolved_at: Date | null;
};

export type ObjectionView = Omit<Objection, "created_at" | "resolved_at"> & {
  created_at: string;
  resolved_at: string | null;
};

const view = (o: Objection): ObjectionView => ({
  ...o,
  created_at: o.created_at.toISOString(),
  resolved_at: o.resolved_at?.toISOString() ?? null,
});

/** "Bonus", "Diş fırçala adımı" ya da "" (adımı olmayan görevde ana görev) */
function targetName(o: { subtask_id: number | null; sub_title: string | null }, hasSubs: boolean) {
  if (o.subtask_id) return `"${o.sub_title}" adımı`;
  return hasSubs ? "hepsini bitirme bonusu" : "";
}

/** Bir görevin açık itirazı ve en son sonuçlanan itirazı */
export async function objectionsFor(taskId: number) {
  await ensureSchema();
  const rows = await sql<Objection[]>`
    select o.*, s.title as sub_title from objections o left join subtasks s on s.id = o.subtask_id
    where o.task_id = ${taskId} order by o.created_at desc limit 5`;
  const open = rows.find((o) => o.status === "acik");
  const last = rows.find((o) => o.status !== "acik" && o.status !== "geri");
  return { open: open ? view(open) : null, last: last ? view(last) : null };
}

/** Açık itirazı olan görevlerin id'leri (kartlarda işaret göstermek için) */
export async function openObjectionTaskIds(): Promise<Set<number>> {
  await ensureSchema();
  const rows = await sql<{ task_id: number }[]>`select task_id from objections where status = 'acik'`;
  return new Set(rows.map((r) => r.task_id));
}

/** Bugün sayfası için: benim oluşturduğum görevlere gelen açık itirazlar */
export async function objectionsToAnswer(meId: number) {
  await ensureSchema();
  const rows = await sql<(Objection & { title: string; emoji: string; has_subs: boolean })[]>`
    select o.*, s.title as sub_title, t.title, t.emoji,
      exists(select 1 from subtasks x where x.task_id = o.task_id and not x.archived) as has_subs
    from objections o join tasks t on t.id = o.task_id left join subtasks s on s.id = o.subtask_id
    where o.status = 'acik' and t.creator_id = ${meId} and not t.archived
    order by o.created_at`;
  return rows.map((r) => ({ ...view(r), title: r.title, emoji: r.emoji, has_subs: r.has_subs }));
}

export async function createObjection(
  me: Profile,
  data: { taskId: number; subtaskId: number | null; kind: "task" | "amount"; reason: string; proposed: number | null },
): Promise<string | null> {
  const task = await getTask(data.taskId);
  if (!task || task.archived) return "Görev bulunamadı.";
  if (task.creator_id === me.id) return "Kendi oluşturduğun göreve itiraz edemezsin; doğrudan düzenleyebilirsin.";
  const subs = await loadSubtasks(task.id);
  const sub = data.subtaskId ? subs.find((x) => x.id === data.subtaskId) : undefined;
  if (data.subtaskId && !sub) return "Bu adım artık yok.";

  const reason = data.reason.trim().slice(0, 300);
  if (data.kind === "task" && !reason) return "Neden itiraz ettiğini kısaca yaz.";
  const current = sub ? sub.xp : task.xp;
  if (data.kind === "amount") {
    const p = data.proposed;
    // Adımlar en az 1 havuç; adımı olan görevin bonusu 0 olabilir; adımı olmayan görev en az 1
    const min = !sub && subs.length > 0 ? 0 : MIN_CARROTS;
    if (p === null || !Number.isInteger(p) || p < min || p > MAX_CARROTS)
      return `Önerdiğin havuç ${min} ile ${MAX_CARROTS} arasında olmalı.`;
    if (p === current) return "Önerdiğin miktar zaten şu anki miktarla aynı.";
  }
  const [open] = await sql`select 1 from objections where task_id = ${task.id} and status = 'acik'`;
  if (open) return "Bu görevde zaten cevap bekleyen bir itiraz var.";

  await sql`
    insert into objections (task_id, subtask_id, by_id, kind, reason, proposed_xp, old_xp)
    values (${task.id}, ${sub?.id ?? null}, ${me.id}, ${data.kind}, ${reason},
            ${data.kind === "amount" ? data.proposed : null}, ${current})`;

  const target = targetName({ subtask_id: sub?.id ?? null, sub_title: sub?.title ?? null }, subs.length > 0);
  const where = target ? ` (${target})` : "";
  notifyLater(task.creator_id, {
    title: `⚖️ ${me.name} itiraz etti`,
    body:
      data.kind === "amount"
        ? `${task.emoji} ${task.title}${where}: ${current} yerine ${data.proposed} 🥕 öneriyor${reason ? ` — "${reason}"` : ""}`
        : `${task.emoji} ${task.title}${where} — "${reason}"`,
    url: `/gorevler/${task.id}`,
    tag: `objection-${task.id}`,
  });
  return null;
}

export async function withdrawObjection(me: Profile, id: number): Promise<string | null> {
  const rows = await sql`
    update objections set status = 'geri', resolved_at = now()
    where id = ${id} and by_id = ${me.id} and status = 'acik' returning id`;
  return rows.length ? null : "İtiraz bulunamadı.";
}

export async function resolveObjection(
  me: Profile,
  id: number,
  accept: boolean,
  note: string,
): Promise<string | null> {
  const [o] = await sql<(Objection & { creator_id: number; title: string; emoji: string; task_xp: number })[]>`
    select o.*, s.title as sub_title, t.creator_id, t.title, t.emoji, t.xp as task_xp
    from objections o join tasks t on t.id = o.task_id left join subtasks s on s.id = o.subtask_id
    where o.id = ${id} and o.status = 'acik'`;
  if (!o) return "İtiraz bulunamadı.";
  if (o.creator_id !== me.id) return "Bu itirazı sadece görevi oluşturan cevaplayabilir.";
  const response = note.trim().slice(0, 300);

  await sql`update objections set status = ${accept ? "kabul" : "red"}, response = ${response}, resolved_at = now()
            where id = ${o.id}`;
  if (accept) {
    if (o.kind === "task" && o.subtask_id) {
      await sql`update subtasks set archived = true where id = ${o.subtask_id}`;
      // Son adım da kalktıysa ve bonus 0 ise, görev değersiz kalmasın
      const left = await loadSubtasks(o.task_id);
      if (left.length === 0 && o.task_xp < MIN_CARROTS) {
        await sql`update tasks set xp = ${Math.max(MIN_CARROTS, o.old_xp ?? MIN_CARROTS)} where id = ${o.task_id}`;
      }
    } else if (o.kind === "task") {
      await sql`update tasks set archived = true where id = ${o.task_id}`;
    } else if (o.proposed_xp !== null && o.subtask_id) {
      await sql`update subtasks set xp = ${o.proposed_xp} where id = ${o.subtask_id}`;
    } else if (o.proposed_xp !== null) {
      await sql`update tasks set xp = ${o.proposed_xp} where id = ${o.task_id}`;
    }
  }

  const subPart = o.subtask_id ? `"${o.sub_title}" adımı` : "";
  const what =
    o.kind === "task"
      ? accept
        ? o.subtask_id
          ? `${subPart} kaldırıldı`
          : "görev kaldırıldı"
        : o.subtask_id
          ? `${subPart} kalıyor`
          : "görev kalıyor"
      : `${subPart ? subPart + " için " : ""}havuç ${accept ? `${o.proposed_xp} 🥕 oldu` : `${o.old_xp} 🥕 olarak kalıyor`}`;
  const taskGone = accept && o.kind === "task" && !o.subtask_id;
  notifyLater(o.by_id, {
    title: accept ? `✅ ${me.name} itirazını kabul etti` : `❌ ${me.name} itirazını reddetti`,
    body: `${o.emoji} ${o.title}: ${what}${response ? ` — "${response}"` : ""}`,
    url: taskGone ? "/gorevler" : `/gorevler/${o.task_id}`,
    tag: `objection-${o.task_id}`,
  });
  return null;
}
