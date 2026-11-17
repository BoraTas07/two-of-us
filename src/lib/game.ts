import "server-only";
import { after } from "next/server";
import { BADGES, BADGE_BY_ID, type Badge, type BadgeStats } from "./badges";
import { signAction } from "./auth";
import { ensureSchema, getConfig, sql, txGuard } from "./db";
import { GOAL_BONUS, STREAK_BONUS, levelFromXp } from "./levels";
import { sendPush, type PushMessage } from "./push";
import { isDueOn } from "./recurrence";
import { applyDay, type DayOutcome } from "./streak";
import { addDays, daysBetween, todayStr, weekStart } from "./time";
import type { Completion, Profile, SubCompletion, Subtask, Task } from "./types";

type Sql = typeof sql;

// ---------------------------------------------------------------- yardımcılar

/** Bildirimi yanıt gönderildikten sonra yollar; ekran beklemez. */
export function notifyLater(profileId: number, msg: PushMessage) {
  after(() => sendPush(profileId, msg).then(() => undefined));
}

export async function activeTasks(db: Sql = sql): Promise<Task[]> {
  await ensureSchema();
  return db<Task[]>`select * from tasks where not archived order by created_at, id`;
}

/** Belirli bir tarihten sonraki tamamlamalar + tek seferlik görevlerin tüm tamamlamaları */
export async function loadCompletions(from: string, db: Sql = sql): Promise<Completion[]> {
  return db<Completion[]>`
    select c.* from completions c join tasks t on t.id = c.task_id
    where c.occ_date >= ${from} or t.kind = 'once'`;
}

export type CompletionIndex = {
  byKey: Map<string, Completion>;
  once: Map<number, Completion>;
  all: Completion[];
};

export function indexCompletions(list: Completion[], tasks: Task[]): CompletionIndex {
  const kinds = new Map(tasks.map((t) => [t.id, t.kind]));
  const byKey = new Map<string, Completion>();
  const once = new Map<number, Completion>();
  for (const c of list) {
    byKey.set(`${c.task_id}|${c.occ_date}`, c);
    if (kinds.get(c.task_id) === "once") once.set(c.task_id, c);
  }
  return { byKey, once, all: list };
}

export function completionFor(t: Task, day: string, idx: CompletionIndex): Completion | undefined {
  return t.kind === "once" ? idx.once.get(t.id) : idx.byKey.get(`${t.id}|${day}`);
}

export function relevantTo(t: Task, profileId: number): boolean {
  return t.assignee_id === profileId || t.assignee_id === null;
}

/** Bir günün seri açısından sonucu: kaç görev vardı, kaçı yapıldı */
export function dayResult(profileId: number, day: string, tasks: Task[], idx: CompletionIndex) {
  const due = tasks.filter((t) => relevantTo(t, profileId) && isDueOn(t, day));
  const done = due.filter((t) => completionFor(t, day, idx)).length;
  const sharedIds = new Set(tasks.filter((t) => t.assignee_id === null).map((t) => t.id));
  const anyCompletion = idx.all.some(
    (c) =>
      todayStr(new Date(c.completed_at)) === day &&
      (c.profile_id === profileId || sharedIds.has(c.task_id)),
  );
  return { due: due.length, done, anyCompletion };
}

/** Bir alışkanlığın güncel serisi (bugün yapıldıysa bugün dahil) */
export function habitStreak(t: Task, today: string, idx: CompletionIndex): number {
  let count = completionFor(t, today, idx) ? 1 : 0;
  let d = addDays(today, -1);
  for (let i = 0; i < 400 && d >= t.start_date; i++, d = addDays(d, -1)) {
    if (!isDueOn(t, d)) continue;
    if (!completionFor(t, d, idx)) break;
    count++;
  }
  return count;
}

function longestHabitStreak(t: Task, today: string, idx: CompletionIndex): number {
  let best = 0;
  let run = 0;
  let d = t.start_date;
  if (daysBetween(d, today) > 400) d = addDays(today, -400);
  for (; d <= today; d = addDays(d, 1)) {
    if (!isDueOn(t, d)) continue;
    if (completionFor(t, d, idx)) best = Math.max(best, ++run);
    else if (d !== today) run = 0;
  }
  return best;
}

