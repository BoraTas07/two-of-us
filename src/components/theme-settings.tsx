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
        className={`relative flex h-[4.5rem] items-end overflow-hidden rounded-2xl p-2.5 text-left text-[#f6ece4] transition-transform active:scale-95 ${
          active ? "ring-[3px] ring-brand ring-offset-2 ring-offset-surface" : ""
        }`}
        style={{
          background: `linear-gradient(180deg, ${t.head}b3, ${t.head}e6), url(${t.photo}) center / cover`,
        }}
      >
        <span className="min-w-0">
          <span className="block font-serif text-[15px] leading-tight">{label}</span>
          <span className="block truncate text-[11px] opacity-80">{sub}</span>
        </span>
        {active && (
          <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#f6ece4] text-[11px] font-black" style={{ color: t.head }}>
            ✓
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          {swatch("auto", "Otomatik (önerilen)", `Mevsime ve özel günlere göre · şu an ${auto.name}`)}
        </div>
        {THEME_ORDER.map((k) => swatch(k, THEMES[k].name, THEMES[k].desc))}
      </div>

      <label className="flex items-center justify-between gap-3 rounded-2xl bg-bg px-3 py-2.5">
        <span className="text-sm font-semibold">
          <b className="font-black">Hareketli süslemeler</b>
          <span className="block text-xs font-normal text-muted">Kar, yaprak, kalp, dalga, yıldız… Kapatırsan fotoğraflar kalır, hareket durur.</span>
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
