import Hero from "@/components/hero";
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
      <Hero back="/biz" title="Alışveriş listesi" />
      <ShoppingList items={items} frequent={frequent} me={P(me)} partner={P(partner)} />
    </>
  );
}