export async function xpTotals(): Promise<Map<number, number>> {
  const rows = await sql<{ profile_id: number; total: number }[]>`
    select profile_id, coalesce(sum(amount), 0)::int as total from xp_events group by profile_id`;
  return new Map(rows.map((r) => [r.profile_id, r.total]));
}

async function profileXp(profileId: number): Promise<number> {
  const [r] = await sql<{ total: number }[]>`
    select coalesce(sum(amount), 0)::int as total from xp_events where profile_id = ${profileId}`;
  return r.total;
}

async function getProfile(id: number): Promise<Profile> {
  const [p] = await sql<Profile[]>`
    select id, name, emoji, color, streak, best_streak, freezes, freezes_month, streak_through
    from profiles where id = ${id}`;
  return p;
}

async function partnerOf(id: number): Promise<Profile> {
  const [p] = await sql<Profile[]>`
    select id, name, emoji, color, streak, best_streak, freezes, freezes_month, streak_through
    from profiles where id <> ${id} order by id limit 1`;
  return p;
}

/** Bugünün görevlerinin hepsi bitti mi? (Bugünün seriye eklenip eklenmeyeceğini gösterir) */
export function todayComplete(profileId: number, today: string, tasks: Task[], idx: CompletionIndex) {
  const r = dayResult(profileId, today, tasks, idx);
  return r.due > 0 ? r.done >= r.due : r.anyCompletion;
}

/** Ekranda gösterilen seri: kayıtlı seri + bugün tamamlandıysa 1 */
export function displayStreak(p: Profile, today: string, tasks: Task[], idx: CompletionIndex) {
  return p.streak + (todayComplete(p.id, today, tasks, idx) ? 1 : 0);
}

// ---------------------------------------------------------------- seri değerlendirme

/**
 * Geçmiş günleri seriye işler (dün dahil). Hem sayfa açılışında hem zamanlayıcıda
 * çağrılır; aynı gün iki kez işlenmez.
 */
export async function evaluateStreaks(today = todayStr()): Promise<void> {
  await ensureSchema();
  const yesterday = addDays(today, -1);
  const profiles = await sql<Profile[]>`select id, streak_through from profiles`;
  for (const p of profiles) {
    if (p.streak_through >= yesterday) continue;
    const events: { day: string; outcome: DayOutcome; streak: number; bonus: number }[] = [];
    await sql.begin(async (tx) => {
      await txGuard(tx);
      const [row] = await tx<Profile[]>`
        select id, streak, best_streak, freezes, freezes_month, streak_through
        from profiles where id = ${p.id} for update`;
      if (row.streak_through >= yesterday) return;
      let from = addDays(row.streak_through, 1);
      if (daysBetween(from, yesterday) > 60) from = addDays(yesterday, -60);

      const tasks = await activeTasks(tx as unknown as Sql);
      const idx = indexCompletions(await loadCompletions(from, tx as unknown as Sql), tasks);
      let state = {
        streak: row.streak,
        best: row.best_streak,
        freezes: row.freezes,
        freezesMonth: row.freezes_month,
      };
      for (let d = from; d <= yesterday; d = addDays(d, 1)) {
        const res = applyDay(state, d, dayResult(p.id, d, tasks, idx));
        state = res.state;
        const bonus = res.outcome === "kept" ? (STREAK_BONUS[state.streak] ?? 0) : 0;
        if (bonus) {
          await tx`insert into xp_events (profile_id, amount, kind, note, day)
                   values (${p.id}, ${bonus}, 'streak', ${`${state.streak} günlük seri bonusu`}, ${d})`;
        }
        await tx`insert into streak_log (profile_id, day, outcome)
                 values (${p.id}, ${d}, ${res.outcome}) on conflict do nothing`;
        events.push({ day: d, outcome: res.outcome, streak: state.streak, bonus });
      }
      await tx`update profiles set streak = ${state.streak}, best_streak = ${state.best},
               freezes = ${state.freezes}, freezes_month = ${state.freezesMonth},
               streak_through = ${yesterday} where id = ${p.id}`;
    });

    // Sadece dünün sonucu bildirilir (uzun aradan sonra eski günler için bildirim yağmasın).
    const last = events.at(-1);
    if (last && last.day === yesterday) {
      if (last.outcome === "frozen")
        notifyLater(p.id, {
          title: "🧊 Joker kullanıldı",
          body: "Dün birkaç görev kaldı ama serin korundu. Bugün telafi et!",
          tag: "streak",
        });
      else if (last.outcome === "broken")
        notifyLater(p.id, {
          title: "💔 Serin bitti",
          body: "Dün görevler tamamlanmadı. Bugün yeni bir seriye başla!",
          tag: "streak",
        });
      else if (last.bonus)
        notifyLater(p.id, {
          title: `🔥 ${last.streak} günlük seri!`,
          body: `Tebrikler, +${last.bonus} 🥕 bonus kazandın.`,
          tag: "streak",
        });
    }
    if (events.length) await checkBadges(p.id, today);
  }
}

