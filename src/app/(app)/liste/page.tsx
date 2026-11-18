import Link from "next/link";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { frequentItems, openItems } from "@/lib/shopping";
import ShoppingList from "@/components/shopping";

export const metadata = { title: "Alışveriş listesi — Two Of Us" };

export default async function ShoppingPage() {
  await connection();
  const { me, partner } = await requireUser();
  const [items, frequent] = await Promise.all([openItems(), frequentItems()]);
  const P = (p: typeof me) => ({ id: p.id, name: p.name, emoji: p.emoji });
  return (
    <>
      <div className="mt-3 mb-3 flex items-center gap-2 px-1">
        <Link href="/biz" className="text-2xl text-muted" aria-label="Geri">
          ←
        </Link>
        <h1 className="text-2xl">🛒 Alışveriş listesi</h1>
      </div>
      <ShoppingList items={items} frequent={frequent} me={P(me)} partner={P(partner)} />
    </>
  );
}
