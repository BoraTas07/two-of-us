"use client";

import { useActionState, useState, useTransition } from "react";
import { objectAction, resolveObjectionAction, withdrawObjectionAction } from "@/app/actions";
import type { ObjectionView } from "@/lib/objections";
import CarrotSlider from "./carrot-slider";
import { Segmented } from "./pickers";

function describe(o: ObjectionView) {
  return o.kind === "amount" ? `Havuç: ${o.old_xp} → ${o.proposed_xp} 🥕 önerisi` : "Görevin kendisine itiraz";
}

export default function ObjectionPanel({
  taskId,
  isCreator,
  currentXp,
  hasSubtasks,
  open,
  last,
  meId,
  partnerName,
}: {
  taskId: number;
  isCreator: boolean;
  currentXp: number;
  hasSubtasks: boolean;
  open: ObjectionView | null;
  last: ObjectionView | null;
  meId: number;
  partnerName: string;
}) {
  const [showForm, setShowForm] = useState(false);
  const [kind, setKind] = useState<"task" | "amount">("task");
  const [proposed, setProposed] = useState(currentXp);
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const [state, action, pending] = useActionState(objectAction, undefined);

  const lastLine = last && (
    <p className="px-1 text-xs font-semibold text-muted">
      Son itiraz ({describe(last)}): {last.status === "kabul" ? "kabul edildi ✅" : "reddedildi ❌"}
      {last.response ? ` — "${last.response}"` : ""}
    </p>
  );

  // Açık itiraz var
  if (open) {
    const mine = open.by_id === meId;
    return (
      <div className="space-y-2">
        <div className="card space-y-2 bg-warn-soft p-4">
          <div className="font-black">⚖️ {mine ? "İtirazın cevap bekliyor" : `${partnerName} itiraz etti`}</div>
          <div className="text-sm font-semibold">{describe(open)}</div>
          {open.reason && <p className="rounded-xl bg-surface p-3 text-sm">&ldquo;{open.reason}&rdquo;</p>}

          {mine && (
            <button
              className="btn w-full bg-surface text-sm text-muted"
              disabled={busy}
              onClick={() => start(async () => void (await withdrawObjectionAction(open.id)))}
            >
              İtirazı geri çek
            </button>
          )}

          {!mine && isCreator && (
            <>
              <input
                className="input text-sm"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Not ekle (isteğe bağlı)"
                maxLength={300}
              />
              <p className="text-xs font-semibold text-muted">
                {open.kind === "task"
                  ? "Kabul edersen görev kaldırılır."
                  : `Kabul edersen havuç ${open.proposed_xp} 🥕 olur (sonraki tamamlamalar için).`}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  className="btn bg-surface text-muted"
                  disabled={busy}
                  onClick={() =>
                    start(async () => {
                      const r = await resolveObjectionAction(open.id, false, note);
                      if ("error" in r && r.error) setErr(r.error);
                    })
                  }
                >
                  Reddet
                </button>
                <button
                  className="btn bg-sage text-white"
                  disabled={busy}
                  onClick={() =>
                    start(async () => {
                      const r = await resolveObjectionAction(open.id, true, note);
                      if ("error" in r && r.error) setErr(r.error);
                    })
                  }
                >
                  Kabul et
                </button>
              </div>
            </>
          )}
          {err && <p className="text-sm font-semibold text-danger">{err}</p>}
        </div>
        {lastLine}
      </div>
    );
  }

  if (isCreator) return lastLine || null;

  return (
    <div className="space-y-2">
      {state?.ok ? (
        <p className="animate-pop card p-3 text-sm font-semibold text-sage-ink">{state.ok}</p>
      ) : !showForm ? (
        <button className="btn w-full bg-surface text-ink" onClick={() => setShowForm(true)}>
          ⚖️ İtiraz et
        </button>
      ) : (
        <form action={action} className="card animate-pop space-y-3 p-4">
          <input type="hidden" name="taskId" value={taskId} />
          <div className="flex items-center justify-between">
            <div className="font-black">⚖️ İtiraz et</div>
            <button type="button" className="text-sm text-muted" onClick={() => setShowForm(false)}>
              Vazgeç
            </button>
          </div>
          <Segmented
            name="kind"
            value={kind}
            onChange={setKind}
            options={[
              { value: "task", label: "Görevin kendisine" },
              { value: "amount", label: "Havuç miktarına" },
            ]}
          />
          {kind === "amount" && (
            <div>
              <p className="mb-1.5 px-1 text-sm font-semibold text-muted">
                Şu an {currentXp} 🥕. Sence kaç olmalı?
              </p>
              <CarrotSlider name="proposed" value={proposed} onChange={setProposed} allowZero={hasSubtasks} />
            </div>
          )}
          <textarea
            className="input min-h-20 text-sm"
            name="reason"
            maxLength={300}
            placeholder={kind === "task" ? "Neden bu görev olmamalı ya da değişmeli?" : "Neden? (isteğe bağlı)"}
            required={kind === "task"}
          />
          {state?.error && <p className="text-sm font-semibold text-danger">{state.error}</p>}
          <button className="btn w-full bg-brand text-white" disabled={pending}>
            {pending ? "Gönderiliyor..." : `${partnerName} için gönder`}
          </button>
        </form>
      )}
      {lastLine}
    </div>
  );
}
