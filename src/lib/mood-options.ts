// Ruh hali seçenekleri ve "partnerin için ne yaptın" hazır seçenekleri (sunucu + istemci ortak)

export const MOOD_OPTIONS = [
  { key: "mutlu", emoji: "😊", label: "Mutlu" },
  { key: "huzurlu", emoji: "😌", label: "Huzurlu" },
  { key: "sevgi", emoji: "🥰", label: "Sevgi dolu" },
  { key: "heyecanli", emoji: "🤩", label: "Heyecanlı" },
  { key: "normal", emoji: "😐", label: "Normal" },
  { key: "yorgun", emoji: "😴", label: "Yorgun" },
  { key: "stresli", emoji: "😰", label: "Stresli" },
  { key: "uzgun", emoji: "😢", label: "Üzgün" },
  { key: "sinirli", emoji: "😤", label: "Sinirli" },
  { key: "hasta", emoji: "🤒", label: "Hasta" },
] as const;

export type MoodKey = (typeof MOOD_OPTIONS)[number]["key"];
export const MOOD_BY_KEY = Object.fromEntries(MOOD_OPTIONS.map((m) => [m.key, m])) as Record<
  string,
  (typeof MOOD_OPTIONS)[number]
>;

export const DEED_PRESETS = [
  { emoji: "☕", text: "Kahve/çay yaptım" },
  { emoji: "🍳", text: "Yemek hazırladım" },
  { emoji: "💌", text: "Güzel bir mesaj attım" },
  { emoji: "🧹", text: "Onun yerine bir iş hallettim" },
  { emoji: "🎁", text: "Küçük bir sürpriz yaptım" },
  { emoji: "🤗", text: "Sarılıp moral verdim" },
  { emoji: "🛒", text: "İhtiyacını aldım" },
  { emoji: "👂", text: "Onu dinledim" },
] as const;
