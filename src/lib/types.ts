import type { Repeat, TaskKind } from "./recurrence";

export type Profile = {
  id: number;
  name: string;
  emoji: string;
  color: ColorName;
  streak: number;
  best_streak: number;
  freezes: number;
  freezes_month: string;
  streak_through: string;
};

export type Task = {
  id: number;
  title: string;
  emoji: string;
  notes: string;
  kind: TaskKind;
  creator_id: number;
  assignee_id: number | null; // null = ortak görev
  xp: number;
  requires_approval: boolean;
  due_date: string | null;
  repeat: Repeat | null;
  repeat_days: number[];
  repeat_dom: number | null;
  remind_time: string | null;
  start_date: string;
  archived: boolean;
};

export type Completion = {
  id: number;
  task_id: number;
  profile_id: number;
  occ_date: string;
  status: "pending" | "approved";
  xp: number;
  completed_at: Date;
};

export const COLORS = {
  clay: { name: "Kiremit", bg: "#b8653f", soft: "#f4e3d8", dark: "#8a4a2d" },
  teal: { name: "Petrol", bg: "#0f89a8", soft: "#dcecef", dark: "#0b6077" },
  honey: { name: "Bal", bg: "#b0862a", soft: "#f3e9d3", dark: "#7d5e1c" },
  plum: { name: "Erik", bg: "#7560ad", soft: "#e9e4f2", dark: "#53437e" },
  olive: { name: "Zeytin", bg: "#6b8a35", soft: "#e6ecd9", dark: "#4c6325" },
  berry: { name: "Böğürtlen", bg: "#a8517c", soft: "#f3e0e8", dark: "#7a3a59" },
} as const;

export type ColorName = keyof typeof COLORS;

export function colorOf(name: string) {
  return COLORS[name as ColorName] ?? COLORS.clay;
}

export type Subtask = {
  id: number;
  task_id: number;
  title: string;
  xp: number;
  position: number;
};

export type SubCompletion = {
  id: number;
  subtask_id: number;
  task_id: number;
  profile_id: number;
  occ_date: string;
  status: "pending" | "approved";
  xp: number;
  completed_at: Date;
};
