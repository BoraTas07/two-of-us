"use client";

import { useActionState, useState } from "react";
import { changePinAction, updateProfileAction } from "@/app/actions";
import { AVATAR_EMOJIS } from "@/lib/emojis";
import { ColorPicker, EmojiPicker } from "./pickers";

function Status({ state }: { state: { error?: string; ok?: string } | undefined }) {
  if (state?.error) return <p className="animate-pop font-bold text-danger">{state.error}</p>;
  if (state?.ok) return <p className="animate-pop font-bold text-sage-ink">{state.ok}</p>;
  return null;
}

export function ProfileForm({ initial }: { initial: { name: string; emoji: string; color: string } }) {
  const [state, action, pending] = useActionState(updateProfileAction, undefined);
  const [emoji, setEmoji] = useState(initial.emoji);
  const [color, setColor] = useState(initial.color);
  return (
    <form action={action} className="space-y-3">
      <input className="input" name="name" defaultValue={initial.name} maxLength={24} required />
      <EmojiPicker name="emoji" options={AVATAR_EMOJIS} value={emoji} onChange={setEmoji} color={color} />
      <ColorPicker name="color" value={color} onChange={setColor} />
      <Status state={state} />
      <button className="btn w-full bg-brand text-white" disabled={pending}>
        Kaydet
      </button>
    </form>
  );
}

export function PinForm() {
  const [state, action, pending] = useActionState(changePinAction, undefined);
  return (
    <form action={action} className="space-y-3">
      <input className="input" name="old" type="password" inputMode="numeric" placeholder="Mevcut PIN" required autoComplete="current-password" />
      <input
        className="input"
        name="new"
        type="password"
        inputMode="numeric"
        pattern="\d{4,6}"
        maxLength={6}
        placeholder="Yeni PIN (4-6 rakam)"
        required
        autoComplete="new-password"
      />
      <Status state={state} />
      <button className="btn w-full bg-surface text-ink" disabled={pending}>
        PIN&apos;i değiştir
      </button>
    </form>
  );
}
