import { describe, expect, it } from "vitest";
import { addDays, nowHM, todayStr, weekStart, weekday } from "./time";
import { isDueOn, matchesRule, type RecurrenceFields } from "./recurrence";
import { levelFromXp } from "./levels";
import { applyDay, type StreakState } from "./streak";

const base: RecurrenceFields = {
  kind: "recurring",
  due_date: null,
  repeat: "daily",
  repeat_days: [],
  repeat_dom: null,
  start_date: "2026-11-01",
};

describe("time", () => {
  it("Türkiye saatine göre gün değişir", () => {
    // UTC 21:30 = İstanbul 00:30 (ertesi gün)
    expect(todayStr(new Date("2026-11-17T21:30:00Z"))).toBe("2026-11-18");
    expect(todayStr(new Date("2026-11-17T20:59:00Z"))).toBe("2026-11-17");
    expect(nowHM(new Date("2026-11-17T06:05:00Z"))).toBe("09:05");
  });
  it("hafta günleri ve hafta başı", () => {
    expect(weekday("2026-11-16")).toBe(0); // Pazartesi
    expect(weekday("2026-11-22")).toBe(6); // Pazar
    expect(weekStart("2026-11-22")).toBe("2026-11-16");
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
});

describe("recurrence", () => {
  it("günlük, başlangıçtan önce değil", () => {
    expect(matchesRule(base, "2026-10-31")).toBe(false);
    expect(matchesRule(base, "2026-11-01")).toBe(true);
  });
  it("haftalık", () => {
    const t = { ...base, repeat: "weekly" as const, repeat_days: [0, 3] };
    expect(isDueOn(t, "2026-11-16")).toBe(true); // Pzt
    expect(isDueOn(t, "2026-11-17")).toBe(false); // Sal
    expect(isDueOn(t, "2026-11-19")).toBe(true); // Per
  });
  it("aylık 31 kısa aylarda son gün", () => {
    const t = { ...base, repeat: "monthly" as const, repeat_dom: 31 };
    expect(isDueOn(t, "2026-11-30")).toBe(true);
    expect(isDueOn(t, "2026-12-30")).toBe(false);
    expect(isDueOn(t, "2026-12-31")).toBe(true);
    expect(isDueOn(t, "2027-02-28")).toBe(true);
  });
  it("tek seferlik", () => {
    const t = { ...base, kind: "once" as const, repeat: null, due_date: "2026-11-20" };
    expect(isDueOn(t, "2026-11-20")).toBe(true);
    expect(isDueOn(t, "2026-11-21")).toBe(false);
  });
});

describe("levels", () => {
  it("seviye hesabı", () => {
    expect(levelFromXp(0)).toMatchObject({ level: 1, intoLevel: 0, needed: 100 });
    expect(levelFromXp(99).level).toBe(1);
    expect(levelFromXp(100)).toMatchObject({ level: 2, intoLevel: 0, needed: 150 });
    expect(levelFromXp(250)).toMatchObject({ level: 3, intoLevel: 0 });
  });
});

describe("streak", () => {
  const s0: StreakState = { streak: 4, best: 4, freezes: 2, freezesMonth: "2026-11" };
  it("hepsi yapıldıysa artar", () => {
    const r = applyDay(s0, "2026-11-10", { due: 3, done: 3, anyCompletion: true });
    expect(r.state.streak).toBe(5);
    expect(r.state.best).toBe(5);
    expect(r.outcome).toBe("kept");
  });
  it("eksikse joker harcanır", () => {
    const r = applyDay(s0, "2026-11-10", { due: 3, done: 1, anyCompletion: true });
    expect(r.outcome).toBe("frozen");
    expect(r.state.streak).toBe(4);
    expect(r.state.freezes).toBe(1);
  });
  it("joker yoksa sıfırlanır", () => {
    const r = applyDay({ ...s0, freezes: 0 }, "2026-11-10", { due: 1, done: 0, anyCompletion: false });
    expect(r.outcome).toBe("broken");
    expect(r.state.streak).toBe(0);
    expect(r.state.best).toBe(4);
  });
  it("görev yoksa dinlenme günü", () => {
    const r = applyDay(s0, "2026-11-10", { due: 0, done: 0, anyCompletion: false });
    expect(r.outcome).toBe("rest");
    expect(r.state.streak).toBe(4);
  });
  it("yeni ayda jokerler yenilenir", () => {
    const r = applyDay({ ...s0, freezes: 0, freezesMonth: "2026-10" }, "2026-11-01", {
      due: 1,
      done: 0,
      anyCompletion: false,
    });
    expect(r.outcome).toBe("frozen");
    expect(r.state.freezes).toBe(1);
  });
});
