"use client";

import { useState, useTransition } from "react";
import { nudgePartnerAction } from "@/app/actions";

export default function NudgeButton({ name }: { name: string }) {
  const [busy, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="mt-3">
      <button
        className="btn w-full bg-brand-soft text-brand-dark"
        disabled={busy || !!msg}
        onClick={() =>
          start(async () => {
            const r = await nudgePartnerAction();
            setMsg(r.sent > 0 ? `${name} dürtüldü 👋` : `${name} henüz bildirimleri açmamış 😕`);
          })
        }
      >
        {msg ?? `👋 Dürt: ${name}`}
      </button>
    </div>
  );
}
