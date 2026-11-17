import { MONTHLY_FREEZES } from "./levels";
import { monthKey } from "./time";

export type StreakState = {
  streak: number;
  best: number;
  freezes: number;
  freezesMonth: string; // "2026-11"
};

export type DayResult = {
  due: number; // o gün yapılması gereken görev sayısı
  done: number; // bunlardan tamamlananlar
  anyCompletion: boolean; // o gün herhangi bir görev bitirildi mi
};

export type DayOutcome = "kept" | "rest" | "frozen" | "broken";

/**
 * Biten bir günü seriye işler.
 * - Görevlerin hepsi yapıldıysa seri +1.
 * - O gün hiç görev yoksa: bir şey yapıldıysa +1, yapılmadıysa seri olduğu gibi kalır (dinlenme günü).
 * - Eksik varsa ve joker varsa: joker harcanır, seri korunur.
 * - Eksik varsa ve joker yoksa: seri sıfırlanır.
 */
export function applyDay(
  s: StreakState,
  day: string,
  r: DayResult,
): { state: StreakState; outcome: DayOutcome } {
  const st = { ...s };
  const month = monthKey(day);
  if (st.freezesMonth !== month) {
    st.freezes = MONTHLY_FREEZES;
    st.freezesMonth = month;
  }

  let outcome: DayOutcome;
  if (r.due === 0) {
    outcome = r.anyCompletion ? "kept" : "rest";
    if (r.anyCompletion) st.streak += 1;
  } else if (r.done >= r.due) {
    outcome = "kept";
    st.streak += 1;
  } else if (st.freezes > 0 && st.streak > 0) {
    outcome = "frozen";
    st.freezes -= 1;
  } else {
    outcome = st.streak > 0 ? "broken" : "rest";
    st.streak = 0;
  }
  st.best = Math.max(st.best, st.streak);
  return { state: st, outcome };
}
