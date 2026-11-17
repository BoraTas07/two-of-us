import Image from "next/image";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { allProfiles, sessionProfileId } from "@/lib/auth";
import LoginForm from "./login-form";

export const metadata = { title: "Giriş — Two Of Us" };

export default async function LoginPage() {
  await connection();
  const profiles = await allProfiles();
  if (profiles.length < 2) redirect("/kurulum");
  const current = await sessionProfileId();
  if (current && profiles.some((p) => p.id === current)) redirect("/");
  return (
    <main className="safe-top mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 pb-10">
      <div className="mb-8 text-center">
        <Image src="/icon-192.png" alt="" width={72} height={72} priority className="animate-pop mx-auto rounded-[22px] shadow-sm" />
        <div className="mt-3 text-xs font-semibold tracking-[0.2em] text-muted uppercase">Two Of Us</div>
        <h1 className="mt-1 text-3xl">Kim geldi?</h1>
      </div>
      <LoginForm profiles={profiles.map((p) => ({ id: p.id, name: p.name, emoji: p.emoji, color: p.color }))} />
    </main>
  );
}
