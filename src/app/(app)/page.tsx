import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { formatLong, nowHM } from "@/lib/time";
import { todayView } from "@/lib/views";
import { Avatar, Empty, Flame, ProgressBar, SectionTitle } from "@/components/ui";
import TaskCard from "@/components/task-card";
import PendingCard from "@/components/pending-card";
import PushBanner from "@/components/push-banner";
import NudgeButton from "@/components/nudge-button";
import { colorOf } from "@/lib/types";
import { pendingRewardCounts } from "@/lib/shop";
import { objectionsToAnswer } from "@/lib/objections";
import TogetherStrip from "@/components/together-strip";
import { SwapOffer } from "@/components/swap";

function allDoneColor(done: number, due: number) {
  return due > 0 && done >= due ? "var(--fire)" : "var(--sage)";
}

function Ring({ done, due }: { done: number; due: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const frac = due > 0 ? Math.min(1, done / due) : 0;
  return (
    <div className="relative flex h-16 w-16 shrink-0 items-center justify-center" aria-label={`Bugün ${done}/${due} görev`}>
      <svg viewBox="0 0 64 64" className="absolute inset-0 -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="var(--line)" strokeWidth="6" />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke={allDoneColor(done, due)}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - frac)}
        />
      </svg>
      <div className="text-center leading-none">
        <div className="text-sm font-black">
          {done}/{due}
        </div>
        <div className="mt-0.5 text-[10px] font-bold text-muted">görev</div>
      </div>
    </div>
  );
}

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
  const people = {
    me: { id: me.id, name: me.name, emoji: me.emoji, color: me.color },
    partner: { id: partner.id, name: partner.name, emoji: partner.emoji, color: partner.color },
  };
  const myCount = v.me.todayCount;
  const allDone = myCount.due > 0 && myCount.done >= myCount.due;

  return (
    <>
      <div className="mt-3 flex items-center gap-3 px-1">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-extrabold text-muted">{formatLong(v.today)}</div>
          <h1 className="truncate text-2xl font-black">
            {greeting()}, {me.name}
          </h1>
          <div className="mt-0.5 text-sm font-semibold text-muted">
            {myCount.due === 0
              ? "Bugün planlı görevin yok"
              : allDone
                ? "Bugünlük hepsi tamam! Serin güvende 🔥"
                : `${myCount.due - myCount.done} görevin kaldı`}
          </div>
        </div>
        <Ring done={myCount.done} due={myCount.due} />
      </div>

      <TogetherStrip me={me} partner={partner} today={v.today} />

      <div className="mt-3 space-y-1.5 empty:hidden">
        <PushBanner />
        {toAnswer.map((o) => (
          <Notice key={o.id} href={`/gorevler/${o.task_id}`} icon="⚖️" tone="bg-warn-soft">
            <b>{partner.name} itiraz etti</b> · {o.emoji} {o.title}
            {o.kind === "amount" ? ` · ${o.proposed_xp} 🥕 öneriyor` : ""}
          </Notice>
        ))}
        {rewards.toFulfill > 0 && (
          <Notice href="/magaza" icon="🎀" tone="bg-rose-soft">
            <b>{partner.name} bir hediyeni aldı</b> · teslim edince işaretle
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

      <SectionTitle right={<Link href="/gorevler/yeni" className="text-sm font-extrabold text-brand">+ Ekle</Link>}>
        Senin görevlerin
      </SectionTitle>
      {v.mine.length ? (
        <div className="space-y-2">
          {v.mine.map((t) => (
            <TaskCard key={t.id} item={t} me={people.me} partner={people.partner} today={v.today} />
          ))}
        </div>
      ) : (
        <Empty emoji="🌤️">Bugün sana ait görev yok. Keyfine bak!</Empty>
      )}

      {v.shared.length > 0 && (
        <>
          <SectionTitle>💞 Ortak görevler</SectionTitle>
          <div className="space-y-2">
            {v.shared.map((t) => (
              <TaskCard key={t.id} item={t} me={people.me} partner={people.partner} today={v.today} />
            ))}
          </div>
        </>
      )}


      <div className="card mt-6 p-3">
        <div className="flex items-center gap-3">
          <Avatar emoji={partner.emoji} color={partner.color} size={40} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-black">
                {partner.name} ·{" "}
                {v.partner.todayCount.due === 0
                  ? "planlı görev yok"
                  : `${v.partner.todayCount.done}/${v.partner.todayCount.due} tamam`}
              </span>
              <Flame streak={v.partner.streak} lit={v.partner.todayDone} size={15} />
            </div>
            <div className="mt-1.5">
              <ProgressBar
                value={v.partner.todayCount.done}
                max={Math.max(1, v.partner.todayCount.due)}
                color={colorOf(partner.color).bg}
                height={8}
              />
            </div>
          </div>
          {!v.partner.todayDone && v.partner.todayCount.due > 0 && <NudgeButton name={partner.name} compact />}
        </div>
        {v.theirs.length > 0 && (
          <details className="group mt-2">
            <summary className="cursor-pointer list-none text-sm font-extrabold text-brand">
              <span className="group-open:hidden">Görevlerini gör ▾</span>
              <span className="hidden group-open:inline">Gizle ▴</span>
            </summary>
            <div className="mt-2 space-y-2">
              {v.theirs.map((t) => (
                <TaskCard
                  key={t.id}
                  item={t}
                  me={people.me}
                  partner={people.partner}
                  today={v.today}
                  subsOpen={false}
                />
              ))}
            </div>
          </details>
        )}
        <Link href="/biz" className="mt-3 flex items-center gap-3 border-t border-line pt-3 text-sm">
          <span className="font-black">🏆 Ortak hedef</span>
          <div className="flex-1">
            <ProgressBar value={v.goal.total} max={v.goal.target} color="var(--rose)" height={8} />
          </div>
          <span className="font-bold text-muted">
            {Math.min(v.goal.total, v.goal.target)}/{v.goal.target} 🥕
          </span>
        </Link>
      </div>
    </>
  );
}
