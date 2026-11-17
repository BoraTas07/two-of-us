import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getReward } from "@/lib/shop";
import RewardForm from "@/components/reward-form";

export const metadata = { title: "Ödülü düzenle — Two Of Us" };

export default async function EditRewardPage({ params }: { params: Promise<{ id: string }> }) {
  const { me, partner } = await requireUser();
  const { id } = await params;
  const r = await getReward(Number(id));
  if (!r) notFound();

  return (
    <>
      <div className="mt-3 mb-4 flex items-center gap-2 px-1">
        <Link href="/magaza" className="text-2xl text-muted" aria-label="Geri">
          ←
        </Link>
        <h1 className="text-2xl">
          {r.emoji} {r.title}
        </h1>
      </div>
      {r.creator_id === me.id ? (
        <RewardForm
          partnerName={partner.name}
          initial={{ id: r.id, title: r.title, emoji: r.emoji, cost: r.cost, forWho: r.buyer_id === me.id ? "me" : "partner" }}
        />
      ) : (
        <div className="card p-4 font-semibold text-muted">
          Bu ödülü {partner.name} tanımladı; sadece o değiştirebilir. Fiyatı: 🥕 {r.cost}
        </div>
      )}
    </>
  );
}
