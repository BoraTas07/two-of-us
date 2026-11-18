import Link from "next/link";
import Hero from "@/components/hero";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { dayDetail, monthSummary } from "@/lib/calendar";
import { addDays, daysInMonth, formatLong, MONTHS, todayStr, weekday, WEEKDAYS_SHORT } from "@/lib/time";

export const metadata = { title: "Anı takvimi — Two Of Us" };

function shiftMonth(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ ay?: string; gun?: string }> }) {
  await connection();
  const { me, partner } = await requireUser();
  const sp = await searchParams;
  const today = todayStr();
  const thisMonth = today.slice(0, 7);
  const month = /^\d{4}-\d{2}$/.test(sp.ay ?? "") && sp.ay! <= thisMonth ? sp.ay! : thisMonth;
  const first = `${month}-01`;
  const days = daysInMonth(first);
  const selected =
    /^\d{4}-\d{2}-\d{2}$/.test(sp.gun ?? "") && sp.gun!.startsWith(month) && sp.gun! <= today
      ? sp.gun!
      : month === thisMonth
        ? today
        : null;

  const [summary, detail] = await Promise.all([monthSummary(month), selected ? dayDetail(selected) : null]);
  const name = (id: number) => (id === me.id ? "Sen" : partner.name);
  const emo = (id: number) => (id === me.id ? me.emoji : partner.emoji);
  const [y, m] = month.split("-").map(Number);

  const cells: (string | null)[] = [...Array(weekday(first)).fill(null)];
  for (let i = 0; i < days; i++) cells.push(addDays(first, i));

  const empty =
    detail &&
    !detail.moods.length &&
    !detail.songs.length &&
    !detail.deeds.length &&
    !detail.moments.length &&
    !detail.tasks.length &&
    !detail.answers.length &&
    !detail.dreams.length;

  return (
    <>
      <Hero back="/biz" title="Anı takvimi" />

      <div className="card mt-3 p-3">
        <div className="mb-2 flex items-center justify-between px-1">
          <Link href={`/takvim?ay=${shiftMonth(month, -1)}`} className="btn bg-bg px-3 py-1.5 text-ink" aria-label="Önceki ay">
            ‹
          </Link>
          <div className="font-serif text-lg">
            {MONTHS[m - 1]} {y}
          </div>
          {month < thisMonth ? (
            <Link href={`/takvim?ay=${shiftMonth(month, 1)}`} className="btn bg-bg px-3 py-1.5 text-ink" aria-label="Sonraki ay">
              ›
            </Link>
          ) : (
            <span className="w-10" />
          )}
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {WEEKDAYS_SHORT.map((w) => (
            <div key={w} className="pb-1 text-[11px] font-bold text-muted">
              {w}
            </div>
          ))}
          {cells.map((d, i) => {
            if (!d) return <div key={`e${i}`} />;
            const s = summary.get(d);
            const future = d > today;
            const dots = s ? [s.tasks && "✅", s.songs && "🎵", s.moments && "💌", s.deeds && "💝", s.answers && "❓", s.dreams && "✨"].filter(Boolean) : [];
            const cls = `flex aspect-[4/5] flex-col items-center rounded-xl px-0.5 pt-1 text-xs ${
              d === selected ? "bg-brand-soft ring-2 ring-brand" : s ? "bg-bg" : ""
            } ${future ? "opacity-35" : ""}`;
            const inner = (
              <>
                <span className={`font-black ${d === today ? "text-brand" : ""}`}>{Number(d.slice(8))}</span>
                <span className="text-[13px] leading-tight">{s?.moods.map((x) => x.emoji).join("")}</span>
                <span className="mt-auto pb-0.5 text-[8px] leading-none">{dots.slice(0, 3).join("")}</span>
              </>
            );
            return future ? (
              <div key={d} className={cls}>
                {inner}
              </div>
            ) : (
              <Link key={d} href={`/takvim?ay=${month}&gun=${d}`} className={cls} scroll={false}>
                {inner}
              </Link>
            );
          })}
        </div>
      </div>

      {selected && detail && (
        <section className="mt-4">
          <h2 className="mb-2 px-1 text-lg">{formatLong(selected)}</h2>
          {empty ? (
            <p className="card p-5 text-center font-semibold text-muted">Bu güne ait bir şey yok.</p>
          ) : (
            <div className="space-y-2">
              {detail.moods.length > 0 && (
                <Box title="💭 Ruh halleri">
                  {detail.moods.map((x) => (
                    <Row key={x.profile_id} who={emo(x.profile_id)}>
                      <b>{name(x.profile_id)}</b>: {x.emoji} {x.label}
                      {x.note && <span className="text-muted"> · “{x.note}”</span>}
                    </Row>
                  ))}
                </Box>
              )}
              {detail.question && (
                <Box title="❓ Günün sorusu">
                  <p className="mb-1 font-semibold">{detail.question}</p>
                  {detail.answers.map((a) => (
                    <Row key={a.profile_id} who={emo(a.profile_id)}>
                      <b>{name(a.profile_id)}</b>: {a.text}
                    </Row>
                  ))}
                </Box>
              )}
              {detail.songs.length > 0 && (
                <Box title="🎵 Şarkılar">
                  {detail.songs.map((x, i) => (
                    <Row key={i} who={emo(x.profile_id)}>
                      <b>{x.title}</b>
                      {x.artist && <span className="text-muted"> · {x.artist}</span>}
                      {x.reaction && <span> {x.reaction}</span>}
                    </Row>
                  ))}
                </Box>
              )}
              {detail.deeds.length > 0 && (
                <Box title="💝 Birbiriniz için">
                  {detail.deeds.map((x, i) => (
                    <Row key={i} who={emo(x.from_id)}>
                      {x.emoji} {x.text}
                      {x.thanked && " ❤️"}
                    </Row>
                  ))}
                </Box>
              )}
              {detail.moments.length > 0 && (
                <Box title="💌 Sensiz İçime Sinmiyor">
                  {detail.moments.map((x) => (
                    <Row key={x.id} who={emo(x.author_id)}>
                      {x.text || "📷 Fotoğraf"}
                      {x.has_photo && x.text && " 📷"}
                    </Row>
                  ))}
                  <Link href="/sensiz" className="mt-1 block px-1 text-xs font-extrabold text-brand">
                    Paylaşımlara git ›
                  </Link>
                </Box>
              )}
              {detail.dreams.length > 0 && (
                <Box title="✨ Gerçekleşen hayaller">
                  {detail.dreams.map((x) => (
                    <div key={x.id}>
                      <Row who={x.emoji}>
                        <b>{x.title}</b>
                      </Row>
                      {x.has_photo && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={`/api/hayaller/${x.id}/foto`} alt={x.title} loading="lazy" className="mt-1 max-h-56 w-full rounded-xl object-cover" />
                      )}
                    </div>
                  ))}
                </Box>
              )}
              {detail.tasks.length > 0 && (
                <Box title={`✅ Bitirilen görevler (${detail.tasks.length})`}>
                  {detail.tasks.map((x, i) => (
                    <Row key={i} who={x.shared ? "💞" : emo(x.profile_id)}>
                      {x.emoji} {x.title}
                    </Row>
                  ))}
                </Box>
              )}
            </div>
          )}
        </section>
      )}
    </>
  );
}

function Box({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-3">
      <div className="mb-1.5 text-sm font-black">{title}</div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Row({ who, children }: { who: string; children: React.ReactNode }) {
  return (
    <p className="flex gap-2 rounded-xl bg-bg px-3 py-1.5 text-sm">
      <span aria-hidden>{who}</span>
      <span className="min-w-0 flex-1">{children}</span>
    </p>
  );
}
