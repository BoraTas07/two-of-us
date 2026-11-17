"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Partnerin yaptığı değişiklikleri görmek için ekranı arada bir tazeler
 * ve uygulamaya geri dönüldüğünde hemen günceller. Ayrıca bildirim
 * servis çalışanını kaydeder.
 */
export default function AutoRefresh({ every = 20000 }: { every?: number }) {
  const router = useRouter();
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {});
    }
    const tick = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const id = setInterval(tick, every);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [router, every]);
  return null;
}
