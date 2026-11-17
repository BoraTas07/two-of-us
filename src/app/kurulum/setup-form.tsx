"use client";

import { useActionState, useState } from "react";
import { setupAction } from "@/app/actions";
import { ColorPicker, EmojiPicker } from "@/components/pickers";
import { AVATAR_EMOJIS } from "@/lib/emojis";

function Person({ i, defaults }: { i: number; defaults: { emoji: string; color: string } }) {
  const [emoji, setEmoji] = useState(defaults.emoji);
  const [color, setColor] = useState(defaults.color);
  return (
    <fieldset className="card space-y-3 p-4">
      <legend className="sr-only">{i + 1}. kişi</legend>
      <div className="text-sm font-black tracking-wide text-muted uppercase">{i === 0 ? "Sen" : "Partnerin"}</div>
      <input className="input" name={`name${i}`} placeholder="Adı" maxLength={24} required autoComplete="off" />
      <EmojiPicker name={`emoji${i}`} options={AVATAR_EMOJIS} value={emoji} onChange={setEmoji} color={color} />
      <ColorPicker name={`color${i}`} value={color} onChange={setColor} />
      <input
        className="input tracking-[0.5em] placeholder:tracking-normal"
        name={`pin${i}`}
        placeholder="PIN (4-6 rakam)"
        inputMode="numeric"
        pattern="\d{4,6}"
        maxLength={6}
        required
        type="password"
        autoComplete="new-password"
      />
    </fieldset>
  );
}

export default function SetupForm() {
  const [state, action, pending] = useActionState(setupAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <Person i={0} defaults={{ emoji: "🦊", color: "clay" }} />
      <Person i={1} defaults={{ emoji: "🐼", color: "teal" }} />
      {state?.error && <p className="animate-pop rounded-xl bg-danger-soft p-3 font-bold text-danger">{state.error}</p>}
      <button className="btn w-full bg-brand text-lg text-white" disabled={pending}>
        {pending ? "Hazırlanıyor..." : "Başlayalım 🚀"}
      </button>
    </form>
  );
}