// ---------------------------------------------------------------- rozetler

async function badgeStats(profileId: number, today: string): Promise<BadgeStats> {
  const [counts] = await sql<
    { completed: number; early: boolean; night: boolean; approvals: number; shared: number }[]
  >`
    select
      (select count(*)::int from completions c join tasks t on t.id = c.task_id
        where c.status = 'approved' and (c.profile_id = ${profileId} or t.assignee_id is null)) as completed,
      exists(select 1 from completions where profile_id = ${profileId}
        and extract(hour from completed_at at time zone 'Europe/Istanbul') < 8) as early,
      exists(select 1 from completions where profile_id = ${profileId}
        and extract(hour from completed_at at time zone 'Europe/Istanbul') >= 23) as night,
      (select count(*)::int from completions where decided_by = ${profileId}) as approvals,
      (select count(*)::int from completions c join tasks t on t.id = c.task_id
        where c.status = 'approved' and t.assignee_id is null) as shared`;
  const [goals] = await sql<{ n: number }[]>`select count(*)::int as n from goal_weeks`;

  const tasks = await activeTasks();
  const habits = tasks.filter((t) => t.kind === "habit" && relevantTo(t, profileId));
  const idx = indexCompletions(await loadCompletions(addDays(today, -400)), tasks);
  const bestHabitStreak = Math.max(0, ...habits.map((h) => longestHabitStreak(h, today, idx)));
  const profile = await getProfile(profileId);

  return {
    completed: counts.completed,
    streak: displayStreak(profile, today, tasks, idx),
    level: levelFromXp(await profileXp(profileId)).level,
    earlyBird: counts.early,
    nightOwl: counts.night,
    approvalsGiven: counts.approvals,
    sharedDone: counts.shared,
    goalsAchieved: goals.n,
    bestHabitStreak,
  };
}

/** Yeni kazanılan rozetleri kaydeder, partnere haber verir ve listesini döndürür. */
export async function checkBadges(profileId: number, today = todayStr()): Promise<Badge[]> {
  const stats = await badgeStats(profileId, today);
  const owned = new Set(
    (await sql<{ badge_id: string }[]>`select badge_id from profile_badges where profile_id = ${profileId}`).map(
      (r) => r.badge_id,
    ),
  );
  const fresh: Badge[] = [];
  for (const b of BADGES) {
    if (owned.has(b.id) || !b.earned(stats)) continue;
    const ins = await sql`insert into profile_badges (profile_id, badge_id) values (${profileId}, ${b.id})
                          on conflict do nothing returning badge_id`;
    if (ins.length) fresh.push(b);
  }
  if (fresh.length) {
    const me = await getProfile(profileId);
    const partner = await partnerOf(profileId);
    for (const b of fresh) {
      notifyLater(partner.id, {
        title: `${b.emoji} ${me.name} yeni rozet kazandı!`,
        body: `"${b.name}" — ${b.description}`,
        url: "/biz",
        tag: `badge-${profileId}-${b.id}`,
      });
    }
  }
  return fresh;
}

