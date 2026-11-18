"use client";

import { useState, useTransition } from "react";
import { setAnniversaryAction, setBirthdayAction, setDecorAction, setThemeAction } from "@/app/actions";
import { THEMES, THEME_ORDER, type ThemeKey } from "@/lib/themes";

export default function ThemeSettings({
  choice,
  autoKey,
  decor,
  birthday,
  anniversary,
  partnerName,
}: {
  choice: string;
  autoKey: ThemeKey;
  decor: boolean;
  birthday: string | null;
  anniversary: string | null;
  partnerName: string;
}) {
  const [sel, setSel] = useState(choice);
  const [busy, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const auto = THEMES[autoKey];

  const choose = (key: string) => {
    setSel(key);
    // Anında önizle; sunucu kaydedince süslemeler de değişir
    document.documentElement.setAttribute("data-theme", key === "auto" ? autoKey : key);
    start(async () => void (await setThemeAction(key)));
  };

  const saveDate = (fn: typeof setBirthdayAction, v: string, ok: string) =>
    start(async () => {
      const r = await fn(v);
      setMsg(r && "error" in r ? (r.error ?? null) : ok);
    });

  const swatch = (k: string, label: string, sub: string) => {
    const t = THEMES[k === "auto" ? autoKey : (k as ThemeKey)];
    const active = sel === k;
    return (
      <button
        key={k}
        type="button"
        onClick={() => choose(k)}
        aria-pressed={active}
        disabled={busy && !active}
        className={`flex items-center gap-2.5 rounded-2xl border p-2.5 text-left transition-transform active:scale-95 ${
          active ? "border-brand ring-2 ring-brand" : "border-line"
        }`}
        style={{ background: t.bg }}
      >
        <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full" style={{ background: t.brand }} aria-hidden>
          <span className="absolute right-0 bottom-0 h-4 w-4 rounded-tl-full" style={{ background: t.accent }} />
        </span>
        <span className="min-w-0" style={{ color: t.key === "gece" ? "#efe7dd" : "#3b332d" }}>
          <span className="block text-sm leading-tight font-black">
            {k === "auto" ? "✨" : t.emoji} {label}
          </span>
          <span className="block truncate text-[11px] font-semibold opacity-70">{sub}</span>
        </span>
      </button>
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          {swatch("auto", "Otomatik (önerilen)", `Mevsime ve özel günlere göre · şu an ${auto.emoji} ${auto.name}`)}
        </div>
        {THEME_ORDER.map((k) => swatch(k, THEMES[k].name, THEMES[k].desc))}
      </div>

      <label className="flex items-center justify-between gap-3 rounded-2xl bg-bg px-3 py-2.5">
        <span className="text-sm font-semibold">
          <b className="font-black">Süslemeler</b>
          <span className="block text-xs text-muted">Kar, yaprak, kalp, dalga… (pil dostu, istersen kapat)</span>
        </span>
        <input
          type="checkbox"
          className="h-5 w-5 accent-[var(--brand)]"
          defaultChecked={decor}
          onChange={(e) => start(async () => void (await setDecorAction(e.target.checked)))}
        />
      </label>

      <div className="rounded-2xl bg-bg p-3">
        <div className="text-sm font-black">🎂 Özel günler</div>
        <p className="mt-0.5 text-xs font-semibold text-muted">
          Otomatik temada bu günlerde uygulama kutlama moduna geçer.
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <label className="text-xs font-bold text-muted">
            Doğum günün
            <input
              type="date"
              className="input mt-1 px-2 py-2 text-sm"
              defaultValue={birthday ?? ""}
              onChange={(e) => saveDate(setBirthdayAction, e.target.value, "Doğum günün kaydedildi 🎂")}
            />
          </label>
          <label className="text-xs font-bold text-muted">
            Birlikte olduğunuz gün
            <input
              type="date"
              className="input mt-1 px-2 py-2 text-sm"
              defaultValue={anniversary ?? ""}
              onChange={(e) => saveDate(setAnniversaryAction, e.target.value, "Yıl dönümünüz kaydedildi 💞")}
            />
          </label>
        </div>
        <p className="mt-1.5 text-[11px] font-semibold text-muted">
          {partnerName} kendi doğum gününü kendi profilinden girer. Yıl dönümü ikiniz için ortaktır.
        </p>
        {msg && <p className="mt-1 text-sm font-semibold text-sage-ink">{msg}</p>}
      </div>
    </div>
  );
}
