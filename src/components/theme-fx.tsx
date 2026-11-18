"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useRef } from "react";
import type { FxLayer } from "@/lib/themes";

// Tema hareketleri (tuval üzerinde): kar, biriken kar, bulanık ışıklar, çiçek yaprakları, yapraklar,
// su parıltıları, dalgalar, mum ışığı, altın tozu, kalpler, yıldızlar, kayan yıldız.
// Sekme görünmezken durur; "hareketi azalt" açıksa hiç çalışmaz.

type P = any;
type Kind = { n: number; make: (w: number, h: number, o: any) => P; step: (p: P, w: number, h: number, t: number) => void; draw: (c: CanvasRenderingContext2D, p: P, t: number, w: number, h: number) => void };

const R = (a: number, b: number) => a + Math.random() * (b - a);
const KINDS: Record<string, Kind> = {
  snow: { n: 70, make: (w, h) => { const s = R(1, 4.6); return { x: R(0, w), y: R(-h, h), s, vy: 0.25 + s * 0.16, ph: R(0, 6.28), a: R(0.5, 0.95) }; },
    step(p, w, h, t) { p.y += p.vy; p.x += Math.sin(t / 900 + p.ph) * 0.35 + 0.12; if (p.y > h + 6) { p.y = -6; p.x = R(0, w); } },
    draw(c, p) { const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.s); g.addColorStop(0, `rgba(255,255,255,${p.a})`); g.addColorStop(p.s > 3 ? 0.45 : 0.75, `rgba(255,255,255,${p.a * 0.8})`); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.beginPath(); c.arc(p.x, p.y, p.s, 0, 7); c.fill(); } },
  bokeh: { n: 14, make: (w, h, o) => ({ x: R(0, w), y: R(0, h), r: R(10, 34), ph: R(0, 6.28), sp: R(0.0006, 0.0016), col: o.colors[Math.floor(R(0, o.colors.length))], dx: R(-0.06, 0.06) }),
    step(p, w) { p.x += p.dx; if (p.x < -40) p.x = w + 40; if (p.x > w + 40) p.x = -40; },
    draw(c, p, t) { const a = 0.10 + 0.16 * (0.5 + 0.5 * Math.sin(t * p.sp + p.ph)); const g = c.createRadialGradient(p.x, p.y, p.r * 0.2, p.x, p.y, p.r); g.addColorStop(0, `rgba(${p.col},${a})`); g.addColorStop(0.75, `rgba(${p.col},${a * 0.8})`); g.addColorStop(1, `rgba(${p.col},0)`); c.fillStyle = g; c.beginPath(); c.arc(p.x, p.y, p.r, 0, 7); c.fill(); } },
  petals: { n: 9, make: (w, h, o) => ({ x: R(-w * 0.3, w), y: R(-h, h), s: R(o.min || 4, o.max || 7.5), rot: R(0, 6.28), vr: R(-0.02, 0.02), flip: R(0, 6.28), vx: R(0.25, 0.6), vy: R(0.3, 0.55), col: o.color }),
    step(p, w, h) { p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.flip += 0.03; if (p.y > h + 10 || p.x > w + 10) { p.y = R(-30, -6); p.x = R(-w * 0.3, w * 0.8); } },
    draw(c, p) { c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.scale(1, 0.35 + 0.65 * Math.abs(Math.cos(p.flip))); c.fillStyle = p.col; c.globalAlpha = 0.95; c.shadowColor = 'rgba(120,40,70,.25)'; c.shadowBlur = 2; c.beginPath(); c.moveTo(0, -p.s); c.bezierCurveTo(p.s * 0.9, -p.s * 0.6, p.s * 0.7, p.s * 0.7, 0, p.s); c.bezierCurveTo(-p.s * 0.7, p.s * 0.7, -p.s * 0.9, -p.s * 0.6, 0, -p.s); c.fill(); c.restore(); } },
  leaves: { n: 7, make: (w, h, o) => ({ x: R(0, w), y: R(-h, h), s: R(o.min || 6, o.max || 10), rot: R(0, 6.28), vr: R(-0.03, 0.03), flip: R(0, 6.28), vy: R(0.45, 0.8), ph: R(0, 6.28), col: o.colors[Math.floor(R(0, o.colors.length))] }),
    step(p, w, h, t) { p.y += p.vy; p.x += Math.sin(t / 700 + p.ph) * 0.9; p.rot += p.vr; p.flip += 0.04; if (p.y > h + 14) { p.y = -14; p.x = R(0, w); } },
    draw(c, p) { c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.scale(0.3 + 0.7 * Math.abs(Math.cos(p.flip)), 1); c.globalAlpha = 1; c.shadowColor = 'rgba(40,15,0,.3)'; c.shadowBlur = 2; c.fillStyle = p.col; const s = p.s; c.beginPath(); c.moveTo(0, -s); c.quadraticCurveTo(s * 0.8, -s * 0.2, 0, s); c.quadraticCurveTo(-s * 0.8, -s * 0.2, 0, -s); c.fill(); c.strokeStyle = 'rgba(60,25,10,.35)'; c.lineWidth = 0.7; c.beginPath(); c.moveTo(0, -s * 0.9); c.lineTo(0, s * 1.25); c.stroke(); c.restore(); } },
  glints: { n: 16, make: (w, h) => ({ x: R(0, w), y: R(h * 0.45, h), s: R(1.5, 3.5), ph: R(0, 6.28), sp: R(0.002, 0.005) }),
    step(p, w) { p.x += 0.08; if (p.x > w) p.x = 0; },
    draw(c, p, t) { const a = Math.max(0, Math.sin(t * p.sp + p.ph)) ** 3; if (a < 0.02) return; c.save(); c.globalAlpha = a; c.translate(p.x, p.y); c.fillStyle = '#fff'; const s = p.s; c.beginPath(); c.moveTo(0, -s * 2.4); c.lineTo(s * 0.35, -s * 0.35); c.lineTo(s * 2.4, 0); c.lineTo(s * 0.35, s * 0.35); c.lineTo(0, s * 2.4); c.lineTo(-s * 0.35, s * 0.35); c.lineTo(-s * 2.4, 0); c.lineTo(-s * 0.35, -s * 0.35); c.fill(); c.restore(); } },
  candle: { n: 7, make: (w, h) => ({ x: R(0.1, 0.9) * w, y: R(0.45, 0.95) * h, r: R(18, 36), ph: R(0, 100) }),
    step() {},
    draw(c, p, t) { const f = 0.55 + 0.25 * Math.sin(t / 130 + p.ph) * Math.sin(t / 370 + p.ph * 2) + 0.2 * Math.sin(t / 53 + p.ph); const a = 0.13 + 0.12 * f; const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r); g.addColorStop(0, `rgba(255,200,120,${a})`); g.addColorStop(1, 'rgba(255,170,90,0)'); c.fillStyle = g; c.beginPath(); c.arc(p.x, p.y, p.r, 0, 7); c.fill(); } },
  golddust: { n: 26, make: (w, h) => ({ x: R(0, w), y: R(-h, h), s: R(0.8, 1.8), vy: R(0.15, 0.35), ph: R(0, 6.28) }),
    step(p, w, h, t) { p.y += p.vy; p.x += Math.sin(t / 1100 + p.ph) * 0.2; if (p.y > h + 4) { p.y = -4; p.x = R(0, w); } },
    draw(c, p, t) { c.globalAlpha = 0.35 + 0.6 * Math.max(0, Math.sin(t / 400 + p.ph)); c.fillStyle = '#f3d48a'; c.beginPath(); c.arc(p.x, p.y, p.s, 0, 7); c.fill(); c.globalAlpha = 1; } },
  fireflies: { n: 14, make: (w, h) => ({ x: R(0, w), y: R(h * 0.2, h), ph: R(0, 6.28), sp: R(0.0008, 0.0016), ax: R(0.2, 0.5), ay: R(0.15, 0.4) }),
    step(p, w, h, t) { p.x += Math.cos(t * p.sp + p.ph) * p.ax; p.y += Math.sin(t * p.sp * 1.3 + p.ph) * p.ay; if (p.x < 0) p.x = w; if (p.x > w) p.x = 0; if (p.y < h * 0.15) p.y = h * 0.15; if (p.y > h) p.y = h; },
    draw(c, p, t) { const a = 0.15 + 0.85 * Math.max(0, Math.sin(t / 700 + p.ph)) ** 2; const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, 7); g.addColorStop(0, `rgba(230,240,150,${a})`); g.addColorStop(0.25, `rgba(210,230,120,${a * 0.7})`); g.addColorStop(1, 'rgba(200,220,100,0)'); c.fillStyle = g; c.beginPath(); c.arc(p.x, p.y, 7, 0, 7); c.fill(); } },
};
// Dalgalar: başlığın altında yan yana kayan, yarı saydam deniz katmanları
KINDS.waves = { n: 1, make: () => ({}), step() {},
  draw(c, p, t, w, h) {
    const layers = [
      { y: 0.56, amp: 6, len: 0.9, sp: 0.00035, a: 0.12 },
      { y: 0.66, amp: 7, len: 0.7, sp: -0.0005, a: 0.15 },
      { y: 0.76, amp: 6, len: 1.1, sp: 0.0007, a: 0.18 },
      { y: 0.86, amp: 5, len: 0.8, sp: -0.0009, a: 0.22 },
    ];
    for (const L of layers) {
      c.beginPath(); c.moveTo(0, h);
      for (let x = 0; x <= w + 4; x += 4) {
        const k = (x / w) * Math.PI * 2 / L.len;
        c.lineTo(x, h * L.y + Math.sin(k + t * L.sp * 6) * L.amp + Math.sin(k * 2.3 - t * L.sp * 4) * L.amp * 0.4);
      }
      c.lineTo(w, h); c.closePath(); c.fillStyle = `rgba(255,255,255,${L.a})`; c.fill();
      // dalga sırtında ince köpük çizgisi
      c.beginPath();
      for (let x = 0; x <= w + 4; x += 4) {
        const k = (x / w) * Math.PI * 2 / L.len;
        const y = h * L.y + Math.sin(k + t * L.sp * 6) * L.amp + Math.sin(k * 2.3 - t * L.sp * 4) * L.amp * 0.4;
        if (x) c.lineTo(x, y); else c.moveTo(x, y);
      }
      c.strokeStyle = `rgba(255,255,255,${L.a + 0.12})`; c.lineWidth = 1; c.stroke();
    }
  } };
