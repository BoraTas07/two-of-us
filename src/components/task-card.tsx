"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { completeAction, completeSubtaskAction, undoAction, undoSubtaskAction } from "@/app/actions";
import { formatRelative } from "@/lib/time";
import { ablative, dative } from "@/lib/tr";
import type { SubItem, TaskItem } from "@/lib/views";
import { celebrate } from "./celebration";
import { Icon } from "./icons";
import { PhotoSheet } from "./photo";

type Person = { id: number; name: string; emoji: string; color: string };

export default function TaskCard({
  item,
  me,
  partner,
  today,
  subsOpen = true,
  variant = "card",
}: {
  item: TaskItem;
  me: Person;
  partner: Person;
  today: string;
  /** Alt görev listesi açık başlasın mı */
  subsOpen?: boolean;
  /** "row": kart çerçevesi olmadan, bir listenin satırı olarak */
  variant?: "card" | "row";
}) {
  const [isPending, start] = useTransition();
  const [done, setDone] = useOptimistic(item.done);
  const [error, setError] = useState<string | null>(null);
  // Kanıt fotoğrafı penceresi: açık olduğu tamamlama kaydı
  const [photoFor, setPhotoFor] = useState<number | null>(null);
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

  // Sade bilgi satırı: "37 havuç · her gün · 20:00" + gerekiyorsa küçük renkli etiketler
  const facts: string[] = [];
  facts.push(`${subCount ? subTotal : item.xp} havuç`);
  if (item.shared) facts.push("birlikte");
  if (item.kind === "habit") facts.push(`🔥 ${item.habitStreak} gün`);
  if (item.kind !== "once" && item.repeatText) facts.push(item.repeatText.toLocaleLowerCase("tr"));
  if (item.kind === "once" && item.dueDate && !item.overdue) facts.push(formatRelative(item.dueDate, today));
  if (item.remindTime) facts.push(item.remindTime);
  if (item.requiresApproval && !item.shared) facts.push(item.requiresPhoto ? "onaylı · foto" : "onaylı");
  if (!item.shared && item.creatorId !== item.assigneeId && item.swap?.status !== "accepted")
    facts.push(item.creatorId === me.id ? "sen verdin" : `${partner.name} verdi`);
  if (subCount) facts.push(`${subDone}/${subCount} adım`);

  const tags: React.ReactNode[] = [];
  if (item.overdue) tags.push(<span key="o" className="text-danger">Gecikti</span>);
  if (item.objected) tags.push(<span key="x" className="text-xp-ink">⚖️ İtiraz var</span>);
  if (item.swap?.status === "accepted")
    tags.push(
      <span key="s" className="text-ice-ink">
        🔄 {item.swap.fromMe ? `${dative(partner.name)} devrettin` : `${ablative(partner.name)} devraldın`}
        {item.swap.bonus ? ` · +${item.swap.bonus} bonus` : ""}
      </span>,
    );
  else if (item.swap?.status === "pending") tags.push(<span key="s" className="text-ice-ink">🔄 Takas teklifi</span>);
  if (!item.canComplete && !done && item.blockedReason) tags.push(<span key="b">{item.blockedReason}</span>);

  // Soldaki daire: dokununca tamamla / (kendi tamamlamansa) geri al
  const ring = "flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full transition-colors";
  let check: React.ReactNode;
  if (done?.status === "approved") {
    check = (
      <button
        onClick={undo}
        disabled={isPending || !mineDone}
        className={`${ring} ${mineDone ? "bg-brand text-on-brand" : "bg-muted/40 text-surface"}`}
        aria-label={mineDone ? `${item.title}: tamamlandı, geri almak için dokun` : `${item.title}: ${doneBy?.name} bitirdi`}
        title={mineDone ? "Geri almak için dokun" : `${doneBy?.name} bitirdi`}
      >
        <Icon name="check" size={15} strokeWidth={2.4} />
      </button>
    );
  } else if (done?.status === "pending") {
    check = (
      <button
        onClick={undo}
        disabled={isPending || !mineDone}
        className={`${ring} border-[1.5px] border-xp text-xp-ink`}
        aria-label={`${item.title}: onay bekliyor`}
        title="Onay bekliyor"
      >
        <Icon name="clock" size={14} />
      </button>
    );
  } else if (item.canComplete) {
    check = (
      <button
        onClick={complete}
        disabled={isPending}
        aria-label={`${item.title} görevini tamamla`}
        className={`${ring} border-[1.5px] border-brand text-brand hover:bg-brand-soft active:scale-90`}
      />
    );
  } else {
    check = <span className={`${ring} border-[1.5px] border-dashed border-line`} aria-hidden />;
  }

  return (
    <div className={variant === "row" ? "py-2.5" : "card px-4 py-3"}>
      <div className="flex items-center gap-3">
        {check}
        <Link href={`/gorevler/${item.id}`} className="min-w-0 flex-1">
          <div className={`leading-snug ${done?.status === "approved" ? "text-muted line-through" : ""}`}>
            {item.emoji && item.emoji !== "✅" && <span className="mr-1">{item.emoji}</span>}
            {item.title}
          </div>
          <div className="mt-0.5 text-xs text-muted">
            {facts.join(" · ")}
            {tags.length > 0 && (
              <span className="ml-1.5 inline-flex flex-wrap gap-x-2 font-semibold">
                {tags}
              </span>
            )}
          </div>
        </Link>
        {done && !mineDone && doneBy && <span className="shrink-0 text-sm" title={`${doneBy.name} bitirdi`}>{doneBy.emoji}</span>}
        {!done && item.canComplete && subCount > 0 && subDone < subCount && (
          <button onClick={complete} disabled={isPending} className="shrink-0 text-xs font-semibold text-brand">
            Hepsini bitir
          </button>
        )}
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
              <button className="btn bg-brand px-3 py-1.5 text-xs text-on-brand" onClick={() => setPhotoFor(item.completionId)}>
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
          <summary className="cursor-pointer list-none pl-[38px] text-xs font-semibold text-muted">
            <span className="group-open:hidden">Adımları göster ▾</span>
            <span className="hidden group-open:inline">Adımları gizle ▴</span>
          </summary>
          <ul className="mt-1.5 space-y-1 pl-[30px]">
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
            <p className="mt-1.5 pl-[38px] text-xs font-semibold text-muted">
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
              ? "bg-brand text-on-brand"
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
