import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { evaluateStreaks, xpTotals } from "@/lib/game";
import { loadState, personSummary } from "@/lib/views";
import { Avatar, Carrots, Flame, ProgressBar } from "@/components/ui";
import { balanceOf } from "@/lib/shop";
import BottomNav from "@/components/bottom-nav";
import AutoRefresh from "@/components/auto-refresh";
import Celebration from "@/components/celebration";
import EmojiInbox from "@/components/emoji-inbox";
import { unseenEmojis } from "@/lib/emoji-server";
import { unreadCount } from "@/lib/notifications";
import { sharingOf } from "@/lib/location";
import LocationTracker from "@/components/location-tracker";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  // Geçmiş günleri seriye işle (zamanlayıcı çalışmasa bile seri doğru kalır)
  await evaluateStreaks();
  const { me, partner } = await requireUser();
  const state = await loadState();
  const s = await personSummary(me, state, await xpTotals());
  const balance = await balanceOf(me.id);
  const unseen = await unseenEmojis(me.id);
  const unread = await unreadCount(me.id);
  const sharingLocation = await sharingOf(me.id);

  return (
    <div className="mx-auto min-h-dvh max-w-md">
      <header className="safe-top sticky top-0 z-20 border-b border-line bg-bg/90 px-4 pb-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <Link href="/profil" aria-label="Profilim" className="relative">
            <Avatar emoji={me.emoji} color={me.color} size={44} />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between text-xs font-extrabold text-muted">
              <span className="truncate">
                Sv. {s.level.level} · {s.level.title}
              </span>
              <span title="Bir sonraki seviyeye">
                {s.level.intoLevel}/{s.level.needed}
              </span>
            </div>
            <div className="mt-1">
              <ProgressBar value={s.level.intoLevel} max={s.level.needed} color="var(--xp)" height={12} />
            </div>
          </div>
          <Link href="/magaza" className="flex items-center gap-2.5" aria-label="Havuç, seri ve joker">
            <Carrots n={balance} className="text-sm font-black text-xp-ink" />
            <Flame streak={s.streak} lit={s.todayDone} size={18} />
            <span className="flex items-center text-sm font-black text-ice-ink" title="Seri koruma jokeri">
              🧊{me.freezes}
            </span>
          </Link>
          <Link
            href="/bildirimler"
            className="relative -mr-1 flex h-9 w-9 items-center justify-center rounded-full text-lg"
            aria-label={unread ? `Bildirimler, ${unread} okunmamış` : "Bildirimler"}
          >
            <span aria-hidden>🔔</span>
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] rounded-full bg-brand px-1 text-center text-[10px] leading-[18px] font-black text-white ring-2 ring-bg">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Link>
        </div>
      </header>
      <main className="px-4 pt-2 pb-32">{children}</main>
      <BottomNav />
      <AutoRefresh />
      <Celebration />
      <LocationTracker sharing={sharingLocation} />
      <EmojiInbox
        unseen={unseen.map((m) => ({ id: m.id, emoji: m.emoji }))}
        partnerName={partner.name}
        partnerEmoji={partner.emoji}
      />
    </div>
  );
}