// ---------------------------------------------------------------- ortak hedef

export async function weeklyGoalTarget(): Promise<number> {
  return Number((await getConfig("weekly_goal")) ?? 100);
}

/**
 * Haftalık ortak hedef ilerlemesi: SADECE ortak (💞) görevlerden gelen havuçlar sayılır.
 * Ortak görevde ikinize de havuç yazılsa da hedefe bir kez eklenir; "kim katkı verdi"
 * görevi (ya da adımı) bitiren kişiye yazılır. Bireysel görevler bu çubuğu ilerletmez.
 */
export async function weekProgress(week: string): Promise<{ total: number; byProfile: Map<number, number> }> {
  const from = week;
  const to = addDays(week, 6);
  const rows = await sql<{ profile_id: number; total: number }[]>`
    select profile_id, sum(xp)::int as total from (
      select c.profile_id, c.xp from completions c join tasks t on t.id = c.task_id
      where t.assignee_id is null and c.status = 'approved'
        and (c.completed_at at time zone 'Europe/Istanbul')::date between ${from}::date and ${to}::date
      union all
      select sc.profile_id, sc.xp from subtask_completions sc join tasks t on t.id = sc.task_id
      where t.assignee_id is null and sc.status = 'approved'
        and (sc.completed_at at time zone 'Europe/Istanbul')::date between ${from}::date and ${to}::date
    ) x group by profile_id`;
  const byProfile = new Map(rows.map((r) => [r.profile_id, r.total]));
  return { total: rows.reduce((s, r) => s + r.total, 0), byProfile };
}

/** Bu hafta ortak hedefe ulaşıldıysa (ilk kez) bonus verir ve ikisine de haber verir. */
async function checkGoal(today: string): Promise<boolean> {
  const week = weekStart(today);
  const target = await weeklyGoalTarget();
  const { total } = await weekProgress(week);
  if (total < target) return false;
  const ins = await sql`insert into goal_weeks (week_start, target) values (${week}, ${target})
                        on conflict do nothing returning week_start`;
  if (!ins.length) return false;
  const profiles = await sql<{ id: number }[]>`select id from profiles`;
  for (const p of profiles) {
    await sql`insert into xp_events (profile_id, amount, kind, note, day)
              values (${p.id}, ${GOAL_BONUS}, 'goal', 'Haftalık ortak hedef bonusu', ${today})`;
    notifyLater(p.id, {
      title: "🏆 Haftalık hedefe ulaştınız!",
      body: `Birlikte ${target} havuç topladınız. İkinize de +${GOAL_BONUS} 🥕!`,
      url: "/biz",
      tag: "goal",
    });
  }
  return true;
}

// ---------------------------------------------------------------- eylemler

export type CompleteResult = {
  status: "approved" | "pending" | "already";
  xp: number;
  levelUp: number | null;
  badges: { emoji: string; name: string; description: string }[];
  goalReached: boolean;
  /** Alt görev işaretlendiyse: ana görev de bu işlemle tamamlandı mı? */
  parentDone?: boolean;
};

const NOTHING: CompleteResult = { status: "already", xp: 0, levelUp: null, badges: [], goalReached: false };

async function awardXp(profileIds: number[], completionId: number, xp: number, title: string, day: string) {
  if (xp <= 0) return;
  for (const pid of profileIds) {
    await sql`insert into xp_events (profile_id, amount, kind, completion_id, note, day)
              values (${pid}, ${xp}, 'task', ${completionId}, ${title}, ${day})`;
  }
}

async function awardSubXp(profileIds: number[], subCompletionId: number, xp: number, note: string, day: string) {
  if (xp <= 0) return;
  for (const pid of profileIds) {
    await sql`insert into xp_events (profile_id, amount, kind, subtask_completion_id, note, day)
              values (${pid}, ${xp}, 'task', ${subCompletionId}, ${note}, ${day})`;
  }
}

export async function getTask(id: number): Promise<Task | undefined> {
  const [t] = await sql<Task[]>`select * from tasks where id = ${id}`;
  return t;
}

// ---------------------------------------------------------------- alt görevler

