"use client";

import { useEffect, useState, useTransition } from "react";
import { renewWidgetAction } from "@/app/actions";

type Platform = "ios" | "android" | "other";

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="chip mt-0.5 shrink-0 bg-brand text-on-brand">{n}</span>
      <span>{children}</span>
    </li>
  );
}

function CopyButton({ text, label, done }: { text: string; label: string; done: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      className="btn w-full bg-brand text-on-brand"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setOk(true);
          setTimeout(() => setOk(false), 2500);
        } catch {
          alert("Kopyalanamadı. Tarayıcı izin vermedi; tekrar dene.");
        }
      }}
    >
      {ok ? done : label}
    </button>
  );
}

function IosSteps({ script }: { script: string }) {
  return (
    <ol className="space-y-2.5 text-sm font-semibold">
      <Step n={1}>
        App Store&apos;dan ücretsiz <b>Scriptable</b> uygulamasını indir.
      </Step>
      <Step n={2}>
        Aşağıdaki butonla script&apos;i kopyala.
        <div className="mt-2">
          <CopyButton text={script} label="📋 Script'i kopyala" done="✓ Kopyalandı" />
        </div>
      </Step>
      <Step n={3}>
        Scriptable&apos;ı aç, sağ üstteki <b>+</b>&apos;ya dokun, kopyaladığını yapıştır. Üstteki başlığa dokunup adını{" "}
        <b>Two Of Us</b> yap ve <b>Done</b> de.
      </Step>
      <Step n={4}>
        Ana ekranda boş bir yere uzun bas → sol üstte <b>+</b> → <b>Scriptable</b> → boyut seç (orta boy önerilir) →{" "}
        <b>Widget Ekle</b>.
      </Step>
      <Step n={5}>
        Eklenen widget&apos;a uzun bas → <b>Widget&apos;ı Düzenle</b> → <b>Script</b>: Two Of Us. When Interacting:{" "}
        <b>Open URL</b> seçersen dokununca uygulama açılır.
      </Step>
    </ol>
  );
}

function AndroidSteps({ dataUrl }: { dataUrl: string }) {
  const deepLink = `twoofus://baglan?u=${encodeURIComponent(dataUrl)}`;
  return (
    <ol className="space-y-2.5 text-sm font-semibold">
      <Step n={1}>
        Widget uygulamasını indir.
        <a href="/two-of-us-widget.apk" download className="btn mt-2 w-full bg-brand text-on-brand">
          ⬇️ Widget uygulamasını indir (APK)
        </a>
      </Step>
      <Step n={2}>
        İnen dosyaya dokun. &quot;Bilinmeyen uygulamalar&quot; uyarısı çıkarsa <b>Ayarlar</b> → <b>Bu kaynağa izin ver</b>{" "}
        de ve <b>Yükle</b>&apos;ye bas. (Play Protect sorarsa <b>Yine de yükle</b>.)
      </Step>
      <Step n={3}>
        Kurulunca bu sayfaya dön ve widget&apos;ı hesabına bağla:
        <a href={deepLink} className="btn mt-2 w-full bg-sage text-white">
          🔗 Android widget&apos;ını bağla
        </a>
        <span className="mt-1.5 block text-xs text-muted">
          Buton çalışmazsa: bağlantıyı kopyala, widget uygulamasını aç ve &quot;Panodan yapıştır&quot;a bas.
        </span>
        <div className="mt-2">
          <CopyButton text={dataUrl} label="Bağlantıyı kopyala" done="✓ Kopyalandı" />
        </div>
      </Step>
      <Step n={4}>
        Ana ekranda boş bir yere uzun bas → <b>Widget&apos;lar</b> → <b>Two Of Us</b> → ana ekrana sürükle.
      </Step>
    </ol>
  );
}

export default function WidgetSetup({ dataUrl, script }: { dataUrl: string; script: string }) {
  const [platform, setPlatform] = useState<Platform>("other");
  const [busy, start] = useTransition();
  useEffect(() => {
    const ua = navigator.userAgent;
    // Tarayıcıya göre ilgili talimat önce gösterilir
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlatform(/iPhone|iPad|iPod/.test(ua) ? "ios" : /Android/.test(ua) ? "android" : "other");
  }, []);

  const ios = (
    <details open={platform === "ios"} className="group">
      <summary className="cursor-pointer list-none py-2 font-black">📱 iPhone</summary>
      <IosSteps script={script} />
    </details>
  );
  const android = (
    <details open={platform === "android"} className="group">
      <summary className="cursor-pointer list-none py-2 font-black">🤖 Android</summary>
      <AndroidSteps dataUrl={dataUrl} />
    </details>
  );

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-muted">
        Ana ekranında bugünkü görevlerin, serin, havucun ve partnerinin durumu görünsün. Widget&apos;a dokununca
        uygulama açılır; görevleri yine uygulamadan işaretlersin.
      </p>
      <div className="divide-y divide-line">
        {platform === "android" ? (
          <>
            {android}
            {ios}
          </>
        ) : (
          <>
            {ios}
            {android}
          </>
        )}
      </div>
      <button
        type="button"
        className="btn mt-2 w-full bg-surface text-sm text-muted"
        disabled={busy}
        onClick={() => {
          if (!confirm("Widget bağlantısı yenilensin mi? Kurulu widget'lar çalışmaz olur, yeniden bağlaman gerekir."))
            return;
          start(async () => void (await renewWidgetAction()));
        }}
      >
        🔄 Bağlantıyı yenile
      </button>
      <p className="text-xs font-semibold text-muted">
        Bu bağlantı sana özel; paylaşırsan başkası bugünkü özetini görebilir. Öyle olursa yenile.
      </p>
    </div>
  );
}
