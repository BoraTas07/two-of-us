import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { evaluateStreaks } from "@/lib/game";
import { loadState, personSummary } from "@/lib/views";
import { Avatar, Flame, ProgressBar } from "@/components/ui";
import BottomNav from "@/components/bottom-nav";
import AutoRefresh from "@/components/auto-refresh";
import Celebration from "@/components/celebration";
import { xpTotals } from "@/lib/game";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  // Geçmiş günleri seriye işle (zamanlayıcı çalışmasa bile seri doğru kalır)
  await evaluateStreaks();
  const { me } = await requireUser();
  const state = await loadState();
  const s = await personSummary(me, state, await xpTotals());

  return (
    <div className="mx-auto min-h-dvh max-w-md">
      <header className="safe-top sticky top-0 z-20 border-b-2 border-line bg-bg/90 px-4 pb-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <Link href="/profil" aria-label="Profilim" className="relative">
            <Avatar emoji={me.emoji} color={me.color} size={44} />
            <span className="absolute -right-1 -bottom-1 rounded-full bg-brand px-1.5 text-[11px] font-black text-white ring-2 ring-white">
              {s.level.level}
            </span>
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between text-xs font-extrabold text-muted">
              <span className="truncate">{s.level.title}</span>
              <span>
                {s.level.intoLevel}/{s.level.needed} XP
              </span>
            </div>
            <div className="mt-1">
              <ProgressBar value={s.level.intoLevel} max={s.level.needed} color="var(--xp)" height={12} />
            </div>
          </div>
          <Link href="/profil" className="flex items-center gap-2" aria-label="Seri">
            <Flame streak={s.streak} lit={s.todayDone} />
            <span className="flex items-center text-sm font-black text-ice" title="Seri koruma jokeri">
              🧊{me.freezes}
            </span>
          </Link>
        </div>
      </header>
      <main className="px-4 pt-2 pb-32">{children}</main>
      <BottomNav />
      <AutoRefresh />
      <Celebration />
    </div>
  );
}
