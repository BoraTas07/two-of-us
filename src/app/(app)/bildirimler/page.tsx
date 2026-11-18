import Link from "next/link";
import Hero from "@/components/hero";
import { requireUser } from "@/lib/auth";
import { listNotifications, markAllRead } from "@/lib/notifications";
import { formatLong, formatRelative, todayStr } from "@/lib/time";
import { Empty } from "@/components/ui";

export const metadata = { title: "Bildirimler — Two Of Us" };

function time(iso: string) {
  return new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" });
}

export default async function NotificationsPage() {
  const { me, partner } = await requireUser();
  const items = await listNotifications(me.id);
  await markAllRead(me.id);
  const today = todayStr();
  const dayOf = (iso: string) => todayStr(new Date(iso));
  const days = [...new Set(items.map((n) => dayOf(n.created_at)))];

  return (
    <>
      <Hero back="/" title="Bildirimler" desc={<>{partner.emoji} {partner.name} ile ilgili son 60 gün.</>} />

      {items.length === 0 ? (
        <Empty emoji="🔔">Henüz bildirim yok.</Empty>
      ) : (
        <div className="space-y-4">
          {days.map((d) => (
            <section key={d}>
              <h2 className="mb-1.5 px-1 text-sm font-semibold text-muted">
                {["Bugün", "Dün"].includes(formatRelative(d, today)) ? `${formatRelative(d, today)} · ` : ""}
                {formatLong(d)}
              </h2>
              <ul className="card divide-y divide-line overflow-hidden">
                {items
                  .filter((n) => dayOf(n.created_at) === d)
                  .map((n) => (
                    <li key={n.id}>
                      <Link href={n.url} className={`flex gap-3 px-4 py-3 ${n.read ? "" : "bg-brand-soft/60"}`}>
                        <div className="min-w-0 flex-1">
                          <div className={`text-sm leading-snug ${n.read ? "font-semibold" : "font-black"}`}>{n.title}</div>
                          {n.body && <div className="mt-0.5 truncate text-sm text-muted">{n.body}</div>}
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <span className="text-xs font-semibold text-muted">{time(n.created_at)}</span>
                          {!n.read && <span className="h-2 w-2 rounded-full bg-brand" aria-label="Yeni" />}
                        </div>
                      </Link>
                    </li>
                  ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
