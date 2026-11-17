"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { completeAction, completeSubtaskAction, undoAction, undoSubtaskAction } from "@/app/actions";
import { formatRelative } from "@/lib/time";
import { SHARED_COLOR, colorOf } from "@/lib/types";
import type { SubItem, TaskItem } from "@/lib/views";
import { celebrate } from "./celebration";
import { CarrotChip } from "./ui";
import { PhotoSheet } from "./photo";

type Person = { id: number; name: string; emoji: string; color: string };

export default function TaskCard({
  item,
  me,
  partner,
  today,
  subsOpen = true,
}: {
  item: TaskItem;
  me: Person;
  partner: Person;
  today: string;
  /** Alt görev listesi açık başlasın mı */
  subsOpen?: boolean;
}) {
  const [isPending, start] = useTransition();
  const [done, setDone] = useOptimistic(item.done);
  const [error, setError] = useState<string | null>(null);
  // Kanıt fotoğrafı penceresi: açık olduğu tamamlama kaydı
  const [photoFor, setPhotoFor] = useState<number | null>(null);
  const c = item.shared ? SHARED_COLOR : colorOf(item.assigneeId === me.id ? me.color : partner.color);
  const mineDone = !!done && done.byId === me.id;
  const doneBy = done ? (done.byId === me.id ? me : partner) : null;
  const subCount = item.subtasks.length;
  const subDone = item.subtasks.filter((x) => x.done).length;
  const subTotal = item.subtasks.reduce((n, x) => n + x.xp, 0) + item.xp;

  function complete(e: React.MouseEvent<HTMLButtonElement>) {
    if (isPending) return;
    if (subCount - subDone > 1 && !confirm(`Kalan ${subCount - subDone} adımın hepsi tamamlandı olarak işaretlensin mi?`)) return;
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
      if (r.status === "pending" && r.completionId) setPhotoFor(r.completionId);
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
  if (item.objected) meta.push(<span key="x" className="chip bg-warn-soft text-xp-ink">⚖️ İtiraz var</span>);
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
    meta.push(
      <span key="a" className="chip bg-line text-ink">
        🤝 Onaylı{item.requiresPhoto ? " · 📷" : ""}
      </span>,
    );
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
        {subCount > 0 && subDone < subCount ? "Hepsini bitir" : "Tamamla"}
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
            <CarrotChip n={subCount ? subTotal : item.xp} faded={!!done} />
            {subCount > 0 && (
              <span className={`chip ${subDone === subCount ? "bg-sage-soft text-sage-ink" : "bg-line text-ink"}`}>
                ☑ {subDone}/{subCount}
              </span>
            )}
            {meta}
          </div>
        </Link>
        <div className="shrink-0">{action}</div>
      </div>
      {done?.status === "pending" && mineDone && item.completionId && (
        <div className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-bg px-3 py-2 text-xs font-semibold">
          {item.photo === "viewed" ? (
            <span className="text-sage-ink">📷 Fotoğrafın görüldü ve silindi</span>
          ) : item.photo === "sent" ? (
            <span className="text-muted">📷 Fotoğraf gönderildi · henüz açılmadı</span>
          ) : (
            <>
              <span className={item.requiresPhoto ? "text-danger" : "text-muted"}>
                {item.requiresPhoto ? "📷 Bu görev fotoğraf istiyor" : "📷 Kanıt fotoğrafı ekleyebilirsin"}
              </span>
              <button className="btn bg-brand px-3 py-1.5 text-xs text-white" onClick={() => setPhotoFor(item.completionId)}>
                Fotoğraf ekle
              </button>
            </>
          )}
        </div>
      )}
      {photoFor && (
        <PhotoSheet
          completionId={photoFor}
          title={item.title}
          required={item.requiresPhoto}
          onClose={() => setPhotoFor(null)}
        />
      )}
      {subCount > 0 && (
        <details className="group mt-2" open={subsOpen}>
          <summary className="cursor-pointer list-none px-1 text-xs font-semibold text-muted">
            <span className="group-open:hidden">Adımları göster ▾</span>
            <span className="hidden group-open:inline">Adımları gizle ▴</span>
          </summary>
          <ul className="mt-1.5 space-y-1">
            {item.subtasks.map((x) => (
              <SubRow
                key={x.id}
                sub={x}
                me={me}
                partner={partner}
                canCheck={item.canComplete}
                needsApproval={item.requiresApproval && !item.shared}
                onPending={(id) => setPhotoFor(id)}
                blocked={item.blockedReason}
                onError={setError}
              />
            ))}
          </ul>
          {item.xp > 0 && (
            <p className="mt-1.5 px-1 text-xs font-semibold text-muted">
              Hepsi bitince +{item.xp} 🥕 bonus{item.requiresApproval && !item.shared ? " · havuçlar onaydan sonra gelir" : ""}
            </p>
          )}
        </details>
      )}
      {error && <p className="animate-pop mt-2 text-sm font-semibold text-danger">{error}</p>}
    </div>
  );
}

function SubRow({
  sub,
  me,
  partner,
  canCheck,
  needsApproval,
  blocked,
  onError,
  onPending,
}: {
  sub: SubItem;
  me: Person;
  partner: Person;
  canCheck: boolean;
  needsApproval: boolean;
  onPending: (completionId: number) => void;
  blocked: string | null;
  onError: (e: string | null) => void;
}) {
  const [busy, start] = useTransition();
  const [done, setDone] = useOptimistic(sub.done);
  const mine = !!done && done.byId === me.id;
  const who = done ? (done.byId === me.id ? me : partner) : null;
  const clickable = done ? mine : canCheck;

  function toggle(e: React.MouseEvent<HTMLButtonElement>) {
    if (busy || !clickable) return;
    const rect = e.currentTarget.getBoundingClientRect();
    onError(null);
    start(async () => {
      if (done) {
        setDone(null);
        await undoSubtaskAction(sub.id);
        return;
      }
      setDone({ status: needsApproval ? "pending" : "approved", byId: me.id });
      const r = await completeSubtaskAction(sub.id);
      if ("error" in r) {
        onError(r.error);
        return;
      }
      if (r.status === "already") return;
      celebrate({
        x: rect.left + rect.width / 2,
        y: rect.top,
        xp: r.xp,
        pending: r.status === "pending",
        quiet: !r.parentDone,
        levelUp: r.levelUp,
        badges: r.badges,
        goalReached: r.goalReached,
      });
      if (r.parentDone && r.status === "pending" && r.completionId) onPending(r.completionId);
    });
  }

  return (
    <li>
      <button
        type="button"
        onClick={toggle}
        disabled={busy || !clickable}
        title={!clickable && !done ? (blocked ?? undefined) : undefined}
        aria-pressed={!!done}
        aria-label={done ? `${sub.title} (tamamlandı${mine ? ", geri almak için dokun" : ""})` : `${sub.title} adımını tamamla`}
        className="flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-bg disabled:cursor-default"
      >
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black ${
            done?.status === "approved"
              ? "bg-sage text-white"
              : done
                ? "bg-warn-soft text-xp-ink ring-1 ring-xp"
                : "ring-[1.5px] ring-line"
          }`}
          aria-hidden
        >
          {done?.status === "approved" ? "✓" : done ? "⏳" : ""}
        </span>
        <span className={`flex-1 text-sm font-semibold ${done ? "text-muted line-through" : ""}`}>{sub.title}</span>
        {who && who.id !== me.id && <span className="text-xs">{who.emoji}</span>}
        <span className={`text-xs font-semibold ${done ? "text-muted" : "text-xp-ink"}`}>🥕 {sub.xp}</span>
      </button>
    </li>
  );
}