// Yanıp sönen yıldızlar ve ara sıra kayan yıldız
KINDS.stars = { n: 70, make: (w, h) => ({ x: R(0, w), y: R(0, h), s: R(0.5, 1.7), ph: R(0, 6.28), sp: R(0.0008, 0.003) }), step() {},
  draw(c, p, t) { const a = 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(t * p.sp + p.ph)) ** 2; c.globalAlpha = a; c.fillStyle = '#fff'; c.beginPath(); c.arc(p.x, p.y, p.s, 0, 7); c.fill();
    if (p.s > 1.4 && a > 0.8) { c.globalAlpha = (a - 0.8) * 3; c.fillRect(p.x - p.s * 3, p.y - 0.3, p.s * 6, 0.6); c.fillRect(p.x - 0.3, p.y - p.s * 3, 0.6, p.s * 6); } c.globalAlpha = 1; } };
KINDS.shooting = { n: 1, make: () => ({ x: 0, y: 0, life: 0, next: R(800, 2500) }),
  step(p, w, h, t) { if (p.life <= 0) { if (t > p.next) { p.x = R(w * 0.2, w); p.y = R(0, h * 0.4); p.life = 1; } return; } p.x -= 6; p.y += 2.5; p.life -= 0.025; if (p.life <= 0) p.next = t + R(2500, 6000); },
  draw(c, p) { if (p.life <= 0) return; const g = c.createLinearGradient(p.x, p.y, p.x + 60, p.y - 25); g.addColorStop(0, `rgba(255,255,255,${p.life})`); g.addColorStop(1, 'rgba(255,255,255,0)'); c.strokeStyle = g; c.lineWidth = 1.2; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x + 60, p.y - 25); c.stroke(); } };
