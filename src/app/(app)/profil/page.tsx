import { headers } from "next/headers";
import { logoutAction } from "@/app/actions";
import { requireUser } from "@/lib/auth";
import { getConfig, sql } from "@/lib/db";
import { cronKey, vapidPublicKey } from "@/lib/push";
import { SectionTitle } from "@/components/ui";
import PushSettings from "@/components/push-settings";
import { PinForm, ProfileForm } from "@/components/profile-forms";
import CopyBox from "@/components/copy-box";

export const metadata = { title: "Profil — Two Of Us" };

export default async function ProfilePage() {
  const { me, partner } = await requireUser();
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const cronUrl = `${proto}://${host}/api/cron?key=${await cronKey()}`;
  const lastRun = await getConfig("cron_last_run");
  const partnerSubs = await sql`select 1 from push_subscriptions where profile_id = ${partner.id} limit 1`;

  const cronSql = `create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.schedule('ikimiz-hatirlatma', '* * * * *',
  $$ select net.http_get(url := '${cronUrl}') $$);`;

  return (
    <>
      <h1 className="mt-3 px-1 text-2xl font-black">Profil & Ayarlar</h1>

      <SectionTitle>Profilim</SectionTitle>
      <div className="card p-4">
        <ProfileForm initial={{ name: me.name, emoji: me.emoji, color: me.color }} />
      </div>

      <section id="bildirimler">
        <SectionTitle>🔔 Bildirimler</SectionTitle>
        <div className="card p-4">
          <PushSettings publicKey={await vapidPublicKey()} />
          <p className="mt-3 text-xs font-semibold text-muted">
            Bildirimler her cihazda ayrı açılır. {partner.name}:{" "}
            {partnerSubs.length ? "✅ en az bir cihazda açık" : "❌ henüz açmamış"}
          </p>
        </div>
      </section>

      <SectionTitle>🔒 PIN değiştir</SectionTitle>
      <div className="card p-4">
        <PinForm />
      </div>

      <details className="mt-6">
        <summary className="cursor-pointer px-1 text-lg font-black">⚙️ Zamanlayıcı kurulumu (bir kez)</summary>
        <div className="card mt-2 space-y-3 p-4 text-sm font-semibold">
          <p>
            Saatli hatırlatmaların gitmesi için bu adresin her dakika çağrılması gerekir. Supabase&apos;de{" "}
            <b>SQL Editor</b>&apos;ü aç, aşağıdaki kodu yapıştır ve <b>Run</b>&apos;a bas. Bir kere yapman yeterli.
          </p>
          <CopyBox text={cronSql} />
          <p className="text-muted">Sadece adres lazımsa (ör. cron-job.org için):</p>
          <CopyBox text={cronUrl} />
          <p className="text-xs text-muted">
            Son çalışma:{" "}
            {lastRun
              ? new Date(lastRun).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })
              : "henüz hiç çalışmadı (yukarıdaki kodu çalıştırdın mı?)"}
          </p>
        </div>
      </details>

      <form action={logoutAction} className="mt-8">
        <button className="btn w-full bg-surface text-muted">🔄 Profil değiştir / Çıkış</button>
      </form>
    </>
  );
}
