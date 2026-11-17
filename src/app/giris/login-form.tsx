"use client";

import { useActionState, useState } from "react";
import { loginAction } from "@/app/actions";
import { Avatar } from "@/components/ui";
import { colorOf } from "@/lib/types";

type P = { id: number; name: string; emoji: string; color: string };

export default function LoginForm({ profiles }: { profiles: P[] }) {
  const [selected, setSelected] = useState<P | null>(null);
  const [pin, setPin] = useState("");
  const [state, action, pending] = useActionState(async (prev: Parameters<typeof loginAction>[0], fd: FormData) => {
    const r = await loginAction(prev, fd);
    if (r?.error) setPin("");
    return r;
  }, undefined);

  if (!selected) {
    return (
      <div className="grid grid-cols-2 gap-4">
        {profiles.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelected(p)}
            className="card flex flex-col items-center gap-2 py-6 transition-transform active:translate-y-1"
          >
            <Avatar emoji={p.emoji} color={p.color} size={84} />
            <span className="text-lg font-black">{p.name}</span>
          </button>
        ))}
      </div>
    );
  }

  const c = colorOf(selected.color);
  const press = (d: string) => {
    if (pending) return;
    setPin((prev) => (prev + d).slice(0, 6));
  };

  return (
    <form action={action} className="flex flex-col items-center">
      <input type="hidden" name="profileId" value={selected.id} />
      <input type="hidden" name="pin" value={pin} />
      <Avatar emoji={selected.emoji} color={selected.color} size={84} ring />
      <div className="mt-3 text-xl font-black">Merhaba {selected.name}!</div>
      <div className={`mt-4 flex h-6 gap-3 ${state?.error ? "animate-wiggle" : ""}`} aria-label="PIN">
        {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
          <span
            key={i}
            className="h-4 w-4 rounded-full transition-colors"
            style={{ background: i < pin.length ? c.bg : "var(--line)" }}
          />
        ))}
      </div>
      <p className="h-6 font-bold text-danger">{state?.error}</p>
      <div className="mt-2 grid w-full max-w-xs grid-cols-3 gap-3">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button type="button" key={d} onClick={() => press(d)} className="btn bg-surface py-4 text-2xl text-ink">
            {d}
          </button>
        ))}
        <button type="button" onClick={() => setSelected(null)} className="btn border-b-0 bg-transparent text-sm text-muted">
          ← Geri
        </button>
        <button type="button" onClick={() => press("0")} className="btn bg-surface py-4 text-2xl text-ink">
          0
        </button>
        <button type="button" onClick={() => setPin((prev) => prev.slice(0, -1))} className="btn border-b-0 bg-transparent text-xl text-muted" aria-label="Sil">
          ⌫
        </button>
      </div>
      <button
        className="btn mt-5 w-full max-w-xs text-lg text-white"
        style={{ background: c.bg }}
        disabled={pin.length < 4 || pending}
      >
        {pending ? "..." : "Giriş yap"}
      </button>
    </form>
  );
}
