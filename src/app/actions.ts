"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { allProfiles, endSession, hashPin, requireUser, startSession, verifyPin } from "@/lib/auth";
import { ensureSchema, setConfig, sql } from "@/lib/db";
import {
  completeSubtask,
  completeTask,
  decideCompletion,
  getTask,
  notifyLater,
  undoCompletion,
  undoSubtask,
  type CompleteResult,
} from "@/lib/game";
import { removeSubscription, saveSubscription, sendPush } from "@/lib/push";
import { archiveReward, buyReward, fulfillPurchase, saveReward } from "@/lib/shop";
import { addDays, todayStr } from "@/lib/time";
import { COLORS } from "@/lib/types";
import { MAX_CARROTS, MIN_CARROTS } from "@/lib/carrots";

const refresh = () => revalidatePath("/", "layout");

function cleanPin(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return /^\d{4,6}$/.test(s) ? s : null;
}

function cleanColor(v: FormDataEntryValue | null): string {
  const s = String(v ?? "");
  return s in COLORS ? s : "clay";
}

// ---------------------------------------------------------------- kurulum & giriş

export type FormState = { error?: string; ok?: string } | undefined;

export async function setupAction(_: FormState, form: FormData): Promise<FormState> {
  await ensureSchema();
  if ((await allProfiles()).length > 0) return { error: "Kurulum zaten yapılmış." };
  const people = [0, 1].map((i) => ({
    name: String(form.get(`name${i}`) ?? "").trim().slice(0, 24),
    emoji: String(form.get(`emoji${i}`) ?? "😀").slice(0, 8),
    color: cleanColor(form.get(`color${i}`)),
    pin: cleanPin(form.get(`pin${i}`)),
  }));
  if (people[0].color === people[1].color) return { error: "İkiniz farklı renkler seçmelisiniz." };
  for (const p of people) {
    if (!p.name) return { error: "İki kişinin de adını yaz." };
    if (!p.pin) return { error: `${p.name} için 4-6 haneli bir PIN gir.` };
  }
  const yesterday = addDays(todayStr(), -1);
  const ids: number[] = [];
  await sql.begin(async (tx) => {
    const [{ n }] = await tx<{ n: number }[]>`select count(*)::int as n from profiles`;
    if (n > 0) return;
    for (const p of people) {
      const [r] = await tx<{ id: number }[]>`
        insert into profiles (name, emoji, color, pin_hash, streak_through, freezes_month)
        values (${p.name}, ${p.emoji}, ${p.color}, ${hashPin(p.pin!)}, ${yesterday}, ${todayStr().slice(0, 7)})
        returning id`;
      ids.push(r.id);
    }
  });
  if (!ids.length) return { error: "Kurulum zaten yapılmış." };
  await startSession(ids[0]);
  redirect("/");
}

export async function loginAction(_: FormState, form: FormData): Promise<FormState> {
  const id = Number(form.get("profileId"));
  const pin = String(form.get("pin") ?? "");
  const [p] = await sql<{ id: number; pin_hash: string; failed_attempts: number; locked: boolean }[]>`
    select id, pin_hash, failed_attempts, coalesce(locked_until > now(), false) as locked
    from profiles where id = ${id}`;
  if (!p) return { error: "Profil bulunamadı." };
  if (p.locked) return { error: "Çok fazla yanlış deneme. 5 dakika sonra tekrar dene." };
  if (!verifyPin(pin, p.pin_hash)) {
    const attempts = p.failed_attempts + 1;
    await sql`update profiles set failed_attempts = ${attempts % 5},
              locked_until = ${attempts >= 5 ? sql`now() + interval '5 minutes'` : null}
              where id = ${id}`;
    return { error: attempts >= 5 ? "Çok fazla yanlış deneme. 5 dakika bekle." : "PIN yanlış." };
  }
  await sql`update profiles set failed_attempts = 0, locked_until = null where id = ${id}`;
  await startSession(id);
  redirect("/");
}

export async function logoutAction() {
  await endSession();
  redirect("/giris");
}

// ---------------------------------------------------------------- görevler

