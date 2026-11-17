import { requireUser } from "@/lib/auth";
import { BADGES } from "@/lib/badges";
import { sql } from "@/lib/db";
import { weekProgress, weeklyGoalTarget, xpTotals } from "@/lib/game";
import { addDays, formatShort, todayStr, weekStart } from "@/lib/time";
import { colorOf } from "@/lib/types";
import { loadState, personSummary } from "@/lib/views";
import { Avatar, Flame, ProgressBar, SectionTitle } from "@/components/ui";
import GoalEditor from "@/components/goal-editor";

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
  const owned = (pid: number) => new Map(badgeRows.filter((b) => b.profile_id === pid).map((b) => [b.badge_id, b.earned_at]));

  return (
    <>
      <h1 className="mt-3 px-1 text-2xl font-black">Biz</h1>

      <div className={`card mt-3 p-4 ${reached ? "bg-rose-soft" : ""}`}>
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
          <span className="text-muted">/ {target} XP</span>
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
              {p.profile.emoji} {p.profile.name}: {progress.byProfile.get(p.profile.id) ?? 0} XP
            </span>
          ))}
        </div>
        <p className="mt-2 text-sm font-semibold text-muted">
          {reached
            ? "Bu haftanın hedefi tamam! İkinize de bonus XP verildi 🎉"
            : `Hedefe ${target - progress.total} XP kaldı. Ulaşınca ikinize de +50 XP!`}
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
                {p.xp} XP · en uzun seri {Math.max(p.profile.best_streak, p.streak)}
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
          <li>Görev bitirince XP kazanırsın; XP birikince seviye atlarsın.</li>
          <li>O günün tüm görevlerini bitirirsen 🔥 serin bir gün uzar.</li>
          <li>Bir gün kaçırırsan 🧊 joker otomatik devreye girer ve serini korur. Her ay 2 joker yenilenir.</li>
          <li>7 ve 30 günlük serilerde bonus XP var.</li>
          <li>Haftalık hedefe ikiniz birlikte ulaşırsanız ikinize de +50 XP.</li>
        </ul>
      </div>
    </>
  );
}
