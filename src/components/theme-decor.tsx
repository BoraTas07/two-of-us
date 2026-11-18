import type { CSSProperties } from "react";
import type { Decor } from "@/lib/themes";

// Tema süslemeleri: kar, kalpler, çiçek yaprakları, yapraklar, konfeti, dalgalar…
// Kartların arkasında, zeminin üstünde süzülürler; dokunmayı engellemezler.
// Rastgelelik sabit (indekse göre), böylece sunucuda çizilebilir.

function rnd(i: number, salt: number) {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

type P = { content?: string; cls: string; size: number; style?: CSSProperties };

function particles(n: number, salt: number, make: (i: number, r: (s: number) => number) => P, mode: "fall" | "rise" | "twinkle") {
  return Array.from({ length: n }, (_, i) => {
    const r = (s: number) => rnd(i, salt + s);
    const p = make(i, r);
    const dur = mode === "twinkle" ? 1.5 + r(3) * 2.5 : 9 + r(3) * 12;
    const style = {
      left: `${r(1) * 100}%`,
      fontSize: p.size,
      width: p.content ? undefined : p.size,
      height: p.content ? undefined : p.size,
      animationDuration: `${dur}s`,
      animationDelay: `${-r(4) * dur}s`,
      "--sway": `${(r(5) - 0.5) * 80}px`,
      ...(mode === "twinkle" ? { top: `${r(6) * 100}%` } : {}),
      ...p.style,
    } as CSSProperties;
    return (
      <span key={`${salt}-${i}`} className={`decor-p ${mode === "rise" ? "rise" : mode === "twinkle" ? "twinkle" : ""} ${p.cls}`} style={style}>
        {p.content}
      </span>
    );
  });
}

const pick = <T,>(arr: T[], x: number) => arr[Math.floor(x * arr.length) % arr.length];

const snow = (n: number) =>
  particles(n, 1, (_, r) => ({ cls: "decor-flake", size: 3 + r(2) * 5, style: { opacity: 0.5 + r(7) * 0.4 } }), "fall");

export default function ThemeDecor({ decor }: { decor: Decor }) {
  if (!decor) return null;
  let content: React.ReactNode = null;
  switch (decor) {
    case "snow":
      content = snow(42);
      break;
    case "xmas":
      content = (
        <>
          {snow(34)}
          {particles(8, 2, (_, r) => ({ content: pick(["✨", "⭐"], r(2)), cls: "", size: 10 + r(2) * 8, style: { top: `${r(6) * 40}%` } }), "twinkle")}
        </>
      );
      break;
    case "hearts":
      content = particles(16, 3, (_, r) => ({ content: pick(["💗", "💕", "❤️", "💖"], r(2)), cls: "", size: 12 + r(2) * 14, style: { opacity: 0.55 } }), "rise");
      break;
    case "petals":
      content = particles(18, 4, (_, r) => ({ content: pick(["🌸", "🌸", "🌼", "🍃"], r(2)), cls: "", size: 12 + r(2) * 10, style: { opacity: 0.75 } }), "fall");
      break;
    case "leaves":
      content = particles(16, 5, (_, r) => ({ content: pick(["🍂", "🍁", "🍂"], r(2)), cls: "", size: 14 + r(2) * 12, style: { opacity: 0.8 } }), "fall");
      break;
    case "confetti":
      content = (
        <>
          {particles(36, 6, (_, r) => ({
            cls: "",
            size: 6 + r(2) * 5,
            style: { background: pick(["#8a4fb8", "#d1407f", "#d19a22", "#3f8fd0", "#4f9a73"], r(8)), borderRadius: 2, opacity: 0.85 },
          }), "fall")}
          {particles(5, 7, (_, r) => ({ content: "🎈", cls: "", size: 22 + r(2) * 10 }), "rise")}
        </>
      );
      break;
    case "sparkle":
      content = (
        <>
          {particles(14, 8, (_, r) => ({ content: "✨", cls: "", size: 10 + r(2) * 10 }), "twinkle")}
          {particles(7, 9, (_, r) => ({ content: pick(["💗", "🤍"], r(2)), cls: "", size: 14 + r(2) * 8, style: { opacity: 0.5 } }), "rise")}
        </>
      );
      break;
    case "stars":
      content = particles(40, 10, (_, r) => ({ cls: "decor-star", size: 1.5 + r(2) * 2.5 }), "twinkle");
      break;
    case "waves":
      content = (
        <>
          <div className="decor-sun" />
          <div className="decor-waves">
            {[0.16, 0.22].map((o, i) => (
              <svg key={i} viewBox="0 0 1200 120" preserveAspectRatio="none" aria-hidden>
                <path
                  d="M0 60 Q 150 20 300 60 T 600 60 T 900 60 T 1200 60 V120 H0 Z"
                  fill={i ? "var(--ice)" : "var(--brand)"}
                  fillOpacity={o}
                  transform={i ? "translate(0 18)" : undefined}
                />
              </svg>
            ))}
          </div>
        </>
      );
      break;
  }
  return (
    <div className="decor" aria-hidden>
      {content}
    </div>
  );
}