// Biriken kar: düşen taneler alttaki menünün üstünde yumuşak bir kar yığını oluşturur
KINDS.snowpile = { n: 1, make: (w, h, o) => ({ base: o.base || 80, m: o.margin || 14, max: o.max || 22, start: o.start || 7, cols: null, flakes: [] }),
  step(p, w, h) {
    const step = 3, left = p.m + 14, right = w - p.m - 14;
    if (!p.cols) { p.cols = new Float32Array(Math.ceil(w / step) + 1); for (let j = 0; j < p.cols.length; j++) p.cols[j] = (p.start || 7) + Math.sin(j * 0.21) * 2.2 + Math.sin(j * 0.07 + 1) * 2.8; for (let i = 0; i < 90; i++) p.flakes.push({ x: R(0, w), y: R(-h, h), s: R(1, 3.4), vy: R(0.45, 0.95), ph: R(0, 6.28) }); }
    const ground = h - p.base;
    for (const f of p.flakes) {
      f.y += f.vy; f.x += Math.sin(f.y / 40 + f.ph) * 0.3;
      const i = Math.round(f.x / step);
      if (f.x > left && f.x < right && f.y >= ground - p.cols[i]) {
        for (let k = -2; k <= 2; k++) { const j = i + k; if (j >= 0 && j < p.cols.length) p.cols[j] = Math.min(p.max, p.cols[j] + f.s * (k === 0 ? 0.7 : 0.3)); }
        f.y = R(-40, -5); f.x = R(0, w);
      } else if (f.y > h) { f.y = R(-40, -5); f.x = R(0, w); }
    }
    // yığın kenarlarda yuvarlanır, yavaşça yayılır
    for (let j = 1; j < p.cols.length - 1; j++) p.cols[j] = p.cols[j] * 0.96 + (p.cols[j - 1] + p.cols[j + 1]) * 0.02;
    for (let j = 0; j < p.cols.length; j++) { const x = j * step; if (x < left || x > right) p.cols[j] = 0; else { const e = Math.min(1, (x - left) / 30, (right - x) / 30); p.cols[j] = Math.min(p.cols[j], p.max * e); } }
  },
  draw(c, p, t, w, h) {
    if (!p.cols) return;
    const step = 3, ground = h - p.base + 2;
    c.save(); c.shadowColor = 'rgba(60,80,100,.25)'; c.shadowBlur = 4; c.shadowOffsetY = 1;
    c.beginPath(); c.moveTo(0, ground);
    for (let j = 0; j < p.cols.length; j++) c.lineTo(j * step, ground - p.cols[j]);
    c.lineTo(w, ground); c.closePath(); c.fillStyle = '#fbfdff'; c.fill(); c.restore();
    for (const f of p.flakes) { c.globalAlpha = 0.85; c.fillStyle = '#fff'; c.beginPath(); c.arc(f.x, f.y, f.s, 0, 7); c.fill(); }
    c.globalAlpha = 1;
  } };
