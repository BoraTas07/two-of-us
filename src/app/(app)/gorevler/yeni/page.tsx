import Hero from "@/components/hero";
import { requireUser } from "@/lib/auth";
import { todayStr, weekday } from "@/lib/time";
import TaskForm from "@/components/task-form";

export const metadata = { title: "Yeni görev — Two Of Us" };

export default async function NewTaskPage() {
  const { partner } = await requireUser();
  const today = todayStr();
  return (
    <>
      <Hero back="/gorevler" title="Yeni görev" />
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
          photo: false,
          due: "",
          repeat: "daily",
          days: [weekday(today)],
          dom: Number(today.slice(8, 10)),
          remind: "",
          subtasks: [],
        }}
      />
    </>
  );
}
