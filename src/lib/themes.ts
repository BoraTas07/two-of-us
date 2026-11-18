import { genitive } from "./tr";

// Renk temaları. "Otomatik" seçiliyse tema mevsime ve özel günlere göre kendiliğinden değişir.
// Öncelik: doğum günü > yıl dönümü > Sevgililer Günü > yılbaşı > mevsim.

export type Decor = "snow" | "xmas" | "hearts" | "petals" | "waves" | "leaves" | "confetti" | "sparkle" | "stars" | null;

export type ThemeKey =
  | "cozy"
  | "kis"
  | "yilbasi"
  | "sevgililer"
  | "ilkbahar"
  | "yaz"
  | "sonbahar"
  | "dogumgunu"
  | "yildonumu"
  | "gece";

export type ThemeDef = {
  key: ThemeKey;
  name: string;
  emoji: string;
  desc: string;
  decor: Decor;
  /** Telefonun üst çubuğu ve önizleme renkleri */
  bg: string;
  /** Sayfanın üstündeki renk geçişinin başladığı ton (telefonun üst çubuğu da bu renk olur) */
  top: string;
  brand: string;
  accent: string;
  /** Sadece otomatik olarak, özel günlerde gelir (elle de seçilebilir) */
  special?: boolean;
};

export const THEMES: Record<ThemeKey, ThemeDef> = {
  cozy: { key: "cozy", name: "Cozy", emoji: "🧺", desc: "Yulaf, kiremit ve adaçayı", decor: null, bg: "#f4eee5", top: "#f4eee5", brand: "#a65d3c", accent: "#6e8a5d" },
  kis: { key: "kis", name: "Kış", emoji: "❄️", desc: "Karlı tepeler, sıcak kulübe ve kar", decor: "snow", bg: "#ecdcd2", top: "#b9d0e6", brand: "#c0262f", accent: "#1f6e48" },
  yilbasi: { key: "yilbasi", name: "Yılbaşı", emoji: "🎄", desc: "Karlı çamlar, ışıklar ve hediyeler", decor: "xmas", bg: "#f2d8d0", top: "#f0a9a6", brand: "#d01f2e", accent: "#157a42", special: true },
  sevgililer: { key: "sevgililer", name: "Sevgililer Günü", emoji: "💝", desc: "Gül pembesi ve uçuşan kalpler", decor: "hearts", bg: "#fdd8e2", top: "#ffadc2", brand: "#e0285a", accent: "#e08a2e", special: true },
  ilkbahar: { key: "ilkbahar", name: "İlkbahar", emoji: "🌸", desc: "Açık pasteller ve çiçek yaprakları", decor: "petals", bg: "#e6f4d8", top: "#bfe6f7", brand: "#c2408a", accent: "#2fa55a" },
  yaz: { key: "yaz", name: "Yaz", emoji: "🌊", desc: "Kum, güneş sarısı ve deniz mavisi", decor: "waves", bg: "#fdebbd", top: "#8fd8f2", brand: "#0a85b6", accent: "#0fa08a" },
  sonbahar: { key: "sonbahar", name: "Sonbahar", emoji: "🎃", desc: "Balkabağı, tarçın ve kahve", decor: "leaves", bg: "#f8d9b4", top: "#f2a35a", brand: "#d4561a", accent: "#b56a12" },
  dogumgunu: { key: "dogumgunu", name: "Doğum günü", emoji: "🎂", desc: "Konfeti ve balonlar", decor: "confetti", bg: "#eedcfa", top: "#d3b3f7", brand: "#8e3fd6", accent: "#1fa86f", special: true },
  yildonumu: { key: "yildonumu", name: "Yıl dönümü", emoji: "💞", desc: "Gül kurusu ve şampanya", decor: "sparkle", bg: "#f6dcd9", top: "#eeb3b7", brand: "#c23b55", accent: "#c99a3c", special: true },
  gece: { key: "gece", name: "Gece", emoji: "🌙", desc: "Göz yormayan koyu tema", decor: "stars", bg: "#171320", top: "#2b2147", brand: "#e07a4f", accent: "#e6b04a" },
};

export const THEME_ORDER: ThemeKey[] = ["cozy", "ilkbahar", "yaz", "sonbahar", "kis", "yilbasi", "sevgililer", "dogumgunu", "yildonumu", "gece"];

export function isThemeKey(v: string): v is ThemeKey {
  return v in THEMES;
}

export type ThemeContext = {
  /** Giriş yapan kişi ve partnerinin adı + doğum günü (YYYY-MM-DD) */
  people: { name: string; birthday: string | null; isMe: boolean }[];
  /** İlişkinin başladığı gün (YYYY-MM-DD) */
  anniversary: string | null;
};

export type ResolvedTheme = {
  key: ThemeKey;
  /** Özel günün mesajı (Bugün sayfasındaki selamlama için) */
  greeting: string | null;
};

const md = (d: string) => d.slice(5, 10);
const inRange = (x: string, from: string, to: string) => x >= from && x <= to;

/** Bir güne göre otomatik tema (today: YYYY-MM-DD, İstanbul saatiyle) */
export function autoTheme(today: string, ctx: ThemeContext): ResolvedTheme {
  const m = md(today);
  // 29 Şubat doğanlar artık yıllarda 28 Şubat'ta kutlar
  const leap = (d: string) => (md(d) === "02-29" && !isLeap(Number(today.slice(0, 4))) ? "02-28" : md(d));

  const bday = ctx.people.find((p) => p.birthday && leap(p.birthday) === m);
  if (bday) {
    return { key: "dogumgunu", greeting: bday.isMe ? `İyi ki doğdun, ${bday.name}! 🎂` : `Bugün ${genitive(bday.name)} doğum günü! 🎂` };
  }
  if (ctx.anniversary && leap(ctx.anniversary) === m && ctx.anniversary.slice(0, 4) < today.slice(0, 4)) {
    const years = Number(today.slice(0, 4)) - Number(ctx.anniversary.slice(0, 4));
    return { key: "yildonumu", greeting: `${years}. yılınız kutlu olsun! 💞` };
  }
  if (inRange(m, "02-10", "02-15")) return { key: "sevgililer", greeting: m === "02-14" ? "Sevgililer Günü kutlu olsun! 💝" : null };
  if (m >= "11-15" || m <= "01-02") {
    return { key: "yilbasi", greeting: m === "12-31" ? "Yeni yıla az kaldı! 🎆" : m === "01-01" ? "Mutlu yıllar! 🎆" : null };
  }
  if (m < "03-01") return { key: "kis", greeting: null };
  if (m < "06-01") return { key: "ilkbahar", greeting: null };
  if (m < "09-01") return { key: "yaz", greeting: null };
  return { key: "sonbahar", greeting: null };
}

function isLeap(y: number) {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

/** Kişinin seçimi + bugünün otomatik teması → gösterilecek tema. Özel gün mesajı seçimden bağımsız gelir. */
export function resolveTheme(choice: string | null | undefined, today: string, ctx: ThemeContext): ResolvedTheme {
  const auto = autoTheme(today, ctx);
  if (choice && choice !== "auto" && isThemeKey(choice)) return { key: choice, greeting: auto.greeting };
  return auto;
}
