import "server-only";
import { MAX_CARROTS } from "./carrots";
import { ensureSchema, sql } from "./db";
import { getTask, loadSubtasks, notifyLater } from "./game";
import type { Profile } from "./types";

// İtiraz: görevi oluşturmayan kişi, görevin kendisine ya da havuç miktarına itiraz edebilir.
// Görevi oluşturan kabul ederse: görev itirazında görev kaldırılır, havuç itirazında
// görevin havucu önerilen miktara güncellenir. Reddederse görev olduğu gibi kalır.

export type Objection = {
  id: number;
  task_id: number;
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

/** Bir görevin açık itirazı ve en son sonuçlanan itirazı */
export async function objectionsFor(taskId: number) {
  await ensureSchema();
  const rows = await sql<Objection[]>`
    select * from objections where task_id = ${taskId} order by created_at desc limit 5`;
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
  const rows = await sql<(Objection & { title: string; emoji: string })[]>`
    select o.*, t.title, t.emoji from objections o join tasks t on t.id = o.task_id
    where o.status = 'acik' and t.creator_id = ${meId} and not t.archived
    order by o.created_at`;
  return rows.map((r) => ({ ...view(r), title: r.title, emoji: r.emoji }));
}

export async function createObjection(
  me: Profile,
  data: { taskId: number; kind: "task" | "amount"; reason: string; proposed: number | null },
): Promise<string | null> {
  const task = await getTask(data.taskId);
  if (!task || task.archived) return "Görev bulunamadı.";
  if (task.creator_id === me.id) return "Kendi oluşturduğun göreve itiraz edemezsin; doğrudan düzenleyebilirsin.";
  const reason = data.reason.trim().slice(0, 300);
  if (data.kind === "task" && !reason) return "Neden itiraz ettiğini kısaca yaz.";
  if (data.kind === "amount") {
    const p = data.proposed;
    if (p === null || !Number.isInteger(p) || p < 0 || p > MAX_CARROTS) return `Önerdiğin havuç 0 ile ${MAX_CARROTS} arasında olmalı.`;
    if (p === task.xp) return "Önerdiğin miktar zaten şu anki miktarla aynı.";
    if (p === 0 && (await loadSubtasks(task.id)).length === 0) return "Adımı olmayan bir görev en az 1 havuç olmalı.";
  }
  const [open] = await sql`select 1 from objections where task_id = ${task.id} and status = 'acik'`;
  if (open) return "Bu görevde zaten cevap bekleyen bir itiraz var.";

  await sql`
    insert into objections (task_id, by_id, kind, reason, proposed_xp, old_xp)
    values (${task.id}, ${me.id}, ${data.kind}, ${reason},
            ${data.kind === "amount" ? data.proposed : null}, ${task.xp})`;
  notifyLater(task.creator_id, {
    title: `⚖️ ${me.name} itiraz etti`,
    body:
      data.kind === "amount"
        ? `${task.emoji} ${task.title}: ${task.xp} yerine ${data.proposed} 🥕 öneriyor${reason ? ` — "${reason}"` : ""}`
        : `${task.emoji} ${task.title} — "${reason}"`,
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
  const [o] = await sql<(Objection & { creator_id: number; title: string; emoji: string })[]>`
    select o.*, t.creator_id, t.title, t.emoji from objections o join tasks t on t.id = o.task_id
    where o.id = ${id} and o.status = 'acik'`;
  if (!o) return "İtiraz bulunamadı.";
  if (o.creator_id !== me.id) return "Bu itirazı sadece görevi oluşturan cevaplayabilir.";
  const response = note.trim().slice(0, 300);

  await sql`update objections set status = ${accept ? "kabul" : "red"}, response = ${response}, resolved_at = now()
            where id = ${o.id}`;
  if (accept && o.kind === "task") {
    await sql`update tasks set archived = true where id = ${o.task_id}`;
  } else if (accept && o.kind === "amount" && o.proposed_xp !== null) {
    await sql`update tasks set xp = ${o.proposed_xp} where id = ${o.task_id}`;
  }

  const what =
    o.kind === "task"
      ? accept
        ? "görev kaldırıldı"
        : "görev kalıyor"
      : accept
        ? `havuç ${o.proposed_xp} 🥕 oldu`
        : `havuç ${o.old_xp} 🥕 olarak kalıyor`;
  notifyLater(o.by_id, {
    title: accept ? `✅ ${me.name} itirazını kabul etti` : `❌ ${me.name} itirazını reddetti`,
    body: `${o.emoji} ${o.title}: ${what}${response ? ` — "${response}"` : ""}`,
    url: accept && o.kind === "task" ? "/gorevler" : `/gorevler/${o.task_id}`,
    tag: `objection-${o.task_id}`,
  });
  return null;
}
