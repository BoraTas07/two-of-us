"use client";

import { useState, useTransition } from "react";
import { setGoalAction } from "@/app/actions";

export default function GoalEditor({ target }: { target: number }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(target);
  const [busy, start] = useTransition();

  if (!open) {
    return (
      <button className="chip bg-line px-3 py-1.5 text-muted" onClick={() => setOpen(true)}>
        ✏️ Değiştir
      </button>
    );
  }
  return (
    <div className="flex items-center gap-1">
      <button type="button" className="btn bg-surface px-3 py-1 text-ink" onClick={() => setValue((v) => Math.max(50, v - 50))}>
        −
      </button>
      <span className="w-12 text-center font-black">{value}</span>
      <button type="button" className="btn bg-surface px-3 py-1 text-ink" onClick={() => setValue((v) => Math.min(5000, v + 50))}>
        +
      </button>
      <button
        className="btn bg-brand px-3 py-1 text-on-brand"
        disabled={busy}
        onClick={() =>
          start(async () => {
            await setGoalAction(value);
            setOpen(false);
          })
        }
      >
        ✓
      </button>
    </div>
  );
}
