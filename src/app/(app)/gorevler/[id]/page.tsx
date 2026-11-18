import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getTask, loadSubtasks } from "@/lib/game";
import { formatShort, todayStr, weekday } from "@/lib/time";
import TaskForm from "@/components/task-form";
import TaskCard from "@/components/task-card";
import { taskItemView } from "@/lib/views";
import { objectionsFor } from "@/lib/objections";
import ObjectionPanel from "@/components/objection-panel";
import { SwapPanel } from "@/components/swap";
import { balanceOf } from "@/lib/shop";

export const metadata = { title: "Görev — Two Of Us" };

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
  const item = await taskItemView(me, partner, t.id);
  const subs = await loadSubtasks(t.id);
  const objections = await objectionsFor(t.id);
  const people = {
    me: { id: me.id, name: me.name, emoji: me.emoji, color: me.color },
    partner: { id: partner.id, name: partner.name, emoji: partner.emoji, color: partner.color },
  };

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

      {item && (
        <div className="mb-5">
          <TaskCard item={item} me={people.me} partner={people.partner} today={today} />
          {t.notes && <p className="card mt-2 p-4 text-sm whitespace-pre-wrap">{t.notes}</p>}
          {(item.swap ||
            (!item.shared && item.assigneeId === me.id && !item.done && item.canComplete)) && (
            <div className="mt-2">
              <SwapPanel
                taskId={t.id}
                xp={t.xp}
                partnerName={partner.name}
                balance={await balanceOf(me.id)}
                swap={item.swap}
              />
            </div>
          )}
          <div className="mt-2">
            <ObjectionPanel
              taskId={t.id}
              isCreator={t.creator_id === me.id}
              currentXp={t.xp}
              subtasks={subs.map((x) => ({ id: x.id, title: x.title, xp: x.xp }))}
              open={objections.open}
              last={objections.last}
              meId={me.id}
              partnerName={partner.name}
            />
          </div>
        </div>
      )}

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

      {t.creator_id !== me.id ? (
        <p className="card p-4 text-sm font-semibold text-muted">
          🔒 Bu görevi {partner.name} oluşturdu. Sadece o değiştirebilir ya da silebilir; katılmıyorsan yukarıdan
          itiraz edebilirsin.
        </p>
      ) : (
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
          photo: t.requires_photo,
          due: t.due_date ?? "",
          repeat: t.repeat ?? "daily",
          days: t.repeat_days.length ? t.repeat_days : [weekday(today)],
          dom: t.repeat_dom ?? Number(today.slice(8, 10)),
          remind: t.remind_time ?? "",
          subtasks: subs.map((x) => ({ id: x.id, key: `s${x.id}`, title: x.title, xp: x.xp })),
        }}
      />
      )}
    </>
  );
}
