"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/** Pencereleri sayfanın en üst katmanına taşır: kart animasyonları (transform) tam ekranı bozmasın */
export function Portal({ children }: { children: React.ReactNode }) {
  return typeof document === "undefined" ? null : createPortal(children, document.body);
}

/** Fotoğrafı telefonda küçültür (en uzun kenar 1280px, JPEG) — yükleme hızlı, veritabanı küçük kalır */
export async function compress(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("Fotoğraf açılamadı"));
      i.src = url;
    });
    const scale = Math.min(1, 1280 / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    for (const q of [0.75, 0.6, 0.45]) {
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", q));
      if (blob && blob.size < 1.5 * 1024 * 1024) return blob;
    }
    throw new Error("Fotoğraf çok büyük");
  } finally {
    URL.revokeObjectURL(url);
  }
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose?: () => void }) {
  return (
    <Portal>
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="card animate-pop w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
    </Portal>
  );
}

/** Tamamlayan kişinin kanıt fotoğrafı eklediği pencere */
export function PhotoSheet({
  completionId,
  title,
  required,
  onClose,
}: {
  completionId: number;
  title: string;
  required: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  async function pick(file: File | undefined) {
    if (!file) return;
    setErr(null);
    setBusy(true);
    try {
      const b = await compress(file);
      setBlob(b);
      setPreview(URL.createObjectURL(b));
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
  }

  async function send() {
    if (!blob) return;
    setBusy(true);
    setErr(null);
    const fd = new FormData();
    fd.append("completionId", String(completionId));
    fd.append("photo", new File([blob], "kanit.jpg", { type: "image/jpeg" }));
    try {
      const res = await fetch("/api/foto", { method: "POST", body: fd });
      const r = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(r.error ?? "Gönderilemedi");
      router.refresh();
      onClose();
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <Modal>
      <div className="text-center">
        <div className="text-4xl">📷</div>
        <h2 className="mt-2 text-xl">Kanıt fotoğrafı</h2>
        <p className="mt-1 text-sm font-semibold text-muted">
          {title} · {required ? "Bu görev fotoğraf istiyor." : "İstersen ekleyebilirsin."} Partnerin fotoğrafı{" "}
          <b>bir kez</b> açabilir, sonra silinir.
        </p>
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0])}
      />
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="Seçilen fotoğraf" className="mt-4 max-h-64 w-full rounded-2xl object-cover" />
      ) : null}
      {err && <p className="mt-3 text-sm font-semibold text-danger">{err}</p>}
      <div className="mt-4 space-y-2">
        {blob ? (
          <>
            <button className="btn w-full bg-brand text-white" disabled={busy} onClick={send}>
              {busy ? "Gönderiliyor..." : "Gönder"}
            </button>
            <button className="btn w-full bg-surface text-ink" disabled={busy} onClick={() => input.current?.click()}>
              Başka fotoğraf
            </button>
          </>
        ) : (
          <button className="btn w-full bg-brand text-white" disabled={busy} onClick={() => input.current?.click()}>
            {busy ? "Hazırlanıyor..." : "Fotoğraf çek / seç"}
          </button>
        )}
        <button className="btn w-full bg-transparent text-sm text-muted" disabled={busy} onClick={onClose}>
          {required ? "Sonra eklerim" : "Fotoğrafsız devam et"}
        </button>
      </div>
    </Modal>
  );
}

/** Onaylayacak kişinin tek seferlik görüntüleyicisi */
export function PhotoViewer({
  completionId,
  onViewed,
  onOpened,
}: {
  completionId: number;
  /** Pencere kapandı */
  onViewed: () => void;
  /** Fotoğraf sunucudan alındı (ve orada silindi) */
  onOpened?: () => void;
}) {
  const [state, setState] = useState<"ask" | "loading" | "open" | "error">("ask");
  const [src, setSrc] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  async function open() {
    setState("loading");
    try {
      const res = await fetch(`/api/foto/${completionId}`, { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());
      setSrc(URL.createObjectURL(await res.blob()));
      setState("open");
      onOpened?.();
    } catch (e) {
      setMsg((e as Error).message || "Açılamadı");
      setState("error");
    }
  }

  function close() {
    if (src) URL.revokeObjectURL(src);
    setSrc(null);
    onViewed();
  }

  if (state === "open" && src) {
    return (
      <Portal>
      <div
        className="fixed inset-0 z-50 flex flex-col bg-black select-none"
        style={{ WebkitTouchCallout: "none" }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className="safe-top flex items-center justify-between px-4 pb-2 text-sm font-semibold text-white/80">
          <span>Tek gösterimlik · kapatınca bir daha açılmaz</span>
          <button className="btn bg-white/15 px-3 py-1.5 text-white" onClick={close}>
            Kapat
          </button>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt="Kanıt fotoğrafı"
          draggable={false}
          className="pointer-events-none min-h-0 w-full flex-1 object-contain"
        />
      </div>
      </Portal>
    );
  }

  return (
    <Modal onClose={state === "loading" ? undefined : onViewed}>
      <div className="text-center">
        <div className="text-4xl">📷</div>
        <h2 className="mt-2 text-xl">Tek gösterimlik fotoğraf</h2>
        <p className="mt-1 text-sm font-semibold text-muted">
          {state === "error" ? msg : "Fotoğrafı sadece bir kez görebilirsin. Açtığın anda sunucudan silinir."}
        </p>
      </div>
      <div className="mt-4 space-y-2">
        {state !== "error" && (
          <button className="btn w-full bg-brand text-white" disabled={state === "loading"} onClick={open}>
            {state === "loading" ? "Açılıyor..." : "Şimdi aç"}
          </button>
        )}
        <button className="btn w-full bg-surface text-muted" disabled={state === "loading"} onClick={onViewed}>
          {state === "error" ? "Kapat" : "Vazgeç"}
        </button>
      </div>
    </Modal>
  );
}
