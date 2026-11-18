import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { BADGES } from "@/lib/badges";
import { sql } from "@/lib/db";
import { weekProgress, weeklyGoalTarget, xpTotals } from "@/lib/game";
import { addDays, formatShort, todayStr, weekStart } from "@/lib/time";
import { colorOf } from "@/lib/types";
import { loadState, personSummary } from "@/lib/views";
import { Avatar, Flame, ProgressBar, SectionTitle } from "@/components/ui";
import GoalEditor from "@/components/goal-editor";
import MoodCard from "@/components/mood-card";
import DeedCard from "@/components/deed-card";
import SongCard from "@/components/song-card";
import EmojiBar from "@/components/emoji-bar";
import { QuestionCard } from "@/components/question-card";
import { todayQuestion } from "@/lib/questions";
import { openCount } from "@/lib/shopping";
import { listDreams } from "@/lib/dreams";
import { deedsForDay, moodsForDay } from "@/lib/moods";
import { songsForDay } from "@/lib/songs";
import { unseenMoments } from "@/lib/moments";
import { recentEmojis } from "@/lib/emoji-server";
import { distanceMeters, locationOf, sharingOf } from "@/lib/location";

function locAgo(iso: string) {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  return min < 1 ? "az önce" : min < 60 ? `${min} dk önce` : min < 1440 ? `${Math.round(min / 60)} sa önce` : "1+ gün önce";
}

