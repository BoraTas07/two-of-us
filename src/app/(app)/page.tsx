import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { formatLong, nowHM } from "@/lib/time";
import { todayView } from "@/lib/views";
import { Avatar, SectionTitle } from "@/components/ui";
import Hero from "@/components/hero";
import { Icon } from "@/components/icons";
import TaskCard from "@/components/task-card";
import PendingCard from "@/components/pending-card";
import PushBanner from "@/components/push-banner";
import NudgeButton from "@/components/nudge-button";
import { pendingRewardCounts } from "@/lib/shop";
import { objectionsToAnswer } from "@/lib/objections";
import TogetherStrip from "@/components/together-strip";
import { SwapOffer } from "@/components/swap";
import { currentTheme } from "@/lib/theme-server";

function Notice({ href, icon, tone, children }: { href: string; icon: string; tone: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={`flex items-center gap-2.5 rounded-2xl px-3 py-2.5 text-sm ${tone}`}>
      <span className="text-lg leading-none">{icon}</span>
      <span className="min-w-0 flex-1 truncate font-semibold">{children}</span>
      <span className="font-black text-brand">›</span>
    </Link>
  );
}

function greeting() {
  const h = Number(nowHM().slice(0, 2));
  if (h < 5) return "İyi geceler";
  if (h < 12) return "Günaydın";
  if (h < 18) return "İyi günler";
  return "İyi akşamlar";
}

