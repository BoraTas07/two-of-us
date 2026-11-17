import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { songHistory } from "@/lib/songs";
import { formatLong, formatRelative, todayStr } from "@/lib/time";
import { SongPlayer } from "@/components/song-card";
import { Empty } from "@/components/ui";

export const metadata = { title: "Şarkılarımız — Two Of Us" };

export default async function SongsPage() {
  const { me, partner } = await requireUser();
  const songs = await songHistory(90);
  const today = todayStr();
  const days = [...new Set(songs.map((s) => s.day))];

  return (
    <>
      <div className="mt-3 flex items-center gap-2 px-1">
        <Link href="/#sarki" className="text-2xl text-muted" aria-label="Geri">
          ←
        </Link>
        <h1 className="text-2xl">Şarkılarımız</h1>
      </div>
      <p className="mt-1 px-1 text-sm font-semibold text-muted">Günün şarkılarınızın arşivi.</p>

      {days.length === 0 ? (
        <div className="mt-4">
          <Empty emoji="🎵">Henüz şarkı paylaşılmadı. Bugün sayfasından ilk şarkıyı paylaş!</Empty>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {days.map((d) => (
            <section key={d}>
              <h2 className="mb-2 px-1 text-sm font-semibold text-muted">
                {formatRelative(d, today) === formatLong(d) ? formatLong(d) : `${formatRelative(d, today)} · ${formatLong(d)}`}
              </h2>
              <div className="space-y-2">
                {songs
                  .filter((s) => s.day === d)
                  .map((s) => {
                    const who = s.profile_id === me.id ? me : partner;
                    return (
                      <div key={s.id} className="card flex items-start gap-3 p-3">
                        <span className="text-2xl" title={who.name}>
                          {who.emoji}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="font-black leading-snug">{s.title}</div>
                          {s.artist && <div className="text-sm font-semibold text-muted">{s.artist}</div>}
                          {s.note && <p className="mt-1 text-sm italic">&ldquo;{s.note}&rdquo;</p>}
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <SongPlayer song={s} compact />
                            {s.reaction && (
                              <span className="chip bg-rose-soft text-ink">
                                {s.reaction} {s.profile_id === me.id ? partner.name : "Sen"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
