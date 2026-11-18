import "server-only";
import { sql } from "./db";
import {
  activeTasks,
  assigneeOn,
  completionFor,
  dayResult,
  displayStreak,
  habitStreak,
  indexCompletions,
  loadCompletions,
  loadSubCompletions,
  loadSubtasks,
  relevantTo,
  todayComplete,
  weekProgress,
  weeklyGoalTarget,
  xpTotals,
  type CompletionIndex,
} from "./game";
import { levelFromXp, type LevelInfo } from "./levels";
import { openObjectionTaskIds } from "./objections";
import { photoStates, type PhotoState } from "./photos";
import { liveSwaps, type Swap } from "./swaps";
import { describeRepeat, isDueOn } from "./recurrence";
import { addDays, formatShort, todayStr, weekStart, weekday, WEEKDAYS_SHORT } from "./time";
import type { Profile, SubCompletion, Subtask, Task } from "./types";

export type TaskItem = {
  id: number;
  title: string;
  emoji: string;
  notes: string;
  kind: Task["kind"];
  xp: number;
  requiresApproval: boolean;
  shared: boolean;
  assigneeId: number | null;
  creatorId: number;
  remindTime: string | null;
  dueDate: string | null;
  repeatText: string;
  overdue: boolean;
  habitStreak: number;
  done: null | { status: "pending" | "approved"; byId: number };
  /** Giriş yapan kişi bu görevi şu an tamamlayabilir mi? */
  canComplete: boolean;
  /** Tamamlayamıyorsa kısa açıklama */
  blockedReason: string | null;
  subtasks: SubItem[];
  /** Cevap bekleyen bir itiraz var mı */
  objected: boolean;
  requiresPhoto: boolean;
  /** Bugünkü (ya da tek seferlik) tamamlamanın id'si ve kanıt fotoğrafı durumu */
  completionId: number | null;
  photo: PhotoState;
  /** Bugünkü takas durumu */
  swap: null | { id: number; status: "pending" | "accepted"; fromMe: boolean; bonus: number };
};

export type SubItem = {
  id: number;
  title: string;
  xp: number;
  done: null | { status: "pending" | "approved"; byId: number };
};

type SubState = {
  subs: Subtask[];
  subDone: Map<string, SubCompletion>;
  objected: Set<number>;
  photos: Map<number, PhotoState>;
  swaps: Swap[];
};

type Viewer = { meId: number; partnerName: string; sub: SubState };

/** Tekrarlı bir görevin bir sonraki günü: "Yarın", "Per", "17 Ara" */
function nextDueText(t: Task, today: string): string | null {
  for (let i = 1; i <= 62; i++) {
    const d = addDays(today, i);
    if (isDueOn(t, d)) return i === 1 ? "Yarın" : i < 7 ? WEEKDAYS_SHORT[weekday(d)] : formatShort(d);
  }
  return null;
}

export type PersonSummary = {
  profile: Profile;
  xp: number;
  level: LevelInfo;
  streak: number;
  todayDone: boolean;
  todayCount: { due: number; done: number };
};

function toItem(t: Task, today: string, idx: CompletionIndex, v: Viewer): TaskItem {
  const c = completionFor(t, today, idx);
  let blockedReason: string | null = null;
  if (!relevantTo(t, v.meId, today)) blockedReason = `${v.partnerName} yapacak`;
  else if (t.kind !== "once" && !isDueOn(t, today)) {
    const next = nextDueText(t, today);
    blockedReason = next ? `Sıradaki: ${next}` : "Bugün değil";
  }
  return {
    id: t.id,
    title: t.title,
    emoji: t.emoji,
    notes: t.notes,
    kind: t.kind,
    xp: t.xp,
    requiresApproval: t.requires_approval,
    shared: t.assignee_id === null,
    assigneeId: assigneeOn(t, today),
    creatorId: t.creator_id,
    remindTime: t.remind_time,
    dueDate: t.due_date,
    repeatText: t.kind === "once" ? "" : describeRepeat(t),
    overdue: t.kind === "once" && !c && !!t.due_date && t.due_date < today,
    habitStreak: t.kind === "habit" ? habitStreak(t, today, idx) : 0,
    done: c ? { status: c.status, byId: c.profile_id } : null,
    canComplete: !c && blockedReason === null,
    blockedReason: c ? null : blockedReason,
    objected: v.sub.objected.has(t.id),
    requiresPhoto: t.requires_photo,
    completionId: c?.id ?? null,
    photo: c ? (v.sub.photos.get(c.id) ?? null) : null,
    swap: (() => {
      const sw = v.sub.swaps.find((x) => x.task_id === t.id);
      return sw ? { id: sw.id, status: sw.status, fromMe: sw.from_id === v.meId, bonus: sw.bonus } : null;
    })(),
    subtasks: v.sub.subs
      .filter((x) => x.task_id === t.id)
      .map((x) => {
        const occ = t.kind === "once" ? (t.due_date ?? t.start_date) : today;
        const d = v.sub.subDone.get(`${x.id}|${occ}`);
        return { id: x.id, title: x.title, xp: x.xp, done: d ? { status: d.status, byId: d.profile_id } : null };
      }),
  };
}

/** Bugün ekranında gösterilecek mi? */
function showToday(t: Task, today: string, idx: CompletionIndex): boolean {
  if (t.kind !== "once") return isDueOn(t, today) || completionFor(t, today, idx) !== undefined;
  const c = idx.once.get(t.id);
  if (c) return todayStr(new Date(c.completed_at)) === today;
  return !t.due_date || t.due_date <= today;
}

