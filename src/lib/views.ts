import "server-only";
import { sql } from "./db";
import {
  activeTasks,
  completionFor,
  dayResult,
  displayStreak,
  habitStreak,
  indexCompletions,
  loadCompletions,
  relevantTo,
  todayComplete,
  weekProgress,
  weeklyGoalTarget,
  xpTotals,
  type CompletionIndex,
} from "./game";
import { levelFromXp, type LevelInfo } from "./levels";
import { describeRepeat, isDueOn } from "./recurrence";
import { addDays, todayStr, weekStart } from "./time";
import type { Profile, Task } from "./types";

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
};

export type PersonSummary = {
  profile: Profile;
  xp: number;
  level: LevelInfo;
  streak: number;
  todayDone: boolean;
  todayCount: { due: number; done: number };
};

function toItem(t: Task, today: string, idx: CompletionIndex): TaskItem {
  const c = completionFor(t, today, idx);
  return {
    id: t.id,
    title: t.title,
    emoji: t.emoji,
    notes: t.notes,
    kind: t.kind,
    xp: t.xp,
    requiresApproval: t.requires_approval,
    shared: t.assignee_id === null,
    assigneeId: t.assignee_id,
    creatorId: t.creator_id,
    remindTime: t.remind_time,
    dueDate: t.due_date,
    repeatText: t.kind === "once" ? "" : describeRepeat(t),
    overdue: t.kind === "once" && !c && !!t.due_date && t.due_date < today,
    habitStreak: t.kind === "habit" ? habitStreak(t, today, idx) : 0,
    done: c ? { status: c.status, byId: c.profile_id } : null,
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
  return { tasks, idx, today };
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
  const sortItems = (a: TaskItem, b: TaskItem) =>
    Number(!!a.done) - Number(!!b.done) ||
    Number(b.overdue) - Number(a.overdue) ||
    (a.remindTime ?? "99").localeCompare(b.remindTime ?? "99");

  const mine = visible.filter((t) => t.assignee_id === me.id).map((t) => toItem(t, today, idx)).sort(sortItems);
  const shared = visible.filter((t) => t.assignee_id === null).map((t) => toItem(t, today, idx)).sort(sortItems);
  const theirs = visible
    .filter((t) => t.assignee_id === partner.id)
    .map((t) => toItem(t, today, idx))
    .sort(sortItems);

  const pending = await sql<
    { id: number; title: string; emoji: string; xp: number; occ_date: string; completed_at: Date }[]
  >`
    select c.id, t.title, t.emoji, c.xp, c.occ_date, c.completed_at
    from completions c join tasks t on t.id = c.task_id
    where c.status = 'pending' and c.profile_id = ${partner.id}
    order by c.completed_at`;

  const week = weekStart(today);
  const goal = { target: await weeklyGoalTarget(), ...(await weekProgress(week)) };

  return {
    today,
    me: await personSummary(me, state, totals),
    partner: await personSummary(partner, state, totals),
    mine,
    shared,
    theirs,
    pending: pending.map((p) => ({ ...p, completed_at: p.completed_at.toISOString() })),
    goal: { target: goal.target, total: goal.total, mine: goal.byProfile.get(me.id) ?? 0 },
  };
}

export async function allTasksView(me: Profile) {
  const { tasks, idx, today } = await loadState();
  const items = tasks.map((t) => toItem(t, today, idx));
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
