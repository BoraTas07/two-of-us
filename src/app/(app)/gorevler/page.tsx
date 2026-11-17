import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { allTasksView, type TaskItem } from "@/lib/views";
import { Empty, SectionTitle } from "@/components/ui";
import TaskCard from "@/components/task-card";
import { formatRelative } from "@/lib/time";

export const metadata = { title: "Görevler — Two Of Us" };

// "Benim" varsayılan sekme: yalın /gorevler adresi onu açar
const FILTERS = [
  { key: "ben", label: "Benim" },
  { key: "partner", label: "Partnerin" },
  { key: "ortak", label: "Ortak" },
  { key: "hepsi", label: "Hepsi" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ kim?: string }> }) {
  const { me, partner } = await requireUser();
  const raw = (await searchParams).kim;
  const kim: FilterKey = FILTERS.some((f) => f.key === raw) ? (raw as FilterKey) : "ben";
  const v = await allTasksView(me, partner);
  const people = {
    me: { id: me.id, name: me.name, emoji: me.emoji, color: me.color },
    partner: { id: partner.id, name: partner.name, emoji: partner.emoji, color: partner.color },
  };

  const pick = (i: TaskItem) =>
    kim === "ben"
      ? i.assigneeId === me.id
      : kim === "partner"
        ? i.assigneeId === partner.id
        : kim === "ortak"
          ? i.shared
          : true;
  const items = v.items.filter(pick);
  const groups: { title: string; items: TaskItem[]; empty: string }[] = [
    { title: "🌱 Alışkanlıklar", items: items.filter((i) => i.kind === "habit"), empty: "Henüz alışkanlık yok" },
    { title: "🔁 Tekrarlayan işler", items: items.filter((i) => i.kind === "recurring"), empty: "Tekrarlayan iş yok" },
    {
      title: "📌 Tek seferlik",
      items: items
        .filter((i) => i.kind === "once")
        .sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999")),
      empty: "Bekleyen tek seferlik görev yok",
    },
  ];

  return (
    <>
      <div className="mt-3 flex items-center justify-between px-1">
        <h1 className="text-2xl font-black">Görevler</h1>
        <Link href="/gorevler/yeni" className="btn bg-brand py-2 text-sm text-white">
          + Yeni
        </Link>
      </div>
      <nav className="mt-3 flex gap-1.5 overflow-x-auto rounded-2xl bg-line/60 p-1.5">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === "ben" ? "/gorevler" : `/gorevler?kim=${f.key}`}
            className={`flex-1 rounded-xl px-2 py-2 text-center text-sm font-extrabold whitespace-nowrap ${
              kim === f.key ? "bg-surface text-brand shadow-[0_3px_0_var(--line)]" : "text-muted"
            }`}
          >
            {f.key === "partner" ? partner.name : f.label}
          </Link>
        ))}
      </nav>

      {v.items.length === 0 ? (
        <div className="mt-6">
          <Empty emoji="📝">
            Henüz görev yok.{" "}
            <Link href="/gorevler/yeni" className="text-brand underline">
              İlk görevi ekle
            </Link>
          </Empty>
        </div>
      ) : kim === "ben" && items.length === 0 ? (
        <div className="mt-6">
          <Empty emoji="🌤️">
            Sana ait görev yok.{" "}
            <Link href="/gorevler?kim=hepsi" className="text-brand underline">
              Hepsini gör
            </Link>
          </Empty>
        </div>
      ) : (
        groups.map((g) => (
          <section key={g.title}>
            <SectionTitle right={<span className="text-sm font-bold text-muted">{g.items.length}</span>}>
              {g.title}
            </SectionTitle>
            {g.items.length ? (
              <div className="space-y-2">
                {g.items.map((t) => (
                  <TaskCard key={t.id} item={t} me={people.me} partner={people.partner} today={v.today} subsOpen={false} />
                ))}
              </div>
            ) : (
              <p className="px-1 text-sm font-semibold text-muted">{g.empty}</p>
            )}
          </section>
        ))
      )}

      {v.doneOnce.length > 0 && (
        <details className="mt-6">
          <summary className="cursor-pointer px-1 text-lg font-black">✅ Biten tek seferlik görevler</summary>
          <ul className="card mt-2 divide-y-2 divide-line">
            {v.doneOnce.map((d) => (
              <li key={d.id} className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold">
                <span>{d.emoji}</span>
                <span className="flex-1 text-muted line-through">{d.title}</span>
                <span>{d.profile_id === me.id ? me.emoji : partner.emoji}</span>
                <span className="text-xs text-muted">{formatRelative(d.day, v.today)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}
