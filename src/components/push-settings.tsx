"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { subscribeAction, testPushAction, unsubscribeAction } from "@/app/actions";

type Env = {
  supported: boolean;
  ios: boolean;
  standalone: boolean;
  permission: NotificationPermission | "unsupported";
  subscribed: boolean;
};

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
}

async function readEnv(): Promise<Env> {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true;
  const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  let subscribed = false;
  if (supported) {
    const reg = await navigator.serviceWorker.getRegistration("/");
    subscribed = !!(await reg?.pushManager.getSubscription());
  }
  return {
    supported,
    ios,
    standalone,
    permission: "Notification" in window ? Notification.permission : "unsupported",
    subscribed,
  };
}

function useEnv() {
  const [env, setEnv] = useState<Env | null>(null);
  useEffect(() => {
    readEnv().then(setEnv);
  }, []);
  return [env, () => readEnv().then(setEnv)] as const;
}

function IosInstallSteps() {
  const steps = [
    <>Safari&apos;de alttaki <b>Paylaş</b> düğmesine dokun (kare ve yukarı ok ⬆️)</>,
    <><b>Ana Ekrana Ekle</b> seçeneğine dokun ➕</>,
    <>Ana ekrandaki <b>Two Of Us</b> simgesinden aç ve bu sayfaya tekrar gel</>,
  ];
  return (
    <ol className="mt-3 space-y-2 text-sm font-semibold">
      {steps.map((s, i) => (
        <li key={i} className="flex items-start gap-2">
          <span className="chip mt-0.5 shrink-0 bg-brand text-on-brand">{i + 1}</span>
          <span>{s}</span>
        </li>
      ))}
    </ol>
  );
}

/** Ana sayfada, bildirimler kapalıysa görünen küçük uyarı */
export function PushBannerInner() {
  const [env] = useEnv();
  if (!env || env.subscribed) return null;
  if (!env.supported && !env.ios) return null;
  return (
    <Link href="/profil#bildirimler" className="flex items-center gap-2.5 rounded-2xl bg-ice-soft px-3 py-2.5 text-sm">
      <span className="animate-wiggle text-lg leading-none">🔔</span>
      <span className="min-w-0 flex-1 truncate font-semibold">
        <b>Hatırlatmaları aç</b> · görev saatinde bildirim gelsin
      </span>
      <span className="font-black text-brand">›</span>
    </Link>
  );
}

export default function PushSettings({ publicKey }: { publicKey: string }) {
  const [env, reload] = useEnv();
  const [busy, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  if (!env) return <div className="h-20" />;

  if (env.ios && !env.standalone) {
    return (
      <div className="rounded-2xl bg-ice-soft p-4">
        <div className="font-black">📱 iPhone&apos;da önce uygulamayı ana ekrana ekle</div>
        <p className="mt-1 text-sm font-semibold text-muted">
          Apple, bildirimlere sadece ana ekrana eklenmiş uygulamalarda izin veriyor (iOS 16.4 ve sonrası).
        </p>
        <IosInstallSteps />
      </div>
    );
  }

  if (!env.supported) {
    return (
      <p className="rounded-2xl bg-danger-soft p-4 font-bold text-danger">
        Bu tarayıcı bildirimleri desteklemiyor. Android&apos;de Chrome, iPhone&apos;da Safari kullan.
      </p>
    );
  }

  if (env.permission === "denied") {
    return (
      <p className="rounded-2xl bg-warn-soft p-4 font-bold text-xp-ink">
        Bildirim izni reddedilmiş. Telefonun <b>Ayarlar → Bildirimler</b> bölümünden (Android&apos;de tarayıcı/site
        ayarlarından) Two Of Us için izin verip bu sayfayı yenile.
      </p>
    );
  }

  const enable = () =>
    start(async () => {
      setMsg(null);
      try {
        const perm = await Notification.requestPermission();
        if (perm !== "granted") {
          setMsg("İzin verilmedi.");
          await reload();
          return;
        }
        const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
        await navigator.serviceWorker.ready;
        const sub =
          (await reg.pushManager.getSubscription()) ??
          (await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey),
          }));
        await subscribeAction(JSON.parse(JSON.stringify(sub)));
        const r = await testPushAction();
        setMsg(r.sent ? "Harika! Deneme bildirimi gönderildi 🎉" : "Kaydedildi ama deneme bildirimi gitmedi.");
      } catch (e) {
        setMsg(`Bir sorun oldu: ${(e as Error).message}`);
      }
      await reload();
    });

  const disable = () =>
    start(async () => {
      const reg = await navigator.serviceWorker.getRegistration("/");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await unsubscribeAction(sub.endpoint);
        await sub.unsubscribe();
      }
      setMsg("Bu cihazda bildirimler kapatıldı.");
      await reload();
    });

  const test = () =>
    start(async () => {
      // Sunucuda kayıt silinmiş olabilir; her ihtimale karşı tekrar kaydet
      const reg = await navigator.serviceWorker.getRegistration("/");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) await subscribeAction(JSON.parse(JSON.stringify(sub)));
      const r = await testPushAction();
      setMsg(r.sent ? "Gönderildi, birkaç saniye içinde gelir 📬" : "Gönderilemedi. Bildirimleri kapatıp tekrar aç.");
    });

  return (
    <div className="space-y-2">
      {env.subscribed ? (
        <>
          <div className="rounded-2xl bg-sage-soft p-3 font-bold text-sage-ink">✅ Bu cihazda bildirimler açık</div>
          <div className="grid grid-cols-2 gap-2">
            <button className="btn bg-surface text-ink" onClick={test} disabled={busy}>
              🔔 Dene
            </button>
            <button className="btn bg-surface text-muted" onClick={disable} disabled={busy}>
              Kapat
            </button>
          </div>
        </>
      ) : (
        <button className="btn w-full bg-ice-soft0 text-white" onClick={enable} disabled={busy}>
          {busy ? "Açılıyor..." : "🔔 Bildirimleri aç"}
        </button>
      )}
      {msg && <p className="animate-pop text-sm font-bold text-muted">{msg}</p>}
    </div>
  );
}
