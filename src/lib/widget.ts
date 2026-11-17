import "server-only";
import { allProfiles } from "./auth";
import { evaluateStreaks } from "./game";
import { balanceOf } from "./shop";
import { colorOf } from "./types";
import { todayView } from "./views";

export type WidgetTask = {
  title: string;
  emoji: string;
  xp: number;
  done: boolean;
  pending: boolean;
  steps: string | null;
  remind: string | null;
  shared: boolean;
};

export type WidgetData = {
  me: {
    name: string;
    emoji: string;
    color: string;
    level: number;
    levelTitle: string;
    into: number;
    needed: number;
    carrots: number;
    streak: number;
    streakLit: boolean;
    freezes: number;
    done: number;
    due: number;
  };
  tasks: WidgetTask[];
  partner: { name: string; emoji: string; color: string; done: number; due: number; streak: number; streakLit: boolean };
  appUrl: string;
  updatedAt: string;
};

/** Widget'ın göstereceği bugünkü özet (salt okunur) */
export async function widgetData(profileId: number, appUrl: string): Promise<WidgetData | null> {
  await evaluateStreaks();
  const profiles = await allProfiles();
  const me = profiles.find((p) => p.id === profileId);
  const partner = profiles.find((p) => p.id !== profileId);
  if (!me || !partner) return null;

  const v = await todayView(me, partner);
  const tasks: WidgetTask[] = [...v.mine, ...v.shared]
    .map((t) => {
      const subDone = t.subtasks.filter((x) => x.done).length;
      return {
        title: t.title,
        emoji: t.emoji,
        xp: t.subtasks.length ? t.xp + t.subtasks.reduce((n, x) => n + x.xp, 0) : t.xp,
        done: t.done?.status === "approved",
        pending: t.done?.status === "pending",
        steps: t.subtasks.length ? `${subDone}/${t.subtasks.length}` : null,
        remind: t.remindTime,
        shared: t.shared,
      };
    })
    .sort(
      (a, b) =>
        Number(a.done || a.pending) - Number(b.done || b.pending) ||
        (a.remind ?? "99").localeCompare(b.remind ?? "99"),
    )
    .slice(0, 8);

  return {
    me: {
      name: me.name,
      emoji: me.emoji,
      color: colorOf(me.color).bg,
      level: v.me.level.level,
      levelTitle: v.me.level.title,
      into: v.me.level.intoLevel,
      needed: v.me.level.needed,
      carrots: await balanceOf(me.id),
      streak: v.me.streak,
      streakLit: v.me.todayDone,
      freezes: me.freezes,
      done: v.me.todayCount.done,
      due: v.me.todayCount.due,
    },
    tasks,
    partner: {
      name: partner.name,
      emoji: partner.emoji,
      color: colorOf(partner.color).bg,
      done: v.partner.todayCount.done,
      due: v.partner.todayCount.due,
      streak: v.partner.streak,
      streakLit: v.partner.todayDone,
    },
    appUrl,
    updatedAt: new Date().toISOString(),
  };
}

/** İsteğin geldiği adres (ör. https://two-of-us-tau.vercel.app) */
export function originOf(req: Request): string {
  const h = req.headers;
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? new URL(req.url).host;
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
