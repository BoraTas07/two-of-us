import Link from "next/link";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { myQueuedQuestions, questionHistory, todayQuestion } from "@/lib/questions";
import { formatLong } from "@/lib/time";
import { AskForm, QuestionCard } from "@/components/question-card";

export const metadata = { title: "Sorular — Two Of Us" };

export default async function QuestionsPage() {
  await connection();
  const { me, partner } = await requireUser();
  const [q, history, queued] = await Promise.all([todayQuestion(), questionHistory(), myQueuedQuestions(me)]);
  const P = (p: typeof me) => ({ id: p.id, name: p.name, emoji: p.emoji });

  return (
    <>
      <div className="mt-3 flex items-center gap-2 px-1">
        <Link href="/biz" className="text-2xl text-muted" aria-label="Geri">
          ←
        </Link>
        <h1 className="text-2xl">Günün sorusu</h1>
      </div>
      <div className="mt-3">
        <QuestionCard q={q} me={P(me)} partner={P(partner)} />
      </div>
      <div className="mt-3">
        <AskForm queued={queued} />
      </div>

      {history.length > 0 && (
        <>
          <h2 className="mt-6 mb-2 px-1 text-lg">Önceki sorular</h2>
          <div className="space-y-2">
            {history.map((h) => {
              const mine = h.answers.find((a) => a.profile_id === me.id);
              const theirs = h.answers.find((a) => a.profile_id === partner.id);
              return (
                <details key={h.day} className="card group p-3">
                  <summary className="cursor-pointer list-none">
                    <div className="text-xs font-bold text-muted">{formatLong(h.day)}</div>
                    <div className="font-semibold">{h.text}</div>
                  </summary>
                  <div className="mt-2 space-y-1.5 text-sm">
                    {[
                      { p: me, who: "Sen", a: mine },
                      { p: partner, who: partner.name, a: theirs },
                    ].map(({ p, who, a }) => (
                      <p key={p.id} className="rounded-xl bg-bg px-3 py-2">
                        <b className="font-semibold">
                          {p.emoji} {who}:
                        </b>{" "}
                        {a ? a.text : <span className="text-muted">cevaplamadı</span>}
                      </p>
                    ))}
                  </div>
                </details>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
