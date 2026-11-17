// Tüm tarih hesapları Türkiye saatine göre yapılır.
// Tarihler "YYYY-MM-DD" metni olarak tutulur; böylece saat dilimi kaymaları olmaz.

export const TZ = "Europe/Istanbul";

const dateFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const timeFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: TZ,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Türkiye saatine göre bugünün tarihi: "2026-11-17" */
export function todayStr(now: Date = new Date()): string {
  return dateFmt.format(now);
}

/** Türkiye saatine göre şu anki saat: "09:05" */
export function nowHM(now: Date = new Date()): string {
  return timeFmt.format(now);
}

function toUTC(d: string): Date {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day));
}

function fromUTC(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(d: string, n: number): string {
  const x = toUTC(d);
  x.setUTCDate(x.getUTCDate() + n);
  return fromUTC(x);
}

/** 0 = Pazartesi ... 6 = Pazar */
export function weekday(d: string): number {
  return (toUTC(d).getUTCDay() + 6) % 7;
}

/** O haftanın pazartesi günü */
export function weekStart(d: string): string {
  return addDays(d, -weekday(d));
}

export function daysInMonth(d: string): number {
  const [y, m] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function dayOfMonth(d: string): number {
  return Number(d.slice(8, 10));
}

export function monthKey(d: string): string {
  return d.slice(0, 7);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((toUTC(b).getTime() - toUTC(a).getTime()) / 86400000);
}

export const WEEKDAYS_SHORT = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
export const WEEKDAYS_LONG = [
  "Pazartesi",
  "Salı",
  "Çarşamba",
  "Perşembe",
  "Cuma",
  "Cumartesi",
  "Pazar",
];
const MONTHS = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
];

/** "17 Kasım Salı" */
export function formatLong(d: string): string {
  const [, m, day] = d.split("-").map(Number);
  return `${day} ${MONTHS[m - 1]} ${WEEKDAYS_LONG[weekday(d)]}`;
}

/** "17 Kas" */
export function formatShort(d: string): string {
  const [, m, day] = d.split("-").map(Number);
  return `${day} ${MONTHS[m - 1].slice(0, 3)}`;
}

/** Bugüne göre "Bugün", "Yarın", "Dün" ya da "17 Kas" */
export function formatRelative(d: string, today: string): string {
  const diff = daysBetween(today, d);
  if (diff === 0) return "Bugün";
  if (diff === 1) return "Yarın";
  if (diff === -1) return "Dün";
  return formatShort(d);
}
