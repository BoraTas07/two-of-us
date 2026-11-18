import Hero from "@/components/hero";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { listDreams } from "@/lib/dreams";
import { DreamCard, DreamForm } from "@/components/dreams";
import { Empty } from "@/components/ui";

export const metadata = { title: "Birlikte yapacaklarımız — Two Of Us" };

export default async function DreamsPage() {
  await connection();
  const { me, partner } = await requireUser();
  const dreams = await listDreams();
  const open = dreams.filter((d) => !d.done_at);
  const done = dreams.filter((d) => d.done_at);
  const P = (p: typeof me) => ({ id: p.id, name: p.name, emoji: p.emoji });

  return (
    <>
      <Hero back="/biz" title="Birlikte yapacaklarımız" desc="Hayal listeniz. Gerçekleşince fotoğrafla işaretleyin; ikiniz de havuç kazanırsınız." />

      <div className="mt-4">
        <DreamForm />
      </div>

      <h2 className="mt-6 mb-2 px-1 text-lg">🌟 Sırada ({open.length})</h2>
      {open.length ? (
        <div className="space-y-2">
          {open.map((d) => (
            <DreamCard key={d.id} d={d} me={P(me)} partner={P(partner)} />
          ))}
        </div>
      ) : (
        <Empty emoji="🎈">Henüz hayal yok. İlkini ekleyin!</Empty>
      )}

      {done.length > 0 && (
        <>
          <h2 className="mt-6 mb-2 px-1 text-lg">✨ Gerçekleşenler ({done.length})</h2>
          <div className="space-y-3">
            {done.map((d) => (
              <DreamCard key={d.id} d={d} me={P(me)} partner={P(partner)} />
            ))}
          </div>
        </>
      )}
    </>
  );
}