export async function loadState(today = todayStr()) {
  const tasks = await activeTasks();
  const idx = indexCompletions(await loadCompletions(addDays(today, -400)), tasks);
  const subDone = new Map(
    (await loadSubCompletions(addDays(today, -1))).map((c) => [`${c.subtask_id}|${c.occ_date}`, c] as const),
  );
  const pendingIds = idx.all.filter((c) => c.status === "pending").map((c) => c.id);
  const sub: SubState = {
    subs: await loadSubtasks(),
    subDone,
    objected: await openObjectionTaskIds(),
    photos: await photoStates(pendingIds),
    swaps: await liveSwaps(today),
  };
  return { tasks, idx, today, sub };
}

export async function personSummary(
  p: Profile,
  state: Awaited<ReturnType<typeof loadState>>,
  totals?: Map<number, number>,
): Promise<PersonSummary> {
  const xp = (totals ?? (await xpTotals())).get(p.id) ?? 0;
  const r = dayResult(p.id, state.today, state.tasks, state.idx);
  return {
    profile: p,
    xp,
    level: levelFromXp(xp),
    streak: displayStreak(p, state.today, state.tasks, state.idx),
    todayDone: todayComplete(p.id, state.today, state.tasks, state.idx),
    todayCount: { due: r.due, done: r.done },
  };
}

export async function todayView(me: Profile, partner: Profile) {
  const state = await loadState();
  const { tasks, idx, today } = state;
  const totals = await xpTotals();

  const visible = tasks.filter((t) => showToday(t, today, idx));
  const v = { meId: me.id, partnerName: partner.name, sub: state.sub };
  const sortItems = (a: TaskItem, b: TaskItem) =>
    Number(!!a.done) - Number(!!b.done) ||
    Number(b.overdue) - Number(a.overdue) ||
    (a.remindTime ?? "99").localeCompare(b.remindTime ?? "99");

  const mine = visible.filter((t) => assigneeOn(t, today) === me.id).map((t) => toItem(t, today, idx, v)).sort(sortItems);
  const shared = visible.filter((t) => t.assignee_id === null).map((t) => toItem(t, today, idx, v)).sort(sortItems);
  const theirs = visible
    .filter((t) => assigneeOn(t, today) === partner.id)
    .map((t) => toItem(t, today, idx, v))
    .sort(sortItems);

  const pending = await sql<
    { id: number; title: string; emoji: string; xp: number; occ_date: string; completed_at: Date; requires_photo: boolean; photo: PhotoState }[]
  >`
    select c.id, t.title, t.emoji, c.occ_date, c.completed_at, t.requires_photo,
      (select case when p.viewed_at is not null then 'viewed' else 'sent' end
         from photos p where p.completion_id = c.id) as photo,
      c.xp + coalesce((select sum(sc.xp) from subtask_completions sc
        where sc.task_id = c.task_id and sc.occ_date = c.occ_date and sc.status = 'pending'), 0)::int as xp
    from completions c join tasks t on t.id = c.task_id
    where c.status = 'pending' and c.profile_id = ${partner.id} and not t.archived
    order by c.completed_at`;

  const week = weekStart(today);
  const goal = { target: await weeklyGoalTarget(), ...(await weekProgress(week)) };

  const swapOffers = state.sub.swaps.filter((x) => x.status === "pending" && x.to_id === me.id);
  // Başlıktaki gün şeridi: bugünün iki gün öncesi ve sonrası; o günün görevlerini bitirdiysen işaretli
  const strip = [-2, -1, 0, 1, 2].map((k) => {
    const day = addDays(today, k);
    const r = k <= 0 ? dayResult(me.id, day, tasks, idx) : null;
    return { day, wd: WEEKDAYS_SHORT[weekday(day)], num: Number(day.slice(8, 10)), today: k === 0, done: !!r && r.due > 0 && r.done >= r.due };
  });

  return {
    today,
    week: strip,
    swapOffers,
    me: await personSummary(me, state, totals),
    partner: await personSummary(partner, state, totals),
    mine,
    shared,
    theirs,
    pending: pending.map((p) => ({ ...p, completed_at: p.completed_at.toISOString() })),
    goal: { target: goal.target, total: goal.total, mine: goal.byProfile.get(me.id) ?? 0 },
  };
}

export async function allTasksView(me: Profile, partner: Profile) {
  const { tasks, idx, today, sub } = await loadState();
  const v = { meId: me.id, partnerName: partner.name, sub };
  const items = tasks.map((t) => toItem(t, today, idx, v));
  const upcomingOnce = tasks
    .filter((t) => t.kind === "once" && !idx.once.get(t.id))
    .map((t) => t.id);
  const doneOnce = await sql<{ id: number; title: string; emoji: string; completed_at: Date; profile_id: number }[]>`
    select t.id, t.title, t.emoji, c.completed_at, c.profile_id
    from tasks t join completions c on c.task_id = t.id
    where t.kind = 'once' and not t.archived
    order by c.completed_at desc limit 20`;
  return {
    today,
    meId: me.id,
    items: items.filter((i) => i.kind !== "once" || upcomingOnce.includes(i.id)),
    doneOnce: doneOnce.map((d) => ({ ...d, completed_at: d.completed_at.toISOString(), day: todayStr(d.completed_at) })),
    relevantCount: tasks.filter((t) => relevantTo(t, me.id)).length,
  };
}

/** Tek bir görevin kart verisi (görev detay sayfası için) */
export async function taskItemView(me: Profile, partner: Profile, taskId: number): Promise<TaskItem | null> {
  const { tasks, idx, today, sub } = await loadState();
  const t = tasks.find((x) => x.id === taskId);
  return t ? toItem(t, today, idx, { meId: me.id, partnerName: partner.name, sub }) : null;
}
