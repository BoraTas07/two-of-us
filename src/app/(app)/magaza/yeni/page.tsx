import Hero from "@/components/hero";
import { requireUser } from "@/lib/auth";
import RewardForm from "@/components/reward-form";

export const metadata = { title: "Yeni ödül — Two Of Us" };

export default async function NewRewardPage() {
  const { partner } = await requireUser();
  return (
    <>
      <Hero back="/magaza" title="Yeni ödül" />
      <RewardForm partnerName={partner.name} initial={{ title: "", emoji: "🎁", cost: 50, forWho: "me" }} />
    </>
  );
}
