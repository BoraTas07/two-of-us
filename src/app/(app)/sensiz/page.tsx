import Link from "next/link";
import Hero from "@/components/hero";
import { requireUser } from "@/lib/auth";
import { markMomentsSeen, momentsPage } from "@/lib/moments";
import { formatLong, formatRelative, todayStr } from "@/lib/time";
import { MomentCard, MomentComposer } from "@/components/moments";
import { Empty } from "@/components/ui";

export const metadata = { title: "Sensiz İçime Sinmiyor — Two Of Us" };

export default async function SensizPage({ searchParams }: { searchParams: Promise<{ once?: string }> }) {
  const { me, partner } = await requireUser();
  const before = Number((await searchParams).once) || null;
  const { items, more } = await momentsPage(before);
  await markMomentsSeen(me.id);

  const today = todayStr();
  const dayOf = (iso: string) => todayStr(new Date(iso));
  const days = [...new Set(items.map((m) => dayOf(m.created_at)))];
  const people = {
    me: { id: me.id, name: me.name, emoji: me.emoji },
    partner: { id: partner.id, name: partner.name, emoji: partner.emoji },
  };

  return (
    <>
      <Hero back="/" title="Sensiz İçime Sinmiyor" desc={<>Gün içinde ayrıyken görüp beğendiğin, &quot;keşke burada olsaydı&quot; dediğin şeyler.</>} />

      {!before && <MomentComposer partnerName={partner.name} />}

      {items.length === 0 ? (
        <div className="mt-4">
          <Empty emoji="💌">Henüz paylaşım yok. Bugün gördüğün güzel bir şeyi ilk sen paylaş!</Empty>
        </div>
      ) : (
        <div className="mt-4 space-y-5">
          {days.map((d) => (
            <section key={d} className="space-y-3">
              <h2 className="px-1 text-sm font-semibold text-muted">
                {["Bugün", "Dün"].includes(formatRelative(d, today)) ? `${formatRelative(d, today)} · ` : ""}
                {formatLong(d)}
              </h2>
              {items
                .filter((m) => dayOf(m.created_at) === d)
                .map((m) => (
                  <MomentCard key={m.id} m={m} me={people.me} partner={people.partner} />
                ))}
            </section>
          ))}
        </div>
      )}

      {more && (
        <Link href={`/sensiz?once=${items.at(-1)!.id}`} className="btn mt-5 w-full bg-surface text-ink">
          Daha eski paylaşımlar
        </Link>
      )}
      {before && (
        <Link href="/sensiz" className="mt-3 block text-center text-sm font-semibold text-brand">
          ↑ En yeniye dön
        </Link>
      )}
    </>
  );
}
