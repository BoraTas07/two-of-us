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

import { SLIDER_STEPS, carrotsToPosition, positionToCarrots, snapCarrots } from "./carrots";

describe("havuç çubuğu", () => {
  it("uçlar ve adımlar", () => {
    expect(positionToCarrots(0)).toBe(1);
    expect(positionToCarrots(SLIDER_STEPS)).toBe(200);
    expect(snapCarrots(37)).toBe(35);
    expect(snapCarrots(123)).toBe(120);
  });
  it("çubuk monoton artar ve geri dönüşüm tutarlı", () => {
    let prev = 0;
    for (let p = 0; p <= SLIDER_STEPS; p++) {
      const v = positionToCarrots(p);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
    for (const v of [1, 5, 10, 25, 50, 100, 150, 200]) {
      expect(positionToCarrots(carrotsToPosition(v))).toBe(v);
    }
  });
  it("1-20 arası her değer çubukla seçilebilir", () => {
    const reachable = new Set(Array.from({ length: SLIDER_STEPS + 1 }, (_, p) => positionToCarrots(p)));
    for (let v = 1; v <= 19; v++) expect(reachable.has(v)).toBe(true);
  });
});

import { parseSongLink } from "./song-link";

describe("şarkı linkleri", () => {
  it("Spotify", () => {
    expect(parseSongLink("https://open.spotify.com/intl-tr/track/4uLU6hMCjMI75M1A2tKUQC?si=abc")).toEqual({
      provider: "spotify",
      embedUrl: "https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC",
      url: "https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC",
    });
    expect(parseSongLink("https://spotify.link/xyz")?.embedUrl).toBeNull();
  });
  it("YouTube ve YouTube Music", () => {
    expect(parseSongLink("https://youtu.be/dQw4w9WgXcQ?t=10")?.embedUrl).toBe(
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    );
    expect(parseSongLink("https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=x")?.url).toBe(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    );
    expect(parseSongLink("https://music.youtube.com/watch?v=dQw4w9WgXcQ")?.url).toBe(
      "https://music.youtube.com/watch?v=dQw4w9WgXcQ",
    );
    expect(parseSongLink("https://m.youtube.com/shorts/dQw4w9WgXcQ")?.provider).toBe("youtube");
    expect(parseSongLink("https://youtube.com/watch?v=kisa")).toBeNull();
  });
  it("Apple Music ve diğerleri", () => {
    expect(parseSongLink("https://music.apple.com/tr/album/x/123?i=456")?.embedUrl).toBe(
      "https://embed.music.apple.com/tr/album/x/123?i=456",
    );
    expect(parseSongLink("https://soundcloud.com/a/b")?.provider).toBe("other");
    expect(parseSongLink("javascript:alert(1)")).toBeNull();
    expect(parseSongLink("şarkı adı")).toBeNull();
  });
});

import { ablative, dative, genitive } from "./tr";
describe("Türkçe ekler", () => {
  it("ünlü uyumu", () => {
    expect([dative("Ece"), dative("Deniz"), dative("Burak"), dative("Ali")]).toEqual(["Ece'ye", "Deniz'e", "Burak'a", "Ali'ye"]);
    expect([ablative("Ece"), ablative("Deniz"), ablative("Burak")]).toEqual(["Ece'den", "Deniz'den", "Burak'tan"]);
    expect([genitive("Ece"), genitive("Deniz"), genitive("Burak"), genitive("Onur"), genitive("Gül")]).toEqual([
      "Ece'nin", "Deniz'in", "Burak'ın", "Onur'un", "Gül'ün",
    ]);
  });
});

import { autoTheme } from "./themes";
describe("Otomatik tema", () => {
  const ctx = { people: [{ name: "Ece", birthday: "1999-04-12", isMe: false }, { name: "Deniz", birthday: null, isMe: true }], anniversary: "2023-07-08" };
  it("mevsimler ve özel günler", () => {
    expect(autoTheme("2026-11-14", ctx).key).toBe("sonbahar");
    expect(autoTheme("2026-11-15", ctx).key).toBe("yilbasi");
    expect(autoTheme("2026-12-05", ctx).key).toBe("yilbasi");
    expect(autoTheme("2027-01-03", ctx).key).toBe("kis");
    expect(autoTheme("2026-12-24", ctx).key).toBe("yilbasi");
    expect(autoTheme("2027-01-01", ctx)).toEqual({ key: "yilbasi", greeting: "Mutlu yıllar! 🎆" });
    expect(autoTheme("2027-01-15", ctx).key).toBe("kis");
    expect(autoTheme("2027-02-14", ctx).key).toBe("sevgililer");
    expect(autoTheme("2027-03-01", ctx).key).toBe("ilkbahar");
    expect(autoTheme("2027-06-20", ctx).key).toBe("yaz");
    expect(autoTheme("2027-04-12", ctx)).toEqual({ key: "dogumgunu", greeting: "Bugün Ece'nin doğum günü! 🎂" });
    expect(autoTheme("2027-07-08", ctx)).toEqual({ key: "yildonumu", greeting: "4. yılınız kutlu olsun! 💞" });
    expect(autoTheme("2023-07-08", ctx).key).toBe("yaz");
  });
});
