import Image from "next/image";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { allProfiles } from "@/lib/auth";
import SetupForm from "./setup-form";

export const metadata = { title: "Kurulum — Two Of Us" };

export default async function SetupPage() {
  await connection();
  if ((await allProfiles()).length >= 2) redirect("/giris");
  return (
    <main className="safe-top mx-auto max-w-md px-4 pb-10">
      <div className="mt-6 mb-6 text-center">
        <Image src="/icon-192.png" alt="" width={72} height={72} priority className="animate-pop mx-auto rounded-[22px] shadow-sm" />
        <h1 className="mt-3 text-3xl">Two Of Us</h1>
        <p className="mt-1 font-serif text-lg text-muted italic">Hoş geldiniz</p>
        <p className="mt-1 font-semibold text-muted">
          İkinizin profilini oluşturalım. Bu ekran sadece bir kez görünür.
        </p>
      </div>
      <SetupForm />
    </main>
  );
}
