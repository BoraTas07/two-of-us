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
  /** Kabul edilmiş takaslar: gün → o gün görevi yapacak kişi */
  swapped?: Record<string, number>;
  xp: number;
  requires_approval: boolean;
  requires_photo: boolean;
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

// Kişi renkleri: her ikili normal görüşte net ayrılacak şekilde seçildi (doğrulayıcıdan geçti).
// İki kişi aynı rengi seçemez.
export const COLORS = {
  clay: { name: "Turuncu", bg: "#d9661c", soft: "#fbe3d2", dark: "#a34a10" },
  teal: { name: "Mavi", bg: "#1f78c8", soft: "#d8e8f8", dark: "#155a99" },
  olive: { name: "Yeşil", bg: "#2f9150", soft: "#d7eddd", dark: "#216b39" },
  plum: { name: "Mor", bg: "#8448c8", soft: "#e9ddf7", dark: "#5f2f99" },
  berry: { name: "Pembe", bg: "#d1407f", soft: "#f9dce9", dark: "#9e2c5e" },
} as const;

/** Ortak görevlerin rengi (kişi renklerinden ayrı, uygulamanın kiremit tonu) */
export const SHARED_COLOR = { name: "Ortak", bg: "var(--brand)", soft: "var(--brand-soft)", dark: "var(--brand-dark)" };

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
