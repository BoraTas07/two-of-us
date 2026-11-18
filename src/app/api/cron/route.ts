import { timingSafeEqual } from "node:crypto";
import { allProfiles, signAction } from "@/lib/auth";
import { activeTasks, completionFor, loadSubtasks, evaluateStreaks, indexCompletions, loadCompletions, relevantTo } from "@/lib/game";
import { setConfig } from "@/lib/db";
import { purgeOldPhotos } from "@/lib/photos";
import { purgeOldNotifications } from "@/lib/notifications";
import { moodAskTime, moodsForDay } from "@/lib/moods";
import { cronKey, markSent, sendPush } from "@/lib/push";
import { isDueOn } from "@/lib/recurrence";
import { addDays, nowHM, todayStr } from "@/lib/time";

// Her dakika (ya da birkaç dakikada bir) çağrılır:
//   GET /api/cron?key=GIZLI_ANAHTAR
// 1) Geçmiş günleri seriye işler  2) Saati gelen görev hatırlatmalarını yollar
// 3) Sabah özeti (09:00) ve akşam "serin tehlikede" uyarısı (21:00) gönderir.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MORNING = "09:00";
const EVENING = "21:00";

function same(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const given = url.searchParams.get("key") ?? req.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!same(given, await cronKey())) {
    return Response.json({ error: "yetkisiz" }, { status: 401 });
  }

  const now = new Date();
  const today = todayStr(now);
  const hm = nowHM(now);

  await evaluateStreaks(today);
  await purgeOldPhotos();
  await purgeOldNotifications();

  const profiles = await allProfiles();
  const tasks = await activeTasks();
  const idx = indexCompletions(await loadCompletions(addDays(today, -1)), tasks);
  const sent: string[] = [];
  const withSubs = new Set((await loadSubtasks()).map((x) => x.task_id));
  const moodDone = new Set((await moodsForDay(today)).map((m) => m.profile_id));

  for (const p of profiles) {
    // Bugün yapılacaklar + tarihi geçmiş ya da tarihsiz, henüz bitmemiş tek seferlik görevler
    const mineToday = tasks.filter(
      (t) =>
        relevantTo(t, p.id) &&
        (isDueOn(t, today) ||
          (t.kind === "once" && !completionFor(t, today, idx) && (!t.due_date || t.due_date < today))),
    );
    const open = mineToday.filter((t) => !completionFor(t, today, idx));

    // Görev hatırlatmaları
    for (const t of open) {
      if (!t.remind_time || t.remind_time > hm) continue;
      if (await markSent(`r:${t.id}:${today}:${p.id}`)) {
        await sendPush(p.id, {
          title: `⏰ ${t.emoji} ${t.title}`,
          body:
            t.assignee_id === null
              ? `Ortak görev zamanı! Bitiren ikinize de +${t.xp} 🥕 kazandırır.`
              : `Hatırlatma: bunu bitir, +${t.xp} 🥕 kap!`,
          url: `/gorevler/${t.id}`,
          tag: `task-${t.id}`,
          actions: [{ action: "complete", title: withSubs.has(t.id) ? "✓ Hepsini bitir" : "✓ Tamamla" }],
          token: await signAction("complete", p.id, t.id, 36 * 3600),
        });
        sent.push(`hatırlatma ${p.name}: ${t.title}`);
      }
    }

    // Günün rastgele saatinde "Şu an nasıl hissediyorsun?" (bugün henüz cevaplamadıysa)
    if (hm >= moodAskTime(p.id, today) && !moodDone.has(p.id) && (await markSent(`mood:${today}:${p.id}`))) {
      await sendPush(p.id, {
        title: "💭 Şu an nasıl hissediyorsun?",
        body: "Bir dokunuşla seç; partnerin de görsün.",
        url: "/biz#his",
        tag: "mood-ask",
      });
      sent.push(`ruh hali ${p.name}`);
    }

    // Sabah özeti
    if (hm >= MORNING && hm < "12:00" && mineToday.length > 0 && (await markSent(`m:${today}:${p.id}`))) {
      await sendPush(p.id, {
        title: `☀️ Günaydın ${p.name}!`,
        body: `Bugün ${mineToday.length} görevin var. Serini sürdürmeye hazır mısın? 🔥`,
        url: "/",
        tag: "morning",
      });
      sent.push(`sabah ${p.name}`);
    }

    // Akşam uyarısı
    if (hm >= EVENING && open.length > 0 && (await markSent(`e:${today}:${p.id}`))) {
      const streak = p.streak;
      await sendPush(p.id, {
        title: streak > 0 ? `🔥 ${streak} günlük serin tehlikede!` : "🌙 Gün bitmeden...",
        body: `${open.length} görev kaldı: ${open
          .slice(0, 3)
          .map((t) => t.title)
          .join(", ")}${open.length > 3 ? "…" : ""}`,
        url: "/",
        tag: "evening",
      });
      sent.push(`akşam ${p.name}`);
    }
  }

  await setConfig("cron_last_run", now.toISOString());
  return Response.json({ ok: true, today, time: hm, sent });
}
