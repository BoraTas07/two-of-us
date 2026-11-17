"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { allProfiles, endSession, hashPin, requireUser, startSession, verifyPin } from "@/lib/auth";
import { ensureSchema, setConfig, sql } from "@/lib/db";
import {
  completeTask,
  decideCompletion,
  getTask,
  notifyLater,
  undoCompletion,
  type CompleteResult,
} from "@/lib/game";
import { removeSubscription, saveSubscription, sendPush } from "@/lib/push";
import { addDays, todayStr } from "@/lib/time";
import { COLORS } from "@/lib/types";

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
  const xp = [10, 20, 40].includes(Number(form.get("xp"))) ? Number(form.get("xp")) : 10;
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
    if (!existing) return { error: "Görev bulunamadı." };
    await sql`
      update tasks set title = ${title}, emoji = ${emoji}, notes = ${notes}, kind = ${kind},
        assignee_id = ${assignee}, xp = ${xp}, requires_approval = ${requiresApproval},
        due_date = ${dueDate}, repeat = ${repeat}, repeat_days = ${repeatDays}::int[],
        repeat_dom = ${repeatDom}, remind_time = ${remindTime}
      where id = ${id}`;
  } else {
    await sql`
      insert into tasks (title, emoji, notes, kind, creator_id, assignee_id, xp, requires_approval,
                         due_date, repeat, repeat_days, repeat_dom, remind_time, start_date)
      values (${title}, ${emoji}, ${notes}, ${kind}, ${me.id}, ${assignee}, ${xp}, ${requiresApproval},
              ${dueDate}, ${repeat}, ${repeatDays}::int[], ${repeatDom}, ${remindTime}, ${todayStr()})`;
    if (assignee !== me.id) {
      notifyLater(partner.id, {
        title: assignee === null ? `💞 ${me.name} ortak görev ekledi` : `📝 ${me.name} sana görev verdi`,
        body: `${emoji} ${title} (+${xp} XP)`,
        url: "/",
        tag: `new-task`,
      });
    }
  }
  refresh();
  redirect("/gorevler");
}

export async function archiveTaskAction(id: number) {
  await requireUser();
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
  const { me } = await requireUser();
  const name = String(form.get("name") ?? "").trim().slice(0, 24);
  if (!name) return { error: "Ad boş olamaz." };
  const emoji = String(form.get("emoji") || me.emoji).slice(0, 8);
  const color = cleanColor(form.get("color"));
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
