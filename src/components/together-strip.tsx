import Link from "next/link";
import { Icon, type IconName } from "./icons";
import { recentEmojis } from "@/lib/emoji-server";
import { distanceMeters, locationOf } from "@/lib/location";
import { unseenMoments } from "@/lib/moments";
import { MOOD_BY_KEY } from "@/lib/mood-options";
import { deedsForDay, moodsForDay } from "@/lib/moods";
import { songsForDay } from "@/lib/songs";
import { todayQuestion } from "@/lib/questions";
import { openCount } from "@/lib/shopping";
import type { Profile } from "@/lib/types";

function km(m: number) {
  return m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} km`;
}

function ago(iso: string) {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  return min < 1 ? "az önce" : min < 60 ? `${min} dk` : min < 1440 ? `${Math.round(min / 60)} sa` : "1+ gün";
}

type Item = { href: string; icon: IconName; emoji?: string; title: string; sub: string; hot?: boolean; badge?: number };

/**
 * Bugün sayfasının en üstündeki yana kayan küçük özet kartları. Dokununca "Biz"
 * sekmesindeki ilgili bölüm açılır.
 */
export default async function TogetherStrip({ me, partner, today }: { me: Profile; partner: Profile; today: string }) {
  const [moods, deeds, songs, unseen, emojis, myLoc, partnerLoc, question, shop] = await Promise.all([
    moodsForDay(today),
    deedsForDay(today),
    songsForDay(today),
    unseenMoments(me.id),
    recentEmojis(10),
    locationOf(me.id),
    locationOf(partner.id),
    todayQuestion(),
    openCount(),
  ]);
  const iAnswered = question.answers.some((a) => a.profile_id === me.id);
  const theyAnswered = question.answers.some((a) => a.profile_id === partner.id);
  const theirMood = moods.find((m) => m.profile_id === partner.id);
  const myMood = moods.find((m) => m.profile_id === me.id);
  const forMe = deeds.filter((d) => d.from_id === partner.id).length;
  const byMe = deeds.filter((d) => d.from_id === me.id).length;
  const theirSong = songs.find((s) => s.profile_id === partner.id);
  const mySong = songs.find((s) => s.profile_id === me.id);
  const lastEmoji = emojis.find((e) => e.from_id === partner.id);

  const items: Item[] = [
    {
      href: "/biz#his",
      icon: "smile",
      emoji: theirMood ? MOOD_BY_KEY[theirMood.mood]?.emoji : undefined,
      title: theirMood ? partner.name : "Nasıl hissediyor?",
      sub: theirMood
        ? MOOD_BY_KEY[theirMood.mood]?.label ?? ""
        : myMood
          ? "Henüz paylaşmadı"
          : "Sen de paylaş",
      hot: !myMood,
    },
    {
      href: "/biz#soru",
      icon: "question",
      title: "Günün sorusu",
      sub: iAnswered ? (theyAnswered ? "Cevaplar açık" : "Cevap bekleniyor") : theyAnswered ? `${partner.name} cevapladı` : "Cevapla, +5",
      hot: !iAnswered,
    },
    {
      href: "/sensiz",
      icon: "mail",
      title: "Sensiz",
      sub: unseen.count > 0 ? `${unseen.count} yeni` : "Paylaş",
      hot: unseen.count > 0,
      badge: unseen.count,
    },
    {
      href: "/biz#icin",
      icon: "gift",
      title: "Onun için",
      sub: forMe > 0 ? `${partner.name}: ${forMe}` : byMe > 0 ? `Sen: ${byMe}` : "Ne yaptın?",
      hot: forMe > 0,
    },
    {
      href: "/biz#sarki",
      icon: "music",
      title: "Şarkı",
      sub: theirSong ? theirSong.title : mySong ? "Paylaştın" : "Paylaş",
      hot: !!theirSong && !theirSong.reaction,
    },
    {
      href: "/biz#emoji",
      icon: "emoji",
      emoji: lastEmoji?.emoji,
      title: "Emoji",
      sub: lastEmoji ? `${partner.name} gönderdi` : "Gönder",
    },
    {
      href: "/liste",
      icon: "cart",
      title: "Alışveriş",
      sub: shop ? `${shop} ürün` : "Liste boş",
    },
    {
      href: "/konum",
      icon: "pin",
      title: "Konum",
      sub: partnerLoc
        ? `${myLoc ? km(distanceMeters(myLoc, partnerLoc)) + " · " : ""}${ago(partnerLoc.updatedAt)}`
        : "Paylaşılmıyor",
    },
  ];

  return (
    <nav aria-label="Birlikte" className="-mx-4 mt-1">
      <ul className="flex snap-x gap-2 overflow-x-auto px-4 pt-1 pb-1 [scrollbar-width:none]">
        {items.map((it) => (
          <li key={it.href} className="snap-start">
            <Link
              href={it.href}
              className={`relative flex h-[84px] w-[100px] flex-col justify-between rounded-[1.1rem] border px-3 py-2.5 ${
                it.hot ? "border-brand/30 bg-brand-soft" : "border-line bg-surface"
              }`}
            >
              <span className="flex h-6 items-center text-brand">
                {it.emoji ? <span className="text-xl leading-none">{it.emoji}</span> : <Icon name={it.icon} size={21} />}
              </span>
              <span className="min-w-0 leading-tight">
                <span className="block truncate text-[12.5px] font-semibold">{it.title}</span>
                <span className="block truncate text-[11px] text-muted">{it.sub}</span>
              </span>
              {it.badge ? (
                <span className="absolute top-2 right-2 min-w-[18px] rounded-full bg-brand px-1 text-center text-[10px] leading-[18px] font-bold text-on-brand">
                  {it.badge}
                </span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