export default async function TodayPage() {
  const { me, partner } = await requireUser();
  const v = await todayView(me, partner);
  const rewards = await pendingRewardCounts(me.id);
  const toAnswer = await objectionsToAnswer(me.id);
  const theme = await currentTheme();
  const people = {
    me: { id: me.id, name: me.name, emoji: me.emoji, color: me.color },
    partner: { id: partner.id, name: partner.name, emoji: partner.emoji, color: partner.color },
  };
  const myCount = v.me.todayCount;
  const allDone = myCount.due > 0 && myCount.done >= myCount.due;

  const pct = myCount.due ? Math.round((myCount.done / myCount.due) * 100) : 0;

  return (
    <>
      <Hero big sub={`Bugün · ${formatLong(v.today)}`} title={theme.greeting ?? <>{greeting()},<br />{me.name}.</>}>
        <div className="mt-4 flex gap-2">
          {v.week.map((d) => (
            <div
              key={d.day}
              className={`flex-1 rounded-2xl py-1.5 text-center text-[11px] ${d.today ? "bg-[#f6ece4] text-head" : "bg-white/12 text-white/75"}`}
            >
              {d.wd}
              <b className={`block font-serif text-[17px] leading-tight font-medium ${d.today ? "text-head" : "text-white"}`}>{d.num}</b>
              <span className={`mx-auto mt-0.5 block h-1 w-1 rounded-full ${d.done ? (d.today ? "bg-head" : "bg-white") : "bg-transparent"}`} />
            </div>
          ))}
        </div>
      </Hero>

      <TogetherStrip me={me} partner={partner} today={v.today} />

      <div className="mt-3 space-y-2 empty:hidden">
        <PushBanner />
        {toAnswer.map((o) => (
          <Notice key={o.id} href={`/gorevler/${o.task_id}`} icon="⚖️" tone="bg-warn-soft">
            <b>{partner.name} itiraz etti</b> · {o.emoji} {o.title}
            {o.kind === "amount" ? ` · ${o.proposed_xp} 🥕 öneriyor` : ""}
          </Notice>
        ))}
        {rewards.toFulfill > 0 && (
          <Notice href="/magaza" icon="🎀" tone="bg-rose-soft">
            <b>
              {partner.name} senden {rewards.toFulfill > 1 ? `${rewards.toFulfill} ödül` : "bir ödül"} talep ediyor
            </b>{" "}
            · teslim edince işaretle
          </Notice>
        )}
      </div>

      {v.swapOffers.length > 0 && (
        <div id="takas" className="mt-3 scroll-mt-24 space-y-2">
          {v.swapOffers.map((o) => (
            <SwapOffer
              key={o.id}
              id={o.id}
              title={o.title}
              emoji={o.emoji}
              xp={o.xp}
              bonus={o.bonus}
              partnerName={partner.name}
            />
          ))}
        </div>
      )}

      {v.pending.length > 0 && (
        <div id="onay" className="scroll-mt-24">
          <SectionTitle>🙋 {partner.name} onayını bekliyor</SectionTitle>
          <div className="space-y-2">
            {v.pending.map((p) => (
              <PendingCard key={p.id} p={p} partnerName={partner.name} />
            ))}
          </div>
        </div>
      )}

      <div className="card mt-4 px-4 pt-4 pb-1.5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl">Bugünün planı</h2>
          <span className="text-xs text-muted">
            {myCount.done} / {myCount.due} · %{pct}
          </span>
        </div>
        <div className="mt-2.5 h-[5px] overflow-hidden rounded-full bg-line/70">
          <div className="h-full rounded-full bg-brand transition-[width] duration-500" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-2 text-xs text-muted">
          {myCount.due === 0
            ? "Bugün planlı görevin yok."
            : allDone
              ? "Bugünlük hepsi tamam. Serin güvende."
              : `${myCount.due - myCount.done} görevin kaldı; hepsini bitirirsen serin büyür.`}
        </p>
        <div className="mt-1 divide-y divide-line/70">
          {v.mine.map((t) => (
            <TaskCard key={t.id} item={t} me={people.me} partner={people.partner} today={v.today} variant="row" />
          ))}
        </div>
        {v.shared.length > 0 && (
          <>
            <div className="mt-2 border-t border-line/70 pt-3 text-[11px] font-semibold tracking-wider text-muted uppercase">Birlikte</div>
            <div className="divide-y divide-line/70">
              {v.shared.map((t) => (
                <TaskCard key={t.id} item={t} me={people.me} partner={people.partner} today={v.today} variant="row" />
              ))}
            </div>
          </>
        )}
        {v.mine.length === 0 && v.shared.length === 0 && <p className="py-4 text-center text-sm text-muted">Bugün sana ait görev yok. Keyfine bak.</p>}
        <Link href="/gorevler/yeni" className="flex items-center gap-3 border-t border-line/70 py-3 text-sm text-brand">
          <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full border-[1.5px] border-dashed border-brand/60">
            <Icon name="plus" size={14} />
          </span>
          Görev ekle
        </Link>
      </div>

      <div className={`mt-3 rounded-[1.25rem] bg-accent p-4 text-[#f3efe6] ${theme.def.plaid ? "ekose" : ""}`}>
        <div className="flex items-center gap-3">
          <Avatar emoji={partner.emoji} color={partner.color} size={42} />
          <div className="min-w-0 flex-1">
            <div className="font-serif text-lg leading-tight">
              {partner.name} bugün ·{" "}
              {v.partner.todayCount.due === 0 ? "plan yok" : `${v.partner.todayCount.done}/${v.partner.todayCount.due}`}
            </div>
            <div className="mt-0.5 flex items-center gap-1 text-xs opacity-80">
              <Icon name="flame" size={13} /> {v.partner.streak} gün seri
              {v.partner.todayDone ? " · bugün tamam" : ""}
            </div>
          </div>
          {!v.partner.todayDone && v.partner.todayCount.due > 0 && <NudgeButton name={partner.name} compact />}
        </div>
        {v.theirs.length > 0 && (
          <details className="group mt-3">
            <summary className="cursor-pointer list-none text-sm font-semibold opacity-90">
              <span className="group-open:hidden">Görevlerini gör ▾</span>
              <span className="hidden group-open:inline">Gizle ▴</span>
            </summary>
            <div className="mt-2 space-y-2 text-ink">
              {v.theirs.map((t) => (
                <TaskCard key={t.id} item={t} me={people.me} partner={people.partner} today={v.today} subsOpen={false} />
              ))}
            </div>
          </details>
        )}
      </div>

      <Link href="/biz" className="card mt-3 flex items-center gap-3 px-4 py-3 text-sm">
        <span className="font-serif text-base">Ortak hedef</span>
        <div className="h-[5px] flex-1 overflow-hidden rounded-full bg-line/70">
          <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, Math.round((v.goal.total / Math.max(1, v.goal.target)) * 100))}%` }} />
        </div>
        <span className="text-xs text-muted">
          {Math.min(v.goal.total, v.goal.target)}/{v.goal.target}
        </span>
      </Link>
    </>
  );
}
