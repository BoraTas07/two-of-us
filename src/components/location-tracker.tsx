"use client";

import { useEffect } from "react";
import { updateLocationAction } from "@/app/actions";

const EVERY_MS = 5 * 60 * 1000;

/** Tarayıcıdan tek seferlik konum al */
export function currentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      maximumAge: 60_000,
      timeout: 20_000,
    }),
  );
}

export async function pushLocation(): Promise<{ error?: string }> {
  const p = await currentPosition();
  const r = await updateLocationAction(p.coords.latitude, p.coords.longitude, p.coords.accuracy ?? null);
  return "error" in r ? { error: r.error } : {};
}

/**
 * Konum paylaşımı açıksa, uygulama açıkken konumu günceller: açılışta, uygulamaya
 * dönüldüğünde ve açık kaldıkça 5 dakikada bir. İzin penceresini kendiliğinden açmaz;
 * izin daha önce verilmişse çalışır (izin Konum sayfasındaki düğmeyle istenir).
 */
export default function LocationTracker({ sharing }: { sharing: boolean }) {
  useEffect(() => {
    if (!sharing || !("geolocation" in navigator)) return;
    let last = 0;
    let stopped = false;

    async function allowed(): Promise<boolean> {
      try {
        const st = await navigator.permissions?.query({ name: "geolocation" as PermissionName });
        return st ? st.state === "granted" : false;
      } catch {
        return false;
      }
    }

    async function tick(force = false) {
      if (stopped || document.visibilityState !== "visible") return;
      if (!force && Date.now() - last < 2 * 60 * 1000) return;
      if (!(await allowed())) return;
      last = Date.now();
      pushLocation().catch(() => {});
    }

    tick(true);
    const id = setInterval(() => tick(true), EVERY_MS);
    const onVis = () => tick();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stopped = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [sharing]);
  return null;
}
