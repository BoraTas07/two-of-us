// Havuç çubuğu: 1–200 arası değer. Çubuk doğrusal değil; başta hassas (1'er),
// ilerledikçe adım büyür (5'er, sonra 10'ar). Böylece küçük değerler kolay seçilir.

export const MIN_CARROTS = 1;
export const MAX_CARROTS = 200;
export const SLIDER_STEPS = 200;

export function clampCarrots(v: number): number {
  if (!Number.isFinite(v)) return MIN_CARROTS;
  return Math.min(MAX_CARROTS, Math.max(MIN_CARROTS, Math.round(v)));
}

/** Değeri bulunduğu aralığın adımına yuvarlar */
export function snapCarrots(v: number): number {
  const step = v < 20 ? 1 : v < 60 ? 5 : 10;
  return clampCarrots(Math.round(v / step) * step);
}

/** Çubuk konumu (0–SLIDER_STEPS) → havuç */
export function positionToCarrots(p: number): number {
  const t = Math.min(1, Math.max(0, p / SLIDER_STEPS));
  return snapCarrots(MIN_CARROTS + (MAX_CARROTS - MIN_CARROTS) * t * t);
}

/** Havuç → en yakın çubuk konumu (0–SLIDER_STEPS) */
export function carrotsToPosition(v: number): number {
  const t = Math.sqrt((clampCarrots(v) - MIN_CARROTS) / (MAX_CARROTS - MIN_CARROTS));
  return Math.round(t * SLIDER_STEPS);
}
