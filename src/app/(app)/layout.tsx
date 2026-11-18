import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { evaluateStreaks, xpTotals } from "@/lib/game";
import { loadState, personSummary } from "@/lib/views";
import { Avatar } from "@/components/ui";
import { Icon } from "@/components/icons";
import ThemeFx from "@/components/theme-fx";
import { currentTheme } from "@/lib/theme-server";
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
  const theme = await currentTheme();

  return (
    <div className="relative mx-auto min-h-dvh max-w-md">
      <header className="safe-top absolute inset-x-0 top-0 z-20 px-4 pb-3 text-[#f6ece4]">
        <div className="flex items-center gap-3">
          <Link href="/profil" aria-label="Profilim" className="relative">
            <Avatar emoji={me.emoji} color={me.color} size={40} />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold">{me.name}</div>
            <div className="flex items-center gap-2 text-[11px] opacity-80">
              <span className="truncate">Sv. {s.level.level} · {s.level.title}</span>
              <span className="h-1 w-12 shrink-0 overflow-hidden rounded-full bg-white/25" title={`${s.level.intoLevel}/${s.level.needed}`}>
                <span className="block h-full rounded-full bg-white/85" style={{ width: `${Math.round((s.level.intoLevel / Math.max(1, s.level.needed)) * 100)}%` }} />
              </span>
            </div>
          </div>
          <Link href="/magaza" className="flex items-center gap-2.5 text-sm font-semibold" aria-label="Havuç, seri ve joker">
            <span className="flex items-center gap-1"><Icon name="carrot" size={16} />{balance}</span>
            <span className={`flex items-center gap-1 ${s.todayDone ? "" : "opacity-60"}`}><Icon name="flame" size={16} />{s.streak}</span>
            <span className="flex items-center gap-1 opacity-80" title="Seri koruma jokeri"><Icon name="snowflake" size={15} />{me.freezes}</span>
          </Link>
          <Link
            href="/bildirimler"
            className="relative -mr-1 flex h-9 w-9 items-center justify-center rounded-full"
            aria-label={unread ? `Bildirimler, ${unread} okunmamış` : "Bildirimler"}
          >
            <Icon name="bell" size={21} />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] rounded-full bg-[#f6ece4] px-1 text-center text-[10px] leading-[18px] font-black text-head">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Link>
        </div>
      </header>
      <main className="relative z-[1] px-4 pt-2 pb-24">{children}</main>
      <div
        className="foot"
        style={{
          background: `linear-gradient(180deg, color-mix(in srgb, var(--head) ${Math.round((theme.def.footTint?.[0] ?? 0.4) * 100)}%, transparent), color-mix(in srgb, var(--head) ${Math.round((theme.def.footTint?.[1] ?? 0.65) * 100)}%, transparent)), url(${theme.def.foot}) ${theme.def.footPos ?? "center bottom"} / cover, var(--head)`,
        }}
      >
        {theme.decor && <ThemeFx layers={theme.def.footFx} />}
      </div>
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
