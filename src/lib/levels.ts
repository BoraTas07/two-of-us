// Seviye sistemi: 1. seviyeden 2.'ye 100 havuç, sonra her seviye 50 havuç daha fazla ister.

export function xpToNext(level: number): number {
  return 100 + (level - 1) * 50;
}

export type LevelInfo = {
  level: number;
  intoLevel: number; // bu seviyede toplanan havuç
  needed: number; // bir sonraki seviye için gereken havuç
  title: string;
};

const TITLES: [number, string][] = [
  [20, "Ölümsüz"],
  [15, "Efsane"],
  [10, "Kahraman"],
  [7, "Usta"],
  [4, "Kalfa"],
  [2, "Çırak"],
  [1, "Çaylak"],
];

export function levelTitle(level: number): string {
  return TITLES.find(([min]) => level >= min)![1];
}

export function levelFromXp(totalXp: number): LevelInfo {
  let level = 1;
  let rest = Math.max(0, totalXp);
  while (rest >= xpToNext(level)) {
    rest -= xpToNext(level);
    level++;
  }
  return { level, intoLevel: rest, needed: xpToNext(level), title: levelTitle(level) };
}

/** Her ay verilen seri koruma jokeri sayısı */
export const MONTHLY_FREEZES = 2;

/** Seri kilometre taşı bonusları */
export const STREAK_BONUS: Record<number, number> = { 7: 50, 30: 200, 100: 500 };

/** Ortak hedefe ulaşınca her birine verilen bonus */
export const GOAL_BONUS = 50;