function km(m: number) {
  return m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} km`;
}

export const metadata = { title: "Biz — Two Of Us" };

export default async function UsPage() {
  const { me, partner } = await requireUser();
  const today = todayStr();
  const week = weekStart(today);
  const state = await loadState(today);
  const totals = await xpTotals();
  const people = [await personSummary(me, state, totals), await personSummary(partner, state, totals)];
  const target = await weeklyGoalTarget();
  const progress = await weekProgress(week);
  const reached = progress.total >= target;
  const [{ n: goalsDone }] = await sql<{ n: number }[]>`select count(*)::int as n from goal_weeks`;
  const badgeRows = await sql<{ profile_id: number; badge_id: string; earned_at: Date }[]>`
    select profile_id, badge_id, earned_at from profile_badges`;
  const [moods, deeds, songs, unseenM, recent, mySharing, myLoc, partnerLoc, question, shopCount, dreams] = await Promise.all([
    moodsForDay(today),
    deedsForDay(today),
    songsForDay(today),
    unseenMoments(me.id),
    recentEmojis(6),
    sharingOf(me.id),
    locationOf(me.id),
    locationOf(partner.id),
    todayQuestion(),
    openCount(),
    listDreams(),
  ]);
  const openDreams = dreams.filter((d) => !d.done_at).length;
  const owned = (pid: number) => new Map(badgeRows.filter((b) => b.profile_id === pid).map((b) => [b.badge_id, b.earned_at]));

  return (
    <>
      <div className="mt-3 flex items-center justify-between px-1">
        <h1 className="text-2xl font-black">Biz</h1>
      </div>

      <nav aria-label="Birlikte" className="mt-3 grid grid-cols-3 gap-2">
        {[
          { href: "/liste", icon: "🛒", label: "Alışveriş", sub: shopCount ? `${shopCount} ürün` : "Liste boş" },
          { href: "/hayaller", icon: "🌟", label: "Hayaller", sub: `${openDreams} sırada` },
          { href: "/takvim", icon: "📅", label: "Anılar", sub: "Takvim" },
          { href: "/sorular", icon: "❓", label: "Sorular", sub: "Arşiv & ekle" },
          { href: "/sensiz", icon: "💌", label: "Sensiz", sub: unseenM.count ? `${unseenM.count} yeni` : "Paylaş" },
          { href: "/istatistik", icon: "📊", label: "İstatistik", sub: "30 gün" },
        ].map((t) => (
          <Link key={t.href} href={t.href} className="card flex flex-col items-center px-2 py-3 text-center">
            <span className="text-2xl" aria-hidden>
              {t.icon}
            </span>
            <span className="mt-1 text-sm font-black">{t.label}</span>
            <span className="text-[11px] font-semibold text-muted">{t.sub}</span>
          </Link>
        ))}
      </nav>

      <section id="his" className="mt-3 scroll-mt-24">
        <SectionTitle>💭 Nasıl hissediyorsunuz?</SectionTitle>
        <MoodCard
          mine={moods.find((x) => x.profile_id === me.id) ?? null}
          theirs={moods.find((x) => x.profile_id === partner.id) ?? null}
          partner={{ name: partner.name, emoji: partner.emoji }}
        />
      </section>

      <section id="soru" className="scroll-mt-24">
        <SectionTitle right={<Link href="/sorular" className="text-sm font-extrabold text-brand">Arşiv</Link>}>
          ❓ Günün sorusu
        </SectionTitle>
        <QuestionCard
          q={question}
          me={{ id: me.id, name: me.name, emoji: me.emoji }}
          partner={{ id: partner.id, name: partner.name, emoji: partner.emoji }}
        />
      </section>

      <section id="icin" className="scroll-mt-24">
        <SectionTitle>💝 Birbiriniz için</SectionTitle>
        <DeedCard meId={me.id} deeds={deeds} partner={{ name: partner.name, emoji: partner.emoji }} />
      </section>

      <section id="sarki" className="scroll-mt-24">
        <SectionTitle right={<Link href="/sarkilar" className="text-sm font-extrabold text-brand">Arşiv</Link>}>
          🎵 Günün şarkısı
        </SectionTitle>
        <SongCard
          mine={songs.find((x) => x.profile_id === me.id) ?? null}
          theirs={songs.find((x) => x.profile_id === partner.id) ?? null}
          partner={{ name: partner.name, emoji: partner.emoji }}
        />
      </section>

      <section id="emoji" className="scroll-mt-24">
        <SectionTitle>😘 Emoji · 📍 Konum</SectionTitle>
        <div className="card p-4">
          <EmojiBar meId={me.id} partnerName={partner.name} recent={recent} />
          <Link href="/konum" className="mt-3 flex items-center gap-2 rounded-xl bg-bg px-3 py-2.5 text-sm font-semibold">
            <span className="text-lg">📍</span>
            <span className="min-w-0 flex-1 truncate">
              {partnerLoc
                ? `${partner.name} · ${locAgo(partnerLoc.updatedAt)}${myLoc ? ` · ${km(distanceMeters(myLoc, partnerLoc))}` : ""}`
                : `Konum${mySharing ? "" : " · paylaşım kapalı"}`}
            </span>
            {mySharing && <span className="chip bg-sage-soft text-sage-ink">Konumun açık</span>}
            <span className="font-black text-brand">›</span>
          </Link>
        </div>
      </section>

      <SectionTitle>🏆 Hedef ve rozetler</SectionTitle>
      <div className={`card p-4 ${reached ? "bg-rose-soft" : ""}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-black">🏆 Haftalık ortak hedef</div>
            <div className="text-xs font-bold text-muted">
              {formatShort(week)} – {formatShort(addDays(week, 6))} · şimdiye kadar {goalsDone} kez başardınız
            </div>
          </div>
          <GoalEditor target={target} />
        </div>
        <div className="mt-3 flex items-baseline justify-between font-black">
          <span className="text-3xl">{progress.total}</span>
          <span className="text-muted">/ {target} 🥕</span>
        </div>
        <div className="mt-1">
          <ProgressBar value={progress.total} max={target} color="var(--rose)" height={18} />
        </div>
        {/* Kim ne kadar katkı verdi */}
        <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-line">
          {people.map((p) => (
            <div
              key={p.profile.id}
              style={{
                width: `${progress.total ? ((progress.byProfile.get(p.profile.id) ?? 0) / Math.max(progress.total, target)) * 100 : 0}%`,
                background: colorOf(p.profile.color).bg,
              }}
            />
          ))}
        </div>
        <div className="mt-2 flex justify-between text-sm font-bold">
          {people.map((p) => (
            <span key={p.profile.id} className="flex items-center gap-1">
              {p.profile.emoji} {p.profile.name}: {progress.byProfile.get(p.profile.id) ?? 0} 🥕
            </span>
          ))}
        </div>
        <p className="mt-2 text-sm font-semibold text-muted">
          {reached
            ? "Bu haftanın hedefi tamam! İkinize de bonus havuç verildi 🎉"
            : `Hedefe ${target - progress.total} havuç kaldı. Ulaşınca ikinize de +50 🥕!`}
          <br />
          Sadece 💞 ortak görevler bu hedefi ilerletir; kendi görevleriniz saymaz.
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {people.map((p) => {
          const c = colorOf(p.profile.color);
          return (
            <div key={p.profile.id} className="card flex flex-col items-center p-4 text-center">
              <Avatar emoji={p.profile.emoji} color={p.profile.color} size={60} />
              <div className="mt-2 font-black">{p.profile.name}</div>
              <div className="text-xs font-extrabold" style={{ color: c.dark }}>
                Seviye {p.level.level} · {p.level.title}
              </div>
              <div className="mt-2 w-full">
                <ProgressBar value={p.level.intoLevel} max={p.level.needed} color={c.bg} height={10} />
              </div>
              <div className="mt-2 flex items-center gap-3 text-sm">
                <Flame streak={p.streak} lit={p.todayDone} size={18} />
                <span className="font-black text-ice">🧊{p.profile.freezes}</span>
              </div>
              <div className="mt-1 text-xs font-bold text-muted">
                {p.xp} 🥕 toplam · en uzun seri {Math.max(p.profile.best_streak, p.streak)}
              </div>
            </div>
          );
        })}
      </div>

      {[me, partner].map((p) => {
        const mine = owned(p.id);
        return (
          <section key={p.id}>
            <SectionTitle right={<span className="text-sm font-bold text-muted">{mine.size}/{BADGES.length}</span>}>
              {p.emoji} {p.id === me.id ? "Rozetlerin" : `${p.name} rozetleri`}
            </SectionTitle>
            <div className="grid grid-cols-4 gap-2">
              {BADGES.map((b) => {
                const has = mine.has(b.id);
                return (
                  <div
                    key={b.id}
                    className={`flex flex-col items-center rounded-2xl p-2 text-center ${has ? "bg-surface shadow-[0_3px_0_var(--line)]" : "bg-line/50"}`}
                    title={b.description}
                  >
                    <span className={`text-3xl ${has ? "" : "opacity-30 grayscale"}`}>{has ? b.emoji : "🔒"}</span>
                    <span className={`mt-1 text-[11px] leading-tight font-extrabold ${has ? "" : "text-muted"}`}>
                      {b.name}
                    </span>
                    {!has && <span className="mt-0.5 text-[9px] leading-tight font-semibold text-muted">{b.description}</span>}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      <div className="card mt-6 p-4 text-sm font-semibold text-muted">
        <div className="mb-1 font-black text-ink">Nasıl çalışır?</div>
        <ul className="list-inside list-disc space-y-1">
          <li>Görev bitirince 🥕 havuç kazanırsın. Toplam havucun arttıkça seviye atlarsın; mağazada harcaman seviyeni düşürmez.</li>
          <li>O günün tüm görevlerini bitirirsen 🔥 serin bir gün uzar.</li>
          <li>Bir gün kaçırırsan 🧊 joker otomatik devreye girer ve serini korur. Her ay 2 joker yenilenir.</li>
          <li>7 ve 30 günlük serilerde bonus havuç var.</li>
          <li>Haftalık ortak hedefi sadece 💞 ortak görevler doldurur. Ulaşırsanız ikinize de +50 🥕.</li>
        </ul>
      </div>
    </>
  );
}
