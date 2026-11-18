import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { dayResult } from "@/lib/game";
import { addDays, formatRelative, todayStr, WEEKDAYS_SHORT, weekday } from "@/lib/time";
import { colorOf, type Profile } from "@/lib/types";
import { loadState } from "@/lib/views";
import { Avatar, Empty, SectionTitle } from "@/components/ui";

export const metadata = { title: "İstatistik — Two Of Us" };

/** Partnerin çubukları çizgili desenle gösterilir: renkler benzer olsa bile ayırt edilir. */
function barFill(color: string, striped: boolean) {
  return striped
    ? `repeating-linear-gradient(135deg, ${color} 0 5px, ${color}99 5px 8px)`
    : color;
}

function Legend({ me, partner }: { me: Profile; partner: Profile }) {
  return (
    <div className="flex gap-4 text-xs font-extrabold text-muted">
      {[me, partner].map((p, i) => (
        <span key={p.id} className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded" style={{ background: barFill(colorOf(p.color).bg, i === 1) }} />
          {p.emoji} {p.name}
        </span>
      ))}
    </div>
  );
}

export default async function StatsPage() {
  const { me, partner } = await requireUser();
  const today = todayStr();
  const from7 = addDays(today, -6);
  const from30 = addDays(today, -29);

  const xpRows = await sql<{ profile_id: number; day: string; total: number }[]>`
    select profile_id, day, sum(amount)::int as total from xp_events
    where day >= ${from30} group by profile_id, day`;
  const xpOf = (pid: number, d: string) => xpRows.find((r) => r.profile_id === pid && r.day === d)?.total ?? 0;
  const days7 = Array.from({ length: 7 }, (_, i) => addDays(from7, i));
  const max7 = Math.max(10, ...days7.flatMap((d) => [xpOf(me.id, d), xpOf(partner.id, d)]));

  // Son 30 günün tamamlama oranı (bugün hariç, yalnızca görev olan günler)
  const state = await loadState(today);
  const rate = (pid: number) => {
    let due = 0;
    let done = 0;
    for (let d = from30; d < today; d = addDays(d, 1)) {
      const r = dayResult(pid, d, state.tasks, state.idx);
      due += r.due;
      done += r.done;
    }
    return due ? Math.round((done / due) * 100) : null;
  };

  const counts = await sql<{ profile_id: number; n: number }[]>`
    select profile_id, count(*)::int as n from completions
    where status = 'approved' and occ_date >= ${from30} group by profile_id`;
  const countOf = (pid: number) => counts.find((c) => c.profile_id === pid)?.n ?? 0;
  const xp30 = (pid: number) => xpRows.filter((r) => r.profile_id === pid).reduce((s, r) => s + r.total, 0);

  const top = await sql<{ title: string; emoji: string; n: number }[]>`
    select t.title, t.emoji, count(*)::int as n from completions c join tasks t on t.id = c.task_id
    where c.occ_date >= ${from30} and c.status = 'approved'
    group by t.id, t.title, t.emoji order by n desc limit 5`;

  const feed = await sql<{ profile_id: number; amount: number; kind: string; note: string; created_at: Date }[]>`
    select profile_id, amount, kind, note, created_at from xp_events order by created_at desc limit 25`;

  const people = [me, partner];
  const nobody = xpRows.length === 0 && feed.length === 0;

  return (
    <>
      <div className="mt-3 flex items-center gap-2 px-1">
        <Link href="/biz" className="text-2xl text-muted" aria-label="Geri">
          ←
        </Link>
        <h1 className="text-2xl font-black">İstatistik</h1>
      </div>
      {nobody && (
        <div className="mt-4">
          <Empty emoji="📈">Görev bitirdikçe burada grafikler belirecek.</Empty>
        </div>
      )}

      <SectionTitle right={<Legend me={me} partner={partner} />}>Son 7 gün (🥕)</SectionTitle>
      <div className="card p-4">
        <div className="flex h-40 items-end gap-1.5" role="img" aria-label="Son 7 günde günlük kazanılan havuç">
          {days7.map((d) => {
            const vals = people.map((p) => xpOf(p.id, d));
            return (
              <div key={d} className="group relative flex h-full flex-1 flex-col justify-end" tabIndex={0}>
                <div className="flex h-full items-end justify-center gap-[2px]">
                  {people.map((p, i) => (
                    <div
                      key={p.id}
                      className="w-full max-w-4 rounded-t-[4px] transition-[height] duration-500"
                      style={{
                        height: `${(vals[i] / max7) * 100}%`,
                        minHeight: vals[i] ? 4 : 0,
                        background: barFill(colorOf(p.color).bg, i === 1),
                      }}
                    />
                  ))}
                </div>
                {/* Üzerine gelince / dokununca değerler */}
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 rounded-xl bg-ink px-2.5 py-1.5 text-xs font-bold whitespace-nowrap text-white group-hover:block group-focus:block">
                  <div className="text-white/70">{formatRelative(d, today)}</div>
                  {people.map((p, i) => (
                    <div key={p.id}>
                      {p.emoji} {vals[i]} 🥕
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-1 flex gap-1.5 border-t-2 border-line pt-1">
          {days7.map((d) => (
            <div key={d} className={`flex-1 text-center text-[11px] font-extrabold ${d === today ? "text-brand" : "text-muted"}`}>
              {d === today ? "Bugün" : WEEKDAYS_SHORT[weekday(d)]}
            </div>
          ))}
        </div>
      </div>

      <SectionTitle>Son 30 gün</SectionTitle>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted">
              <th className="px-4 py-2 font-extrabold"></th>
              <th className="px-2 py-2 text-right font-extrabold">Görev</th>
              <th className="px-2 py-2 text-right font-extrabold">🥕</th>
              <th className="px-4 py-2 text-right font-extrabold">Başarı</th>
            </tr>
          </thead>
          <tbody>
            {people.map((p) => {
              const r = rate(p.id);
              return (
                <tr key={p.id} className="border-t-2 border-line font-black">
                  <td className="flex items-center gap-2 px-4 py-2.5">
                    <Avatar emoji={p.emoji} color={p.color} size={28} /> {p.name}
                  </td>
                  <td className="px-2 text-right">{countOf(p.id)}</td>
                  <td className="px-2 text-right">{xp30(p.id)}</td>
                  <td className="px-4 text-right">{r === null ? "—" : `%${r}`}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="border-t-2 border-line px-4 py-2 text-xs font-semibold text-muted">
          Başarı: planlanan görevlerin zamanında bitirilme oranı (bugün hariç).
        </p>
      </div>

      {top.length > 0 && (
        <>
          <SectionTitle>En çok yapılanlar</SectionTitle>
          <div className="card divide-y-2 divide-line">
            {top.map((t, i) => (
              <div key={t.title + i} className="flex items-center gap-3 px-4 py-2.5 font-bold">
                <span className="w-5 text-muted">{i + 1}.</span>
                <span className="text-xl">{t.emoji}</span>
                <span className="flex-1 truncate">{t.title}</span>
                <span className="chip bg-line text-muted">{t.n} kez</span>
              </div>
            ))}
          </div>
        </>
      )}

      {feed.length > 0 && (
        <>
          <SectionTitle>Son hareketler</SectionTitle>
          <div className="card divide-y-2 divide-line">
            {feed.map((f, i) => {
              const p = f.profile_id === me.id ? me : partner;
              const icon =
                ({ streak: "🔥", goal: "🏆", swap: "🔄", question: "❓", dream: "✨" } as Record<string, string>)[f.kind] ?? "✅";
              return (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold">
                  <Avatar emoji={p.emoji} color={p.color} size={28} />
                  <span className="min-w-0 flex-1 truncate">
                    {icon} {f.note}
                  </span>
                  <span className="text-xp-ink">+{f.amount}</span>
                  <span className="w-12 text-right text-xs text-muted">{formatRelative(todayStr(f.created_at), today)}</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
