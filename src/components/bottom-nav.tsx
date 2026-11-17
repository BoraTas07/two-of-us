"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const ICONS: Record<string, React.ReactNode> = {
  home: (
    <>
      <path {...stroke} d="M4 11.5 12 5l8 6.5" />
      <path {...stroke} d="M6 10v9h12v-9" />
      <path {...stroke} d="M10 19v-5h4v5" />
    </>
  ),
  list: (
    <>
      <path {...stroke} d="M9 7h11M9 12h11M9 17h11" />
      <path {...stroke} d="m3.5 7 1.2 1.2L7 6M3.5 12l1.2 1.2L7 11M4 17h1.5" />
    </>
  ),
  us: (
    <path
      {...stroke}
      d="M12 19s-7-4.3-7-9.2A3.8 3.8 0 0 1 12 7.6a3.8 3.8 0 0 1 7 2.2C19 14.7 12 19 12 19Z"
    />
  ),
  shop: (
    <>
      <path {...stroke} d="M5.5 8h13l-1 11.5h-11Z" />
      <path {...stroke} d="M9 10.5V7a3 3 0 0 1 6 0v3.5" />
    </>
  ),
};

const ITEMS = [
  { href: "/", label: "Bugün", icon: "home" },
  { href: "/gorevler", label: "Görevler", icon: "list" },
  { href: "/gorevler/yeni", label: "Ekle", icon: "", big: true },
  { href: "/magaza", label: "Mağaza", icon: "shop" },
  { href: "/biz", label: "Biz", icon: "us" },
];

export default function BottomNav() {
  const path = usePathname();
  const active = (href: string) =>
    href === "/"
      ? path === "/"
      : href === "/gorevler"
        ? path === "/gorevler" || /^\/gorevler\/\d/.test(path)
        : path.startsWith(href) || (href === "/biz" && path.startsWith("/istatistik"));

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-md items-center justify-around px-2 pt-2">
        {ITEMS.map((it) =>
          it.big ? (
            <Link
              key={it.href}
              href={it.href}
              aria-label="Yeni görev ekle"
              className="btn h-12 w-12 rounded-full bg-brand p-0 text-white"
            >
              <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
                <path {...stroke} strokeWidth={2.2} d="M12 5v14M5 12h14" />
              </svg>
            </Link>
          ) : (
            <Link
              key={it.href}
              href={it.href}
              className={`flex w-16 flex-col items-center gap-0.5 rounded-xl py-1 text-[11px] font-semibold transition-colors ${
                active(it.href) ? "text-brand" : "text-muted"
              }`}
              aria-current={active(it.href) ? "page" : undefined}
            >
              <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden>
                {ICONS[it.icon]}
              </svg>
              {it.label}
            </Link>
          ),
        )}
      </div>
    </nav>
  );
}