export async function loadSubtasks(taskId?: number): Promise<Subtask[]> {
  await ensureSchema();
  return taskId
    ? sql<Subtask[]>`select id, task_id, title, xp, position from subtasks
                     where task_id = ${taskId} and not archived order by position, id`
    : sql<Subtask[]>`select id, task_id, title, xp, position from subtasks
                     where not archived order by task_id, position, id`;
}

export async function loadSubCompletions(from: string): Promise<SubCompletion[]> {
  return sql<SubCompletion[]>`
    select sc.* from subtask_completions sc join tasks t on t.id = sc.task_id
    where sc.occ_date >= ${from} or t.kind = 'once'`;
}

/** Görevin hangi "gün"üne ait olduğu: tekrarlıda bugün, tek seferlikte sabit bir anahtar */
function occFor(task: Task, today: string): string {
  return task.kind === "once" ? (task.due_date ?? task.start_date) : today;
}

/** Görev şu an bu kişi tarafından tamamlanabilir mi? Değilse hata fırlatır. */
async function checkCompletable(me: Profile, task: Task | undefined, today: string): Promise<Task> {
  if (!task || task.archived || !relevantTo(task, me.id)) throw new Error("Görev bulunamadı");
  if (task.kind !== "once" && !isDueOn(task, today)) throw new Error("Bu görev bugün yapılacaklar arasında değil");
  return task;
}

/** Bir alt görevi işaretler (havucunu verir). Yeni işaretlendiyse kaydı döner. */
async function insertSubCompletion(
  me: Profile,
  partner: Profile,
  task: Task,
  sub: Subtask,
  occ: string,
  status: "pending" | "approved",
  today: string,
): Promise<boolean> {
  const [sc] = await sql<{ id: number }[]>`
    insert into subtask_completions (subtask_id, task_id, profile_id, occ_date, status, xp)
    values (${sub.id}, ${task.id}, ${me.id}, ${occ}, ${status}, ${sub.xp})
    on conflict (subtask_id, occ_date) do nothing returning id`;
  if (!sc) return false;
  if (status === "approved") {
    const shared = task.assignee_id === null;
    await awardSubXp(shared ? [me.id, partner.id] : [me.id], sc.id, sub.xp, `${task.title} › ${sub.title}`, today);
  }
  return true;
}

async function pendingSubXp(taskId: number, occ: string): Promise<number> {
  const [r] = await sql<{ n: number }[]>`
    select coalesce(sum(xp), 0)::int as n from subtask_completions
    where task_id = ${taskId} and occ_date = ${occ} and status = 'pending'`;
  return r.n;
}

/**
 * Ana görevin tamamlanma kaydını oluşturur ve sonrasını (bildirim, seviye, rozet, hedef) halleder.
 * `earnedBefore`: bu işlemde alt görevlerden kazanılmış havuç (sonuç ekranında toplam gösterilir).
 */
async function finishTask(
  me: Profile,
  partner: Profile,
  task: Task,
  occ: string,
  status: "pending" | "approved",
  today: string,
  levelBefore: number,
  earnedBefore: number,
): Promise<CompleteResult> {
  const shared = task.assignee_id === null;
  const [c] = await sql<{ id: number }[]>`
    insert into completions (task_id, profile_id, occ_date, status, xp)
    values (${task.id}, ${me.id}, ${occ}, ${status}, ${task.xp})
    on conflict (task_id, occ_date) do nothing returning id`;
  if (!c) return earnedBefore ? { ...NOTHING, status, xp: earnedBefore } : NOTHING;

  if (status === "pending") {
    const total = task.xp + (await pendingSubXp(task.id, occ));
    notifyLater(partner.id, {
      title: `🙋 ${me.name} onayını bekliyor`,
      body: `${task.emoji} ${task.title} — onaylarsan +${total} 🥕 kazanacak`,
      url: "/#onay",
      tag: `approve-${c.id}`,
      actions: [
        { action: "approve", title: "✓ Onayla" },
        { action: "reject", title: "↩ Geri çevir" },
      ],
      token: await signAction("decide", partner.id, c.id),
    });
    return { status, xp: total, levelUp: null, badges: [], goalReached: false, parentDone: true };
  }

  await awardXp(shared ? [me.id, partner.id] : [me.id], c.id, task.xp, task.title, today);
  const total = earnedBefore + task.xp;
  if (shared) {
    notifyLater(partner.id, {
      title: `💞 ${me.name} ortak görevi bitirdi`,
      body: `${task.emoji} ${task.title} — ikinize de +${task.xp} 🥕!`,
      tag: `done-${c.id}`,
    });
  } else if (task.creator_id === partner.id) {
    notifyLater(partner.id, {
      title: `✅ ${me.name} verdiğin görevi bitirdi`,
      body: `${task.emoji} ${task.title}`,
      tag: `done-${c.id}`,
    });
  }
  return { ...(await afterAward(me, partner, shared, today, levelBefore)), status, xp: total, parentDone: true };
}

