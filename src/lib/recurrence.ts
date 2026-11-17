import { dayOfMonth, daysInMonth, weekday } from "./time";

export type TaskKind = "once" | "recurring" | "habit";
export type Repeat = "daily" | "weekly" | "monthly";

export type RecurrenceFields = {
  kind: TaskKind;
  due_date: string | null; // tek seferlik görevler için
  repeat: Repeat | null; // tekrarlayan / alışkanlık için
  repeat_days: number[]; // haftalık: 0=Pzt ... 6=Paz
  repeat_dom: number | null; // aylık: ayın kaçıncı günü
  start_date: string; // görev bu tarihten itibaren geçerli
};

/** Tekrarlayan bir görevin kuralı verilen güne uyuyor mu? */
export function matchesRule(t: RecurrenceFields, d: string): boolean {
  if (d < t.start_date) return false;
  switch (t.repeat) {
    case "daily":
      return true;
    case "weekly":
      return t.repeat_days.includes(weekday(d));
    case "monthly": {
      if (!t.repeat_dom) return false;
      // 31'i seçilmişse kısa aylarda ayın son günü sayılır
      const target = Math.min(t.repeat_dom, daysInMonth(d));
      return dayOfMonth(d) === target;
    }
    default:
      return false;
  }
}

/** Görev o gün "yapılması gereken" bir görev mi? (Seri hesabında kullanılır) */
export function isDueOn(t: RecurrenceFields, d: string): boolean {
  if (t.kind === "once") return t.due_date === d;
  return matchesRule(t, d);
}

export function describeRepeat(t: RecurrenceFields): string {
  const names = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
  switch (t.repeat) {
    case "daily":
      return "Her gün";
    case "weekly": {
      const days = [...t.repeat_days].sort();
      if (days.length === 7) return "Her gün";
      if (days.join() === "0,1,2,3,4") return "Hafta içi";
      if (days.join() === "5,6") return "Hafta sonu";
      return days.map((i) => names[i]).join(", ");
    }
    case "monthly":
      return `Her ayın ${t.repeat_dom}. günü`;
    default:
      return "";
  }
}
