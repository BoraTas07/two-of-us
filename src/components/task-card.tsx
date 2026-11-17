"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { completeAction, undoAction } from "@/app/actions";
import { formatRelative } from "@/lib/time";
import { colorOf } from "@/lib/types";
import type { TaskItem } from "@/lib/views";
import { celebrate } from "./celebration";
import { CarrotChip } from "./ui";

type Person = { id: number; name: string; emoji: string; color: string };

export default function TaskCard({
  item,
  me,
  partner,
  today,
}: {
  item: TaskItem;
  me: Person;
  partner: Person;
  today: string;
}) {
  const [isPending, start] = useTransition();
  const [done, setDone] = useOptimistic(item.done);
  const [error, setError] = useState<string | null>(null);
  const c = colorOf(item.shared ? "berry" : item.assigneeId === me.id ? me.color : partner.color);
  const mineDone = !!done && done.byId === me.id;
  const doneBy = done ? (done.byId === me.id ? me : partner) : null;

  function complete(e: React.MouseEvent<HTMLButtonElement>) {
    if (isPending) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = { x: rect.left + rect.width / 2, y: rect.top };
    setError(null);
    start(async () => {
      setDone({ status: item.requiresApproval && !item.shared ? "pending" : "approved", byId: me.id });
      const r = await completeAction(item.id);
      if ("error" in r) {
        setError(r.error);
        return;
      }
      if (r.status === "already") return;
      celebrate({
        ...pos,
        xp: r.xp,
        pending: r.status === "pending",
        levelUp: r.levelUp,
        badges: r.badges,
        goalReached: r.goalReached,
      });
    });
  }

  function undo() {
    if (isPending || !mineDone) return;
    if (!confirm(`"${item.title}" tamamlanmamış olarak işaretlensin mi? Kazanılan havuçlar geri alınır.`)) return;
    setError(null);
    start(async () => {
      setDone(null);
      await undoAction(item.id);
    });
  }

  const meta: React.ReactNode[] = [];
  if (item.overdue) meta.push(<span key="o" className="chip bg-danger-soft text-danger">Gecikti</span>);
  if (item.kind === "habit")
    meta.push(
      <span key="h" className="chip bg-brand-soft text-brand-dark">
        🔥 {item.habitStreak} gün
      </span>,
    );
  if (item.kind !== "once" && item.repeatText)
    meta.push(<span key="r" className="chip bg-line text-muted">🔁 {item.repeatText}</span>);
  if (item.kind === "once" && item.dueDate && !item.overdue)
    meta.push(<span key="d" className="chip bg-line text-muted">📅 {formatRelative(item.dueDate, today)}</span>);
  if (item.remindTime) meta.push(<span key="t" className="chip bg-ice-soft text-ice-ink">⏰ {item.remindTime}</span>);
  if (item.requiresApproval && !item.shared)
    meta.push(<span key="a" className="chip bg-line text-ink">🤝 Onaylı</span>);
  if (!item.shared && item.creatorId !== item.assigneeId) {
    const giver = item.creatorId === me.id ? me : partner;
    meta.push(
      <span key="g" className="chip bg-line text-muted">
        {giver.emoji} {giver.id === me.id ? "Sen verdin" : `${giver.name} verdi`}
      </span>,
    );
  }

  let action: React.ReactNode;
  if (done?.status === "approved") {
    action = mineDone ? (
      <button onClick={undo} disabled={isPending} className="btn bg-sage-soft px-3 py-2 text-sm text-sage-ink" title="Geri almak için dokun">
        ✓ Bitti
      </button>
    ) : (
      <span className="chip bg-sage-soft px-2.5 py-1.5 text-sage-ink">
        ✓ {doneBy?.emoji} bitirdi
      </span>
    );
  } else if (done?.status === "pending") {
    action = mineDone ? (
      <button onClick={undo} disabled={isPending} className="btn bg-warn-soft px-3 py-2 text-sm text-xp-ink" title="Geri almak için dokun">
        ⏳ Onayda
      </button>
    ) : (
      <span className="chip bg-warn-soft px-2.5 py-1.5 text-xp-ink">⏳ Onayda</span>
    );
  } else if (item.canComplete) {
    action = (
      <button
        onClick={complete}
        disabled={isPending}
        aria-label={`${item.title} görevini tamamla`}
        className="btn bg-brand px-3.5 py-2 text-sm text-white"
      >
        Tamamla
      </button>
    );
  } else {
    action = <span className="max-w-24 text-right text-xs leading-tight font-semibold text-muted">{item.blockedReason}</span>;
  }

  return (
    <div className={`card p-3 transition-opacity ${done?.status === "approved" ? "opacity-75" : ""}`}>
      <div className="flex items-center gap-3">
        <Link
          href={`/gorevler/${item.id}`}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl"
          style={{ background: c.soft, boxShadow: `inset 0 0 0 1.5px ${c.bg}40` }}
          aria-hidden
          tabIndex={-1}
        >
          {item.emoji}
        </Link>
        <Link href={`/gorevler/${item.id}`} className="min-w-0 flex-1">
          <div className={`leading-tight font-extrabold ${done?.status === "approved" ? "text-muted line-through" : ""}`}>
            {item.title}
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            <CarrotChip n={item.xp} faded={!!done} />
            {meta}
          </div>
        </Link>
        <div className="shrink-0">{action}</div>
      </div>
      {error && <p className="animate-pop mt-2 text-sm font-semibold text-danger">{error}</p>}
    </div>
  );
}