/** Havuç verildikten sonra: seviye, rozet, ortak hedef */
async function afterAward(me: Profile, partner: Profile, shared: boolean, today: string, levelBefore: number) {
  const levelAfter = levelFromXp(await profileXp(me.id)).level;
  const badges = await checkBadges(me.id, today);
  if (shared) await checkBadges(partner.id, today);
  const goalReached = await checkGoal(today);
  if (levelAfter > levelBefore) {
    notifyLater(partner.id, {
      title: `⬆️ ${me.name} seviye atladı!`,
      body: `Artık ${levelAfter}. seviye. Tebrik etmeyi unutma 🎉`,
      tag: `level-${me.id}`,
    });
  }
  return {
    levelUp: levelAfter > levelBefore ? levelAfter : null,
    badges: badges.map(({ emoji, name, description }) => ({ emoji, name, description })),
    goalReached,
  };
}

/**
 * Görevi tamamlar. Alt görevleri varsa kalanların hepsini de işaretler
 * (ör. bildirimdeki "Tamamla" butonu ya da karttaki "Hepsini bitir").
 */
export async function completeTask(me: Profile, taskId: number): Promise<CompleteResult> {
  const today = todayStr();
  const task = await checkCompletable(me, await getTask(taskId), today);
  if (task.kind === "once") {
    const prev = await sql`select 1 from completions where task_id = ${task.id} limit 1`;
    if (prev.length) return NOTHING;
  }
  const occ = occFor(task, today);
  const status = task.requires_approval && task.assignee_id !== null ? "pending" : "approved";
  const partner = await partnerOf(me.id);
  const levelBefore = levelFromXp(await profileXp(me.id)).level;

  let earned = 0;
  for (const sub of await loadSubtasks(task.id)) {
    if (await insertSubCompletion(me, partner, task, sub, occ, status, today)) {
      if (status === "approved") earned += sub.xp;
    }
  }
  return finishTask(me, partner, task, occ, status, today, levelBefore, earned);
}

/** Tek bir alt görevi işaretler; hepsi bittiyse ana görevi de tamamlar. */
export async function completeSubtask(me: Profile, subtaskId: number): Promise<CompleteResult> {
  const today = todayStr();
  const [sub] = await sql<Subtask[]>`
    select id, task_id, title, xp, position from subtasks where id = ${subtaskId} and not archived`;
  if (!sub) throw new Error("Alt görev bulunamadı");
  const task = await checkCompletable(me, await getTask(sub.task_id), today);
  const occ = occFor(task, today);
  const status = task.requires_approval && task.assignee_id !== null ? "pending" : "approved";
  const partner = await partnerOf(me.id);
  const levelBefore = levelFromXp(await profileXp(me.id)).level;

  if (!(await insertSubCompletion(me, partner, task, sub, occ, status, today))) return NOTHING;
  const earned = status === "approved" ? sub.xp : 0;

  const [left] = await sql<{ n: number }[]>`
    select count(*)::int as n from subtasks s
    where s.task_id = ${task.id} and not s.archived
      and not exists (select 1 from subtask_completions sc where sc.subtask_id = s.id and sc.occ_date = ${occ})`;
  if (left.n === 0) return finishTask(me, partner, task, occ, status, today, levelBefore, earned);

  if (status === "pending") return { ...NOTHING, status, xp: sub.xp };
  return { ...(await afterAward(me, partner, task.assignee_id === null, today, levelBefore)), status, xp: earned };
}

