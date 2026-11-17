"use client";

import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { completeAction, undoAction } from "@/app/actions";
import { formatRelative } from "@/lib/time";
import { colorOf } from "@/lib/types";
import type { TaskItem } from "@/lib/views";
import { celebrate } from "./celebration";
import { XpChip } from "./ui";

type Person = { id: number; name: string; emoji: string; color: string };

export default function TaskCard({
  item,
  me,
  partner,
  today,
  readOnly = false,
}: {
  item: TaskItem;
  me: Person;
  partner: Person;
  today: string;
  readOnly?: boolean;
}) {
  const [isPending, start] = useTransition();
  const [done, setDone] = useOptimistic(item.done);
  const c = colorOf(item.shared ? "berry" : item.assigneeId === me.id ? me.color : partner.color);
  const canUndo = done && done.byId === me.id && !readOnly;
  const doneBy = done && item.shared ? (done.byId === me.id ? me : partner) : null;

  function toggle(e: React.MouseEvent<HTMLButtonElement>) {
    if (readOnly || isPending) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = { x: rect.left + rect.width / 2, y: rect.top };
    start(async () => {
      if (done) {
        if (!canUndo) return;
        setDone(null);
        await undoAction(item.id);
        return;
      }
      setDone({ status: item.requiresApproval ? "pending" : "approved", byId: me.id });
      const r = await completeAction(item.id);
      if ("error" in r) {
        alert(r.error);
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

  const meta: React.ReactNode[] = [];
  if (item.overdue) meta.push(<span key="o" className="chip bg-danger-soft text-danger">⚠️ Gecikti</span>);
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
  if (item.requiresApproval) meta.push(<span key="a" className="chip bg-line text-ink">🤝 Onaylı</span>);
  if (!item.shared && item.creatorId !== item.assigneeId) {
    const giver = item.creatorId === me.id ? me : partner;
    meta.push(
      <span key="g" className="chip bg-line text-muted">
        {giver.emoji} {giver.id === me.id ? "Sen verdin" : `${giver.name} verdi`}
      </span>,
    );
  }

  return (
    <div
      className={`card flex items-center gap-3 p-3 transition-opacity ${done?.status === "approved" ? "opacity-70" : ""}`}
    >
      <button
        onClick={toggle}
        disabled={readOnly || (!!done && !canUndo)}
        aria-label={done ? (canUndo ? "Geri al" : "Tamamlandı") : `${item.title} görevini tamamla`}
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl font-black transition-all ${
          readOnly ? "cursor-default" : "active:scale-90"
        } ${done ? "animate-pop" : ""}`}
        style={
          done?.status === "approved"
            ? { background: "var(--sage)", color: "white" }
            : done?.status === "pending"
              ? { background: "var(--warn-soft)", boxShadow: "inset 0 0 0 1.5px var(--xp)" }
              : { background: c.soft, boxShadow: `inset 0 0 0 1.5px ${c.bg}55` }
        }
      >
        {done?.status === "approved" ? "✓" : done?.status === "pending" ? "⏳" : <span className="opacity-90">{item.emoji}</span>}
      </button>

      <Link href={`/gorevler/${item.id}`} className="min-w-0 flex-1">
        <div className={`font-extrabold leading-tight ${done?.status === "approved" ? "text-muted line-through" : ""}`}>
          {done ? `${item.emoji} ` : ""}
          {item.title}
        </div>
        <div className="mt-1 flex flex-wrap gap-1">
          <XpChip xp={item.xp} faded={!!done} />
          {meta}
          {doneBy && <span className="chip bg-sage-soft text-sage-ink">{doneBy.emoji} bitirdi</span>}
          {done?.status === "pending" && <span className="chip bg-xp-soft text-xp-ink">Onay bekliyor</span>}
        </div>
      </Link>
    </div>
  );
}
