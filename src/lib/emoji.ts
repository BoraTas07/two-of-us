// Birbirinize gönderebileceğiniz emojiler ve bildirimde görünen adları.
// (Sunucu ve istemci ortak kullanır; veritabanı erişimi yok.)

export const EMOJI_OPTIONS = [
  { emoji: "❤️", name: "kalp" },
  { emoji: "😘", name: "öpücük" },
  { emoji: "💔", name: "kırık kalp" },
  { emoji: "🥰", name: "sevgi" },
  { emoji: "🤗", name: "sarılma" },
  { emoji: "😂", name: "kahkaha" },
  { emoji: "👏", name: "alkış" },
  { emoji: "🔥", name: "ateş" },
  { emoji: "🙏", name: "teşekkür" },
  { emoji: "🌹", name: "gül" },
  { emoji: "☕", name: "kahve" },
  { emoji: "😢", name: "hüzün" },
  { emoji: "😴", name: "uykulu yüz" },
  { emoji: "😡", name: "kızgın yüz" },
] as const;

export const EMOJI_NAME: Record<string, string> = Object.fromEntries(EMOJI_OPTIONS.map((o) => [o.emoji, o.name]));
