import Link from "next/link";
import { requireUser } from "@/lib/auth";
import RewardForm from "@/components/reward-form";

export const metadata = { title: "Yeni ödül — Two Of Us" };

export default async function NewRewardPage() {
  const { partner } = await requireUser();
  return (
    <>
      <div className="mt-3 mb-4 flex items-center gap-2 px-1">
        <Link href="/magaza" className="text-2xl text-muted" aria-label="Geri">
          ←
        </Link>
        <h1 className="text-2xl">Yeni ödül</h1>
      </div>
      <RewardForm partnerName={partner.name} initial={{ title: "", emoji: "🎁", cost: 50, forWho: "me" }} />
    </>
  );
}