export async function completeAction(taskId: number): Promise<CompleteResult | { error: string }> {
  const { me } = await requireUser();
  try {
    const r = await completeTask(me, taskId);
    refresh();
    return r;
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function undoAction(taskId: number) {
  const { me } = await requireUser();
  await undoCompletion(me, taskId);
  refresh();
}

export async function decideAction(completionId: number, approve: boolean) {
  const { me } = await requireUser();
  try {
    const r = await decideCompletion(me, completionId, approve);
    refresh();
    return { badges: r.badges.map(({ emoji, name, description }) => ({ emoji, name, description })) };
  } catch (e) {
    return { error: (e as Error).message, badges: [] };
  }
}

export async function saveTaskAction(_: FormState, form: FormData): Promise<FormState> {
  const { me, partner } = await requireUser();
  const id = Number(form.get("id") || 0);
  const title = String(form.get("title") ?? "").trim().slice(0, 80);
  if (!title) return { error: "Görevin bir adı olmalı." };

  const kind = String(form.get("kind"));
  if (!["once", "recurring", "habit"].includes(kind)) return { error: "Görev tipi seç." };
  const who = String(form.get("who"));
  const assignee = who === "me" ? me.id : who === "partner" ? partner.id : null;
  // Alt görevler (formda sıralı listeler halinde gelir)
  const subIds = form.getAll("sub_id").map((v) => Number(v) || 0);
  const subTitles = form.getAll("sub_title").map((v) => String(v).trim().slice(0, 60));
  const subXps = form.getAll("sub_xp").map((v) => Number(v));
  const subs = subTitles
    .map((t, i) => ({ id: subIds[i] ?? 0, title: t, xp: subXps[i] }))
    .filter((x) => x.title);
  if (subs.length > 20) return { error: "En fazla 20 alt görev ekleyebilirsin." };
  for (const x of subs) {
    if (!Number.isInteger(x.xp) || x.xp < MIN_CARROTS || x.xp > MAX_CARROTS)
      return { error: `"${x.title}" için havuç ${MIN_CARROTS} ile ${MAX_CARROTS} arasında olmalı.` };
  }

  const xpRaw = Number(form.get("xp"));
  // Alt görevi olan görevde ana değer "hepsini bitirme bonusu"dur ve 0 olabilir
  const minXp = subs.length ? 0 : MIN_CARROTS;
  if (!Number.isInteger(xpRaw) || xpRaw < minXp || xpRaw > MAX_CARROTS)
    return { error: `Havuç ${minXp} ile ${MAX_CARROTS} arasında olmalı.` };
  const xp = xpRaw;
  const requiresApproval = assignee !== null && form.get("approval") === "on";
  const remind = String(form.get("remind") ?? "");
  const remindTime = /^\d{2}:\d{2}$/.test(remind) ? remind : null;
  const emoji = String(form.get("emoji") || "✅").slice(0, 8);
  const notes = String(form.get("notes") ?? "").trim().slice(0, 500);

  let dueDate: string | null = null;
  let repeat: string | null = null;
  let repeatDays: number[] = [];
  let repeatDom: number | null = null;
  if (kind === "once") {
    const d = String(form.get("due") ?? "");
    dueDate = /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
  } else {
    repeat = String(form.get("repeat"));
    if (!["daily", "weekly", "monthly"].includes(repeat)) return { error: "Tekrar sıklığını seç." };
    if (repeat === "weekly") {
      repeatDays = form.getAll("days").map(Number).filter((n) => n >= 0 && n <= 6);
      if (!repeatDays.length) return { error: "Haftanın en az bir gününü seç." };
    }
    if (repeat === "monthly") {
      repeatDom = Math.min(31, Math.max(1, Number(form.get("dom")) || 1));
    }
  }

  if (id) {
    const existing = await getTask(id);
    if (!existing || existing.archived) return { error: "Görev bulunamadı." };
    if (existing.creator_id !== me.id) return { error: "Bu görevi sadece oluşturan kişi değiştirebilir." };
    await sql`
      update tasks set title = ${title}, emoji = ${emoji}, notes = ${notes}, kind = ${kind},
        assignee_id = ${assignee}, xp = ${xp}, requires_approval = ${requiresApproval},
        due_date = ${dueDate}, repeat = ${repeat}, repeat_days = ${repeatDays}::int[],
        repeat_dom = ${repeatDom}, remind_time = ${remindTime}
      where id = ${id}`;
    await saveSubtasks(id, subs);
  } else {
    const [created] = await sql<{ id: number }[]>`
      insert into tasks (title, emoji, notes, kind, creator_id, assignee_id, xp, requires_approval,
                         due_date, repeat, repeat_days, repeat_dom, remind_time, start_date)
      values (${title}, ${emoji}, ${notes}, ${kind}, ${me.id}, ${assignee}, ${xp}, ${requiresApproval},
              ${dueDate}, ${repeat}, ${repeatDays}::int[], ${repeatDom}, ${remindTime}, ${todayStr()})
      returning id`;
    await saveSubtasks(created.id, subs);
    if (assignee !== me.id) {
      const total = xp + subs.reduce((n, x) => n + x.xp, 0);
      notifyLater(partner.id, {
        title: assignee === null ? `💞 ${me.name} ortak görev ekledi` : `📝 ${me.name} sana görev verdi`,
        body: `${emoji} ${title}${subs.length ? ` · ${subs.length} adım` : ""} (+${total} 🥕)`,
        url: "/",
        tag: `new-task`,
      });
    }
  }
  refresh();
  redirect("/gorevler");
}

/** Alt görev listesini kaydeder: var olanları günceller, yenileri ekler, çıkarılanları arşivler. */
async function saveSubtasks(taskId: number, subs: { id: number; title: string; xp: number }[]) {
  const existing = await sql<{ id: number }[]>`select id from subtasks where task_id = ${taskId} and not archived`;
  const keep = new Set<number>();
  for (const [i, x] of subs.entries()) {
    if (x.id && existing.some((e) => e.id === x.id)) {
      keep.add(x.id);
      await sql`update subtasks set title = ${x.title}, xp = ${x.xp}, position = ${i} where id = ${x.id}`;
    } else {
      await sql`insert into subtasks (task_id, title, xp, position) values (${taskId}, ${x.title}, ${x.xp}, ${i})`;
    }
  }
  for (const e of existing) {
    if (!keep.has(e.id)) await sql`update subtasks set archived = true where id = ${e.id}`;
  }
}

export async function completeSubtaskAction(subtaskId: number): Promise<CompleteResult | { error: string }> {
  const { me } = await requireUser();
  try {
    const r = await completeSubtask(me, subtaskId);
    refresh();
    return r;
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function undoSubtaskAction(subtaskId: number) {
  const { me } = await requireUser();
  await undoSubtask(me, subtaskId);
  refresh();
}

export async function archiveTaskAction(id: number) {
  const { me } = await requireUser();
  const t = await getTask(id);
  if (!t || t.creator_id !== me.id) return { error: "Bu görevi sadece oluşturan kişi silebilir." };
  await sql`update tasks set archived = true where id = ${id}`;
  refresh();
  redirect("/gorevler");
}

// ---------------------------------------------------------------- hedef & profil

export async function setGoalAction(target: number) {
  await requireUser();
  const t = Math.round(Math.min(5000, Math.max(50, target)) / 10) * 10;
  await setConfig("weekly_goal", String(t));
  refresh();
}

export async function updateProfileAction(_: FormState, form: FormData): Promise<FormState> {
  const { me, partner } = await requireUser();
  const name = String(form.get("name") ?? "").trim().slice(0, 24);
  if (!name) return { error: "Ad boş olamaz." };
  const emoji = String(form.get("emoji") || me.emoji).slice(0, 8);
  const color = cleanColor(form.get("color"));
  if (color === partner.color) return { error: "Bu renk partnerinin. Farklı bir renk seç." };
  await sql`update profiles set name = ${name}, emoji = ${emoji}, color = ${color} where id = ${me.id}`;
  refresh();
  return { ok: "Kaydedildi ✨" };
}

export async function changePinAction(_: FormState, form: FormData): Promise<FormState> {
  const { me } = await requireUser();
  const [p] = await sql<{ pin_hash: string }[]>`select pin_hash from profiles where id = ${me.id}`;
  if (!verifyPin(String(form.get("old") ?? ""), p.pin_hash)) return { error: "Mevcut PIN yanlış." };
  const pin = cleanPin(form.get("new"));
  if (!pin) return { error: "Yeni PIN 4-6 rakam olmalı." };
  await sql`update profiles set pin_hash = ${hashPin(pin)} where id = ${me.id}`;
  return { ok: "PIN değiştirildi 🔒" };
}

// ---------------------------------------------------------------- bildirimler

export async function subscribeAction(sub: { endpoint: string; keys: { p256dh: string; auth: string } }) {
  const { me } = await requireUser();
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) return { error: "Geçersiz abonelik" };
  await saveSubscription(me.id, sub);
  return { ok: true };
}

export async function unsubscribeAction(endpoint: string) {
  await requireUser();
  await removeSubscription(endpoint);
}

export async function testPushAction() {
  const { me } = await requireUser();
  const n = await sendPush(me.id, {
    title: "🔔 Bildirimler çalışıyor!",
    body: `Merhaba ${me.name}, hatırlatmalar artık bu cihaza gelecek.`,
    tag: "test",
  });
  return { sent: n };
}

export async function nudgePartnerAction() {
  const { me, partner } = await requireUser();
  const n = await sendPush(partner.id, {
    title: `👋 ${me.name} seni dürttü`,
    body: "Bugünkü görevlerine bir göz at 😉",
    tag: "nudge",
  });
  return { sent: n };
}

// ---------------------------------------------------------------- mağaza

export async function saveRewardAction(_: FormState, form: FormData): Promise<FormState> {
  const { me, partner } = await requireUser();
  const title = String(form.get("title") ?? "").trim().slice(0, 60);
  if (!title) return { error: "Ödülün bir adı olmalı." };
  const cost = Number(form.get("cost"));
  if (!Number.isInteger(cost) || cost < 1 || cost > 10000) return { error: "Fiyat 1 ile 10.000 havuç arasında olmalı." };
  const forWho = form.get("forWho") === "partner" ? "partner" : "me";
  const err = await saveReward(me, partner, {
    id: Number(form.get("id") || 0) || undefined,
    title,
    emoji: String(form.get("emoji") || "🎁").slice(0, 8),
    cost,
    forWho,
  });
  if (err) return { error: err };
  refresh();
  redirect("/magaza");
}

export async function archiveRewardAction(id: number) {
  const { me } = await requireUser();
  const err = await archiveReward(me, id);
  if (err) return { error: err };
  refresh();
  redirect("/magaza");
}

export async function buyRewardAction(id: number) {
  const { me, partner } = await requireUser();
  const r = await buyReward(me, partner, id);
  refresh();
  return r;
}

export async function fulfillAction(purchaseId: number) {
  const { me } = await requireUser();
  const err = await fulfillPurchase(me, purchaseId);
  refresh();
  return err ? { error: err } : { ok: true };
}
