export type BadgeStats = {
  completed: number; // onaylanmış tamamlanan görev sayısı
  streak: number; // güncel seri (bugün dahil)
  level: number;
  earlyBird: boolean; // 08:00'den önce görev
  nightOwl: boolean; // 23:00'ten sonra görev
  approvalsGiven: number;
  sharedDone: number;
  goalsAchieved: number;
  bestHabitStreak: number;
};

export type Badge = {
  id: string;
  emoji: string;
  name: string;
  description: string;
  earned: (s: BadgeStats) => boolean;
};

export const BADGES: Badge[] = [
  { id: "ilk-adim", emoji: "👣", name: "İlk Adım", description: "İlk görevini tamamla", earned: (s) => s.completed >= 1 },
  { id: "isinma", emoji: "🔟", name: "Isınma Turu", description: "10 görev tamamla", earned: (s) => s.completed >= 10 },
  { id: "elli", emoji: "🏅", name: "Elli Elli", description: "50 görev tamamla", earned: (s) => s.completed >= 50 },
  { id: "yuzluk", emoji: "💯", name: "Yüzlük", description: "100 görev tamamla", earned: (s) => s.completed >= 100 },
  { id: "kivilcim", emoji: "🔥", name: "Kıvılcım", description: "3 günlük seri yap", earned: (s) => s.streak >= 3 },
  { id: "haftalik-alev", emoji: "⚡", name: "Haftalık Alev", description: "7 günlük seri yap", earned: (s) => s.streak >= 7 },
  { id: "volkan", emoji: "🌋", name: "Volkan", description: "30 günlük seri yap", earned: (s) => s.streak >= 30 },
  { id: "erkenci", emoji: "🌅", name: "Erkenci Kuş", description: "Sabah 8'den önce görev bitir", earned: (s) => s.earlyBird },
  { id: "gece-kusu", emoji: "🦉", name: "Gece Kuşu", description: "Gece 11'den sonra görev bitir", earned: (s) => s.nightOwl },
  { id: "hakem", emoji: "🤝", name: "Adil Hakem", description: "Partnerinin 10 görevini onayla", earned: (s) => s.approvalsGiven >= 10 },
  { id: "takim-oyuncusu", emoji: "💞", name: "Takım Oyuncusu", description: "10 ortak görev bitirin", earned: (s) => s.sharedDone >= 10 },
  { id: "takim-ruhu", emoji: "🏆", name: "Takım Ruhu", description: "Haftalık ortak hedefe ulaşın", earned: (s) => s.goalsAchieved >= 1 },
  { id: "efsane-ikili", emoji: "👑", name: "Efsane İkili", description: "4 kez ortak hedefe ulaşın", earned: (s) => s.goalsAchieved >= 4 },
  { id: "kok-saldi", emoji: "🌱", name: "Kök Saldı", description: "Bir alışkanlıkta 21 gün seri", earned: (s) => s.bestHabitStreak >= 21 },
  { id: "yildiz", emoji: "⭐", name: "Yıldız", description: "5. seviyeye ulaş", earned: (s) => s.level >= 5 },
  { id: "superstar", emoji: "🌟", name: "Süperstar", description: "10. seviyeye ulaş", earned: (s) => s.level >= 10 },
];

export const BADGE_BY_ID = Object.fromEntries(BADGES.map((b) => [b.id, b]));
