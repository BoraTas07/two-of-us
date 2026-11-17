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
  const people = {
    me: { id: me.id, name: me.name, emoji: me.emoji, color: me.color },
    partner: { id: partner.id, name: partner.name, emoji: partner.emoji, color: partner.color },
  };
  const myCount = v.me.todayCount;
  const allDone = myCount.due > 0 && myCount.done >= myCount.due;

  return (
    <>
      <div className="mt-3 px-1">
        <div className="text-sm font-extrabold text-muted">{formatLong(v.today)}</div>
        <h1 className="text-2xl font-black">
          {greeting()}, {me.name}
        </h1>
      </div>

      <div className="card mt-3 p-4">
        <div className="flex items-center justify-between">
          <div className="font-black">
            {myCount.due === 0
              ? "Bugün planlı görevin yok"
              : allDone
                ? "Bugünlük hepsi tamam!"
                : `Bugün ${myCount.done}/${myCount.due} görev`}
          </div>
          <Flame streak={v.me.streak} lit={v.me.todayDone} />
        </div>
        <div className="mt-2">
          <ProgressBar value={myCount.done} max={Math.max(1, myCount.due)} color="var(--sage)" />
        </div>
        <p className="mt-2 text-sm font-semibold text-muted">
          {v.me.todayDone
            ? "Serin bugün için güvende 🔥"
            : myCount.due > 0
              ? "Hepsini bitir, serin büyüsün!"
              : "Bir görev bitirirsen serine sayılır."}
        </p>
      </div>

      <PushBanner />

      {rewards.toFulfill > 0 && (
        <Link href="/magaza" className="card mt-3 flex items-center gap-3 bg-rose-soft p-3">
          <span className="text-3xl">🎀</span>
          <div className="flex-1">
            <div className="font-black">{partner.name} bir hediyeni aldı</div>
            <div className="text-sm font-semibold text-muted">Yerine getirince mağazadan &quot;Teslim ettim&quot; de.</div>
          </div>
          <span className="font-black text-brand">›</span>
        </Link>
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

      <SectionTitle>{partner.name} bugün</SectionTitle>
      <div className="card p-4">
        <div className="flex items-center gap-3">
          <Avatar emoji={partner.emoji} color={partner.color} size={48} />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="font-black">
                {v.partner.todayCount.due === 0
                  ? "Planlı görev yok"
                  : `${v.partner.todayCount.done}/${v.partner.todayCount.due} tamam`}
              </span>
              <Flame streak={v.partner.streak} lit={v.partner.todayDone} size={18} />
            </div>
            <div className="mt-1.5">
              <ProgressBar
                value={v.partner.todayCount.done}
                max={Math.max(1, v.partner.todayCount.due)}
                color={colorOf(partner.color).bg}
                height={10}
              />
            </div>
          </div>
        </div>
        {v.theirs.length > 0 && (
          <details className="group mt-3">
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
        {!v.partner.todayDone && v.partner.todayCount.due > 0 && <NudgeButton name={partner.name} />}
      </div>

      <Link href="/biz" className="card mt-6 block p-4">
        <div className="flex items-center justify-between font-black">
          <span>
            🏆 Haftalık ortak hedef
            <span className="block text-xs font-semibold text-muted">Sadece 💞 ortak görevler sayılır</span>
          </span>
          <span className="text-sm text-muted">
            {Math.min(v.goal.total, v.goal.target)}/{v.goal.target} 🥕
          </span>
        </div>
        <div className="mt-2">
          <ProgressBar value={v.goal.total} max={v.goal.target} color="var(--rose)" />
        </div>
      </Link>
    </>
  );
}
