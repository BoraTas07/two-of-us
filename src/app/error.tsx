"use client"; // Hata sınırları istemci bileşeni olmalı

import { useEffect } from "react";

/** Veritabanına ulaşılamadığında vb. sonsuz beyaz ekran yerine gösterilir */
export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="safe-top mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
      <div className="text-5xl">🥕</div>
      <h1 className="mt-3 text-2xl">Bir şeyler ters gitti</h1>
      <p className="mt-2 font-semibold text-muted">
        Sunucuya şu an ulaşılamıyor. Birkaç saniye sonra tekrar dene; sorun sürerse biraz bekleyip uygulamayı yeniden
        aç.
      </p>
      <button className="btn mt-6 w-full bg-brand text-on-brand" onClick={() => retry()}>
        Tekrar dene
      </button>
    </main>
  );
}