// Yükselen kalpler: yumuşak, yarı saydam; bazıları bulanık (derinlik)
KINDS.hearts = { n: 14, make: (w, h, o) => { const s = R(5, 13); return { x: R(0, w), y: R(0, h * 1.6), s, vy: 0.18 + s * 0.025, ph: R(0, 6.28), rot: R(-0.3, 0.3), blur: s > 10 ? R(1, 2.5) : 0, col: o.colors[Math.floor(R(0, o.colors.length))] }; },
  step(p, w, h, t) { p.y -= p.vy; p.x += Math.sin(t / 1300 + p.ph) * 0.25; if (p.y < -20) { p.y = h + R(10, 60); p.x = R(0, w); } },
  draw(c, p, t, w, h) { const fade = Math.min(1, p.y / (h * 0.35), (h - p.y) / 40 + 0.2); const a = Math.max(0, fade) * 0.75; if (a <= 0) return;
    c.save(); c.translate(p.x, p.y); c.rotate(p.rot + Math.sin(t / 900 + p.ph) * 0.12); c.globalAlpha = a; if (p.blur) c.filter = `blur(${p.blur}px)`; const s = p.s;
    c.beginPath(); c.moveTo(0, s * 0.35); c.bezierCurveTo(-s * 1.1, -s * 0.35, -s * 0.55, -s * 1.15, 0, -s * 0.5); c.bezierCurveTo(s * 0.55, -s * 1.15, s * 1.1, -s * 0.35, 0, s * 0.35); c.closePath();
    const g = c.createLinearGradient(0, -s, 0, s * 0.4); g.addColorStop(0, '#fff'); g.addColorStop(0.35, p.col); g.addColorStop(1, p.col); c.fillStyle = g; c.fill(); c.restore(); } };

export default function ThemeFx({ layers, className }: { layers: FxLayer[]; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const key = JSON.stringify(layers);
  useEffect(() => {
    const cv = ref.current;
    if (!cv || !layers.length) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const c = cv.getContext("2d");
    if (!c) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let w = 0, h = 0;
    const size = () => {
      w = cv.clientWidth; h = cv.clientHeight;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    size();
    // Biriken kar alttaki menünün üst kenarına oturur
    const navOpts = () => {
      const nav = document.querySelector("[data-bottom-nav]");
      if (!nav) return {};
      const r = cv.getBoundingClientRect(), n = nav.getBoundingClientRect();
      return { base: window.innerHeight - n.top, margin: n.left - r.left };
    };
    const sets = layers.filter(([k]) => KINDS[k]).map(([k, o]) => {
      const kind = KINDS[k];
      if (k === "snowpile") o = { ...navOpts(), ...o };
      const n = (o?.n as number) ?? kind.n;
      return { kind, ps: Array.from({ length: n }, () => kind.make(w, h, o ?? {})) };
    });
    let raf = 0;
    const loop = (t: number) => {
      c.clearRect(0, 0, w, h);
      for (const s of sets) for (const p of s.ps) { s.kind.step(p, w, h, t); s.kind.draw(c, p, t, w, h); }
      raf = requestAnimationFrame(loop);
    };
    const start = () => { if (!raf && !document.hidden) raf = requestAnimationFrame(loop); };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };
    const vis = () => (document.hidden ? stop() : start());
    const ro = new ResizeObserver(size);
    ro.observe(cv);
    document.addEventListener("visibilitychange", vis);
    start();
    return () => { stop(); ro.disconnect(); document.removeEventListener("visibilitychange", vis); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return <canvas ref={ref} aria-hidden className={className ?? "pointer-events-none absolute inset-0 h-full w-full"} />;
}
