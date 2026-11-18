"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { allProfiles, endSession, hashPin, requireUser, startSession, verifyPin, widgetToken } from "@/lib/auth";
import { ensureSchema, setConfig, sql, txGuard } from "@/lib/db";
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
import { storeNotification } from "@/lib/notifications";
import { archiveReward, buyReward, fulfillPurchase, saveReward } from "@/lib/shop";
import { createObjection, resolveObjection, withdrawObjection } from "@/lib/objections";
import { markEmojisSeen, sendEmoji } from "@/lib/emoji-server";
import { requestLocation, saveLocation, setSharing } from "@/lib/location";
import { reactSong, removeTodaySong, shareSong } from "@/lib/songs";
import { addDeed, removeDeed, setMood, thankDeed } from "@/lib/moods";
import { addComment, deleteComment, deleteMoment, reactMoment } from "@/lib/moments";
import { answerSwap, cancelSwap, offerSwap } from "@/lib/swaps";
import { addCustomQuestion, answerQuestion, removeCustomQuestion } from "@/lib/questions";
import { addDream, removeDream } from "@/lib/dreams";
import { addItems, clearChecked, removeItem, toggleItem } from "@/lib/shopping";
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
    await txGuard(tx);
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
  const requiresPhoto = requiresApproval && form.get("photo") === "on";
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
        requires_photo = ${requiresPhoto},
        due_date = ${dueDate}, repeat = ${repeat}, repeat_days = ${repeatDays}::int[],
        repeat_dom = ${repeatDom}, remind_time = ${remindTime}
      where id = ${id}`;
    await saveSubtasks(id, subs);
  } else {
    const [created] = await sql<{ id: number }[]>`
      insert into tasks (title, emoji, notes, kind, creator_id, assignee_id, xp, requires_approval, requires_photo,
                         due_date, repeat, repeat_days, repeat_dom, remind_time, start_date)
      values (${title}, ${emoji}, ${notes}, ${kind}, ${me.id}, ${assignee}, ${xp}, ${requiresApproval}, ${requiresPhoto},
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
  // Görev kime aitse o sekmeye dön (varsayılan sekme "Benim" olduğu için)
  redirect(assignee === me.id ? "/gorevler" : assignee === null ? "/gorevler?kim=ortak" : "/gorevler?kim=partner");
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
  const nudge = { title: `👋 ${me.name} seni dürttü`, body: "Bugünkü görevlerine bir göz at 😉", tag: "nudge", url: "/" };
  await storeNotification(partner.id, nudge);
  const n = await sendPush(partner.id, nudge);
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

// ---------------------------------------------------------------- itirazlar

export async function objectAction(_: FormState, form: FormData): Promise<FormState> {
  const { me } = await requireUser();
  const kind = form.get("kind") === "amount" ? "amount" : "task";
  const proposedRaw = form.get("proposed");
  const err = await createObjection(me, {
    taskId: Number(form.get("taskId")),
    subtaskId: Number(form.get("subtaskId")) || null,
    kind,
    reason: String(form.get("reason") ?? ""),
    proposed: kind === "amount" && proposedRaw !== null && proposedRaw !== "" ? Number(proposedRaw) : null,
  });
  if (err) return { error: err };
  refresh();
  return { ok: "İtirazın iletildi ⚖️" };
}

export async function withdrawObjectionAction(id: number) {
  const { me } = await requireUser();
  const err = await withdrawObjection(me, id);
  refresh();
  return err ? { error: err } : { ok: true };
}

export async function resolveObjectionAction(id: number, accept: boolean, note: string) {
  const { me } = await requireUser();
  const err = await resolveObjection(me, id, accept, note);
  refresh();
  return err ? { error: err } : { ok: true };
}

// ---------------------------------------------------------------- widget

export async function renewWidgetAction() {
  const { me } = await requireUser();
  await widgetToken(me.id, true);
  refresh();
}

// ---------------------------------------------------------------- emojiler

export async function sendEmojiAction(emoji: string) {
  const { me, partner } = await requireUser();
  const err = await sendEmoji(me, partner, emoji);
  if (err) return { error: err };
  refresh();
  return { ok: true };
}

export async function markEmojisSeenAction(ids: number[]) {
  const { me } = await requireUser();
  await markEmojisSeen(me.id, ids.filter((n) => Number.isInteger(n)).slice(0, 50));
}

// ---------------------------------------------------------------- konum

export async function setLocationSharingAction(on: boolean) {
  const { me, partner } = await requireUser();
  await setSharing(me, on);
  if (on) {
    notifyLater(partner.id, {
      title: `📍 ${me.name} konumunu seninle paylaşmaya başladı`,
      body: "Konum sayfasından görebilirsin.",
      url: "/konum",
      tag: `loc-on-${me.id}`,
    });
  }
  refresh();
}

export async function updateLocationAction(lat: number, lng: number, accuracy: number | null) {
  const { me } = await requireUser();
  const err = await saveLocation(me, Number(lat), Number(lng), accuracy === null ? null : Number(accuracy));
  return err ? { error: err } : { ok: true };
}

export async function requestLocationAction() {
  const { me, partner } = await requireUser();
  const err = await requestLocation(me, partner);
  return err ? { error: err } : { ok: true };
}

// ---------------------------------------------------------------- günün şarkısı

export async function shareSongAction(_: FormState, form: FormData): Promise<FormState> {
  const { me, partner } = await requireUser();
  const err = await shareSong(me, partner, {
    url: String(form.get("url") ?? ""),
    title: String(form.get("title") ?? ""),
    note: String(form.get("note") ?? ""),
  });
  if (err) return { error: err };
  refresh();
  return { ok: "Paylaşıldı 🎵" };
}

export async function removeSongAction() {
  const { me } = await requireUser();
  await removeTodaySong(me);
  refresh();
}

export async function reactSongAction(songId: number, emoji: string | null) {
  const { me } = await requireUser();
  const err = await reactSong(me, songId, emoji);
  refresh();
  return err ? { error: err } : { ok: true };
}

// ---------------------------------------------------------------- ruh hali & partnerin için

export async function setMoodAction(mood: string, note: string) {
  const { me, partner } = await requireUser();
  const err = await setMood(me, partner, mood, note);
  refresh();
  return err ? { error: err } : { ok: true };
}

export async function addDeedAction(emoji: string, text: string) {
  const { me, partner } = await requireUser();
  const err = await addDeed(me, partner, emoji, text);
  refresh();
  return err ? { error: err } : { ok: true };
}

export async function removeDeedAction(id: number) {
  const { me } = await requireUser();
  await removeDeed(me, id);
  refresh();
}

export async function thankDeedAction(id: number) {
  const { me } = await requireUser();
  const err = await thankDeed(me, id);
  refresh();
  return err ? { error: err } : { ok: true };
}

// ---------------------------------------------------------------- sensiz içime sinmiyor

export async function deleteMomentAction(id: number) {
  const { me } = await requireUser();
  const err = await deleteMoment(me, id);
  refresh();
  return err ? { error: err } : { ok: true };
}

export async function reactMomentAction(id: number, emoji: string | null) {
  const { me } = await requireUser();
  const err = await reactMoment(me, id, emoji);
  refresh();
  return err ? { error: err } : { ok: true };
}

export async function commentMomentAction(id: number, text: string) {
  const { me, partner } = await requireUser();
  const err = await addComment(me, partner, id, text);
  refresh();
  return err ? { error: err } : { ok: true };
}

export async function deleteCommentAction(id: number) {
  const { me } = await requireUser();
  await deleteComment(me, id);
  refresh();
}

// ---------------------------------------------------------------- görev takası

export async function offerSwapAction(taskId: number, bonus: number) {
  const { me, partner } = await requireUser();
  const err = await offerSwap(me, partner, taskId, bonus);
  refresh();
  return err ? { error: err } : { ok: true };
}

export async function cancelSwapAction(id: number) {
  const { me } = await requireUser();
  await cancelSwap(me, id);
  refresh();
}

export async function answerSwapAction(id: number, accept: boolean) {
  const { me } = await requireUser();
  const err = await answerSwap(me, id, accept);
  refresh();
  return err ? { error: err } : { ok: true };
}

// ---------------------------------------------------------------- günün sorusu

export async function answerQuestionAction(text: string) {
  const { me, partner } = await requireUser();
  const err = await answerQuestion(me, partner, text);
  refresh();
  return err ? { error: err } : { ok: true };
}

export async function addQuestionAction(text: string) {
  const { me } = await requireUser();
  const err = await addCustomQuestion(me, text);
  refresh();
  return err ? { error: err } : { ok: true };
}

export async function removeQuestionAction(id: number) {
  const { me } = await requireUser();
  await removeCustomQuestion(me, id);
  refresh();
}

// ---------------------------------------------------------------- birlikte yapacaklarımız

export async function addDreamAction(title: string, emoji: string, notes: string, xp: number) {
  const { me, partner } = await requireUser();
  const err = await addDream(me, partner, title, emoji, notes, xp);
  refresh();
  return err ? { error: err } : { ok: true };
}

export async function removeDreamAction(id: number) {
  const { me } = await requireUser();
  await removeDream(me, id);
  refresh();
}

// ---------------------------------------------------------------- alışveriş listesi

export async function addShopAction(text: string) {
  const { me, partner } = await requireUser();
  const err = await addItems(me, partner, text);
  refresh();
  return err ? { error: err } : { ok: true };
}

export async function toggleShopAction(id: number) {
  const { me } = await requireUser();
  await toggleItem(me, id);
  refresh();
}

export async function removeShopAction(id: number) {
  await requireUser();
  await removeItem(id);
  refresh();
}

export async function clearShopAction() {
  await requireUser();
  await clearChecked();
  refresh();
}
