import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getTask } from "@/lib/game";
import { formatShort, todayStr, weekday } from "@/lib/time";
import TaskForm from "@/components/task-form";

export const metadata = { title: "Görevi düzenle — Two Of Us" };

export default async function EditTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { me, partner } = await requireUser();
  const { id } = await params;
  const t = await getTask(Number(id));
  if (!t || t.archived) notFound();
  const today = todayStr();

  const history = await sql<{ occ_date: string; profile_id: number; status: string }[]>`
    select occ_date, profile_id, status from completions where task_id = ${t.id}
    order by occ_date desc limit 14`;
  const creator = t.creator_id === me.id ? "Sen" : partner.name;

  return (
    <>
      <div className="mt-3 mb-1 flex items-center gap-2 px-1">
        <Link href="/gorevler" className="text-2xl text-muted" aria-label="Geri">
          ←
        </Link>
        <h1 className="text-2xl font-black">
          {t.emoji} {t.title}
        </h1>
      </div>
      <p className="mb-4 px-1 text-sm font-semibold text-muted">{creator} oluşturdu</p>

      {history.length > 0 && (
        <div className="card mb-5 p-4">
          <div className="mb-2 font-black">Son yapılışlar</div>
          <div className="flex flex-wrap gap-1.5">
            {history.map((h) => (
              <span key={h.occ_date} className={`chip ${h.status === "pending" ? "bg-xp-soft text-xp-ink" : "bg-sage-soft text-sage-ink"}`}>
                {h.profile_id === me.id ? me.emoji : partner.emoji} {formatShort(h.occ_date)}
              </span>
            ))}
          </div>
        </div>
      )}

      <TaskForm
        partnerName={partner.name}
        today={today}
        initial={{
          id: t.id,
          title: t.title,
          emoji: t.emoji,
          notes: t.notes,
          kind: t.kind,
          who: t.assignee_id === null ? "both" : t.assignee_id === me.id ? "me" : "partner",
          xp: t.xp,
          approval: t.requires_approval,
          due: t.due_date ?? "",
          repeat: t.repeat ?? "daily",
          days: t.repeat_days.length ? t.repeat_days : [weekday(today)],
          dom: t.repeat_dom ?? Number(today.slice(8, 10)),
          remind: t.remind_time ?? "",
        }}
      />
    </>
  );
}
