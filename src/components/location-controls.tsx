"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { requestLocationAction, setLocationSharingAction } from "@/app/actions";
import { currentPosition, pushLocation } from "./location-tracker";

function geoError(e: unknown): string {
  const code = (e as GeolocationPositionError)?.code;
  if (code === 1)
    return "Konum izni verilmedi. iPhone: Ayarlar → Gizlilik ve Güvenlik → Konum Servisleri → Safari Web Siteleri (ya da Two Of Us) → 'Kullanırken'. Android: tarayıcı/site ayarlarından konuma izin ver.";
  if (code === 2) return "Konum bulunamadı. Konum servislerinin açık olduğundan emin ol.";
  if (code === 3) return "Konum zamanında alınamadı; tekrar dene.";
  return "Konum alınamadı.";
}

export function SharingCard({
  sharing,
  partnerName,
  updatedText,
}: {
  sharing: boolean;
  partnerName: string;
  updatedText: string | null;
}) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const enable = () =>
    start(async () => {
      setMsg(null);
      if (!("geolocation" in navigator)) {
        setMsg("Bu tarayıcı konum desteklemiyor.");
        return;
      }
      try {
        await currentPosition(); // izin penceresi burada açılır
      } catch (e) {
        setMsg(geoError(e));
        return;
      }
      await setLocationSharingAction(true);
      const r = await pushLocation().catch((e) => ({ error: geoError(e) }));
      if (r.error) setMsg(r.error);
      router.refresh();
    });

  const update = () =>
    start(async () => {
      setMsg(null);
      const r = await pushLocation().catch((e) => ({ error: geoError(e) }));
      setMsg(r.error ?? "Konumun güncellendi ✓");
      router.refresh();
    });

  const disable = () => {
    if (!confirm(`Konum paylaşımı kapatılsın mı? ${partnerName} artık konumunu göremez ve kayıtlı konumun silinir.`)) return;
    start(async () => {
      await setLocationSharingAction(false);
      setMsg(null);
      router.refresh();
    });
  };

  return (
    <div className={`card p-4 ${sharing ? "bg-sage-soft" : ""}`}>
      {sharing ? (
        <>
          <div className="font-black">📍 Konumun {partnerName} ile paylaşılıyor</div>
          <p className="mt-1 text-sm font-semibold text-muted">
            Uygulama açıkken birkaç dakikada bir güncellenir; kapalıyken güncellenmez.
            {updatedText ? ` Son güncelleme: ${updatedText}.` : ""}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button className="btn bg-surface text-ink" disabled={busy} onClick={update}>
              Şimdi güncelle
            </button>
            <button className="btn bg-surface text-danger" disabled={busy} onClick={disable}>
              Paylaşımı durdur
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="font-black">📍 Konumun paylaşılmıyor</div>
          <p className="mt-1 text-sm font-semibold text-muted">
            Açarsan {partnerName} haritada nerede olduğunu görebilir. Uygulama açıkken güncellenir, sadece son konumun
            saklanır ve istediğin an kapatabilirsin.
          </p>
          <button className="btn mt-3 w-full bg-brand text-on-brand" disabled={busy} onClick={enable}>
            {busy ? "Konum alınıyor..." : "Konumumu paylaşmaya başla"}
          </button>
        </>
      )}
      {msg && <p className="animate-pop mt-2 text-sm font-semibold text-ink">{msg}</p>}
    </div>
  );
}

export function RequestButton({ partnerName }: { partnerName: string }) {
  const [busy, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div>
      <button
        className="btn w-full bg-surface text-ink"
        disabled={busy || !!msg}
        onClick={() =>
          start(async () => {
            const r = await requestLocationAction();
            setMsg("error" in r && r.error ? r.error : `${partnerName} için istek gönderildi 📍`);
          })
        }
      >
        {msg ?? `📍 Konum iste: ${partnerName}`}
      </button>
    </div>
  );
}