/** Yanlışlıkla işaretlenen alt görevi geri al (ana görev de tamamlanmamış sayılır). */
export async function undoSubtask(me: Profile, subtaskId: number): Promise<void> {
  const today = todayStr();
  const [sc] = await sql<SubCompletion[]>`
    delete from subtask_completions
    where subtask_id = ${subtaskId} and profile_id = ${me.id}
      and (completed_at at time zone 'Europe/Istanbul')::date >= ${addDays(today, -1)}::date
    returning *`;
  if (sc) await sql`delete from completions where task_id = ${sc.task_id} and occ_date = ${sc.occ_date}`;
}

/** Yanlışlıkla işaretlemeyi geri al (sadece kendi tamamlaman, bugün veya dün). */
export async function undoCompletion(me: Profile, taskId: number): Promise<void> {
  const task = await getTask(taskId);
  if (!task) return;
  const today = todayStr();
  const since = addDays(today, -1);
  const removed = await sql<{ occ_date: string }[]>`
    delete from completions
    where task_id = ${taskId} and profile_id = ${me.id}
      and (completed_at at time zone 'Europe/Istanbul')::date >= ${since}::date
    returning occ_date`;
  for (const r of removed) {
    await sql`delete from subtask_completions
              where task_id = ${taskId} and occ_date = ${r.occ_date} and profile_id = ${me.id}`;
  }
}

export async function decideCompletion(me: Profile, completionId: number, approve: boolean) {
  const [c] = await sql<(Completion & { title: string; emoji: string; assignee_id: number | null })[]>`
    select c.*, t.title, t.emoji, t.assignee_id from completions c join tasks t on t.id = c.task_id
    where c.id = ${completionId} and c.status = 'pending'`;
  if (!c || c.profile_id === me.id) throw new Error("Onaylanacak görev bulunamadı");
  const today = todayStr();

  if (!approve) {
    await sql`delete from subtask_completions
              where task_id = ${c.task_id} and occ_date = ${c.occ_date} and status = 'pending'`;
    await sql`delete from completions where id = ${c.id}`;
    notifyLater(c.profile_id, {
      title: `↩️ ${me.name} görevi geri çevirdi`,
      body: `${c.emoji} ${c.title} — bir daha bakmak ister misin?`,
      tag: `approve-${c.id}`,
    });
    return { badges: [] as Badge[] };
  }

  const levelBefore = levelFromXp(await profileXp(c.profile_id)).level;
  await sql`update completions set status = 'approved', decided_by = ${me.id}, decided_at = now()
            where id = ${c.id}`;
  await awardXp([c.profile_id], c.id, c.xp, c.title, today);
  // Bu rutinin onay bekleyen alt görevleri de onaylanır
  const subs = await sql<(SubCompletion & { sub_title: string })[]>`
    update subtask_completions sc set status = 'approved'
    from subtasks s
    where s.id = sc.subtask_id and sc.task_id = ${c.task_id} and sc.occ_date = ${c.occ_date} and sc.status = 'pending'
    returning sc.*, s.title as sub_title`;
  let total = c.xp;
  for (const sc of subs) {
    await awardSubXp([sc.profile_id], sc.id, sc.xp, `${c.title} › ${sc.sub_title}`, today);
    total += sc.xp;
  }
  const levelAfter = levelFromXp(await profileXp(c.profile_id)).level;
  notifyLater(c.profile_id, {
    title: `🎉 ${me.name} onayladı: +${total} 🥕`,
    body:
      `${c.emoji} ${c.title}` + (levelAfter > levelBefore ? ` — ve ${levelAfter}. seviyeye çıktın! ⬆️` : ""),
    tag: `approve-${c.id}`,
  });
  await checkBadges(c.profile_id, today);
  const mine = await checkBadges(me.id, today);
  await checkGoal(today);
  return { badges: mine };
}

export { BADGE_BY_ID };
