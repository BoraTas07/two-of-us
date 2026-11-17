import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { todayStr, weekday } from "@/lib/time";
import TaskForm from "@/components/task-form";

export const metadata = { title: "Yeni görev — Two Of Us" };

export default async function NewTaskPage() {
  const { partner } = await requireUser();
  const today = todayStr();
  return (
    <>
      <div className="mt-3 mb-4 flex items-center gap-2 px-1">
        <Link href="/gorevler" className="text-2xl text-muted" aria-label="Geri">
          ←
        </Link>
        <h1 className="text-2xl font-black">Yeni görev</h1>
      </div>
      <TaskForm
        partnerName={partner.name}
        today={today}
        initial={{
          title: "",
          emoji: "✅",
          notes: "",
          kind: "recurring",
          who: "me",
          xp: 10,
          approval: false,
          due: "",
          repeat: "daily",
          days: [weekday(today)],
          dom: Number(today.slice(8, 10)),
          remind: "",
        }}
      />
    </>
  );
}
