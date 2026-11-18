import { genitive } from "./tr";

// Renk temaları. "Otomatik" seçiliyse tema mevsime ve özel günlere göre kendiliğinden değişir.
// Öncelik: doğum günü > yıl dönümü > Sevgililer Günü > yılbaşı > mevsim.

/** Hareket katmanları (src/components/theme-fx.tsx) */
export type FxKind = "snow" | "snowpile" | "bokeh" | "petals" | "leaves" | "glints" | "waves" | "candle" | "golddust" | "hearts" | "stars" | "shooting";
export type FxLayer = [FxKind, Record<string, unknown>?];

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
  desc: string;
  /** Başlığın rengi (fotoğrafın üstüne bu renk örtülür); düğmeler ve vurgular da bu renk */
  head: string;
  /** Partner kartı gibi ikinci vurgu rengi */
  accent: string;
  /** Partner kartında ince ekose desen */
  plaid?: boolean;
  dark?: boolean;
  /** Sayfanın zemini (telefonun alt çubuğu için) */
  bg: string;
  /** Başlıktaki fotoğraf ve sayfanın altındaki fotoğraf (public/themes) */
  photo: string;
  foot: string;
  footPos?: string;
  /** Alttaki fotoğrafın üstündeki renk örtüsünün koyuluğu (0–1) */
  footTint?: [number, number];
  fx: FxLayer[];
  footFx: FxLayer[];
  /** Sadece otomatik olarak, özel günlerde gelir (elle de seçilebilir) */
  special?: boolean;
};

const LEAF = ["#e2601c", "#f0a12c", "#b8361a", "#f6c046"];

export const THEMES: Record<ThemeKey, ThemeDef> = {
  cozy: {
    key: "cozy", name: "Cozy", desc: "Fildişi ve orman yeşili; hareketsiz, sade",
    head: "#2f4a3c", accent: "#a65d3c", bg: "#e4e2d9",
    photo: "/themes/cozy.webp", foot: "/themes/cozy.webp", footTint: [0.55, 0.75], fx: [], footFx: [],
  },
  ilkbahar: {
    key: "ilkbahar", name: "İlkbahar", desc: "Kiraz çiçekleri ve süzülen yapraklar",
    head: "#a5567a", accent: "#5f9150", bg: "#efe3de",
    photo: "/themes/ilkbahar.webp", foot: "/themes/ilkbahar-alt.webp", footPos: "center 40%", footTint: [0.08, 0.2],
    fx: [["bokeh", { colors: ["255,240,225"], n: 6 }], ["petals", { color: "#ffd0de", n: 18, min: 6, max: 11 }]],
    footFx: [["petals", { color: "#ffc4d6", n: 14, min: 6, max: 11 }]],
  },
  yaz: {
    key: "yaz", name: "Yaz", desc: "Yumuşak deniz mavisi ve dalgalar",
    head: "#5e96aa", accent: "#b9603f", bg: "#e8e9e2",
    photo: "/themes/yaz.webp", foot: "/themes/yaz.webp", footTint: [0.45, 0.7],
    fx: [["waves"], ["glints", { n: 12 }]],
    footFx: [["waves"], ["glints", { n: 10 }]],
  },
  sonbahar: {
    key: "sonbahar", name: "Sonbahar", desc: "Sarı yapraklı ağaçlar ve düşen yapraklar",
    head: "#a2471a", accent: "#6a7429", bg: "#eee2d5",
    photo: "/themes/sonbahar.webp", foot: "/themes/sonbahar-alt.webp", footPos: "center 45%", footTint: [0.08, 0.2],
    fx: [["bokeh", { colors: ["255,200,120"], n: 6 }], ["leaves", { colors: LEAF, n: 13, min: 9, max: 15 }]],
    footFx: [["leaves", { colors: LEAF, n: 10, min: 9, max: 15 }]],
  },
  kis: {
    key: "kis", name: "Kış", desc: "Kar yağar, menünün üstünde birikir",
    head: "#34495a", accent: "#4f6356", bg: "#e5e2db",
    photo: "/themes/kis.webp", foot: "/themes/kis-alt.webp", footPos: "center 70%", footTint: [0.15, 0.3],
    fx: [["snow", { n: 95 }]], footFx: [["snowpile"]],
  },
  yilbasi: {
    key: "yilbasi", name: "Yılbaşı", desc: "Kar, sıcak ışıklar ve süslü çam", plaid: true, special: true,
    head: "#6e2328", accent: "#2f4a3c", bg: "#eaded7",
    photo: "/themes/yilbasi.webp", foot: "/themes/yilbasi-alt.webp", footPos: "center 40%", footTint: [0.08, 0.25],
    fx: [["bokeh", { colors: ["255,205,130", "255,180,110", "255,230,170"], n: 12 }], ["snow", { n: 60 }]],
    footFx: [["bokeh", { colors: ["255,205,130"], n: 5 }], ["snow", { n: 45 }]],
  },
  sevgililer: {
    key: "sevgililer", name: "Sevgililer Günü", desc: "Pembe ışıklar ve yükselen kalpler", special: true,
    head: "#8a3448", accent: "#a9586a", bg: "#ece0da",
    photo: "/themes/sevgililer.webp", foot: "/themes/sevgililer.webp", footTint: [0.4, 0.65],
    fx: [["bokeh", { colors: ["255,190,200", "255,220,215"], n: 8 }], ["hearts", { colors: ["#ff8fa8", "#ffc2cf", "#e8546f"], n: 14 }]],
    footFx: [["hearts", { colors: ["#ff8fa8", "#ffc2cf", "#e8546f"], n: 10 }]],
  },
  dogumgunu: {
    key: "dogumgunu", name: "Doğum günü", desc: "Mum ışığı ve altın parıltılar", special: true,
    head: "#5b3a52", accent: "#9c7436", bg: "#e8e1da",
    photo: "/themes/dogumgunu.webp", foot: "/themes/dogumgunu.webp", footTint: [0.4, 0.65],
    fx: [["candle"], ["golddust"]], footFx: [["golddust", { n: 18 }]],
  },
  yildonumu: {
    key: "yildonumu", name: "Yıl dönümü", desc: "Mum ışığında bir masa", special: true,
    head: "#4a3a32", accent: "#8e6c4c", bg: "#e7e1d8",
    photo: "/themes/yildonumu.webp", foot: "/themes/yildonumu.webp", footTint: [0.4, 0.65],
    fx: [["candle", { n: 9 }], ["bokeh", { colors: ["255,215,150"], n: 6 }]], footFx: [["candle", { n: 5 }]],
  },
  gece: {
    key: "gece", name: "Gece", desc: "Lacivert gökyüzü ve yanıp sönen yıldızlar", dark: true,
    head: "#18264a", accent: "#2a3e6e", bg: "#0f1830",
    photo: "/themes/gece.webp", foot: "/themes/gece.webp", footTint: [0.35, 0.6],
    fx: [["stars"], ["shooting"]], footFx: [["stars", { n: 40 }]],
  },
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
