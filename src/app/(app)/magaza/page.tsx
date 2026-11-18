import Link from "next/link";
import Hero from "@/components/hero";
import { requireUser } from "@/lib/auth";
import { shopView } from "@/lib/shop";
import { formatShort, todayStr } from "@/lib/time";
import { Empty, SectionTitle } from "@/components/ui";
import { BuyButton, FulfillButton } from "@/components/shop-buttons";

export const metadata = { title: "Mağaza — Two Of Us" };

export default async function ShopPage() {
  const { me, partner } = await requireUser();
  const v = await shopView(me, partner);
  const day = (iso: string) => formatShort(todayStr(new Date(iso)));

  return (
    <>
      <Hero
        title="Mağaza"
        desc="Havuçlarını birbirinizden ödül istemek için harca."
        right={
          <Link href="/magaza/yeni" className="btn mb-1 bg-[#f6ece4] px-3.5 py-2 text-sm text-head">
            + Ödül
          </Link>
        }
      />

      <div className="card mt-3 flex items-center gap-4 p-4">
        <span className="text-4xl" aria-hidden>
          🥕
        </span>
        <div className="flex-1">
          <div className="text-sm font-semibold text-muted">Harcanabilir havucun</div>
          <div className="font-serif text-3xl">{v.balance}</div>
        </div>
        <div className="text-right text-xs font-semibold text-muted">
          {partner.emoji} {partner.name}
          <div className="text-base text-ink">🥕 {v.partnerBalance}</div>
        </div>
      </div>

      {v.toFulfill.length > 0 && (
        <>
          <SectionTitle>🎀 {partner.name} senden talep ediyor</SectionTitle>
          <div className="space-y-2">
            {v.toFulfill.map((p) => (
              <div key={p.id} className="card flex items-center gap-3 bg-warn-soft p-3">
                <span className="text-3xl">{p.emoji}</span>
                <div className="min-w-0 flex-1">
                  <div className="font-extrabold">{p.title}</div>
                  <div className="text-xs font-semibold text-muted">
                    {day(p.created_at)} talep etti · {p.cost} 🥕 karşılığında
                  </div>
                </div>
                <FulfillButton id={p.id} label="Teslim ettim" />
              </div>
            ))}
          </div>
        </>
      )}

      {v.waiting.length > 0 && (
        <>
          <SectionTitle>🛍️ Aldıkların</SectionTitle>
          <div className="space-y-2">
            {v.waiting.map((p) => (
              <div key={p.id} className="card flex items-center gap-3 p-3">
                <span className="text-3xl">{p.emoji}</span>
                <div className="min-w-0 flex-1">
                  <div className="font-extrabold">{p.title}</div>
                  <div className="text-xs font-semibold text-muted">
                    {day(p.created_at)} · {p.cost} 🥕
                  </div>
                </div>
                {p.giver_id === me.id ? (
                  <FulfillButton id={p.id} label="Kullandım" />
                ) : (
                  <span className="max-w-24 text-right text-xs leading-tight font-semibold text-muted">
                    {partner.name} teslim edecek
                  </span>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      <SectionTitle right={<span className="text-sm font-semibold text-muted">🥕 {v.balance}</span>}>
        {me.emoji} Alabileceklerin
      </SectionTitle>
      {v.forMe.length ? (
        <div className="space-y-2">
          {v.forMe.map((r) => {
            const gift = r.creator_id !== me.id;
            return (
              <div key={r.id} className="card flex items-center gap-3 p-3">
                <span className="text-3xl">{r.emoji}</span>
                <div className="min-w-0 flex-1">
                  {gift ? (
                    <div className="font-extrabold">{r.title}</div>
                  ) : (
                    <Link href={`/magaza/${r.id}`} className="font-extrabold">
                      {r.title}
                    </Link>
                  )}
                  <div className="mt-0.5 flex flex-wrap gap-1">
                    <span className="chip bg-xp-soft text-xp-ink">🥕 {r.cost}</span>
                    {gift && (
                      <span className="chip bg-rose-soft text-ink">
                        🎁 Hediye · {partner.emoji} {partner.name}
                      </span>
                    )}
                  </div>
                </div>
                <BuyButton id={r.id} title={r.title} cost={r.cost} balance={v.balance} />
              </div>
            );
          })}
        </div>
      ) : (
        <Empty emoji="🛍️">
          Henüz ödül yok. Kendine bir hedef ödül ekle, ya da {partner.name} sana bir hediye tanımlasın.
        </Empty>
      )}

      <SectionTitle right={<span className="text-sm font-semibold text-muted">🥕 {v.partnerBalance}</span>}>
        {partner.emoji} {partner.name} alabilecekleri
      </SectionTitle>
      {v.forPartner.length ? (
        <div className="space-y-2">
          {v.forPartner.map((r) => {
            const myGift = r.creator_id === me.id;
            const missing = r.cost - v.partnerBalance;
            const body = (
              <>
                <span className="text-3xl">{r.emoji}</span>
                <div className="min-w-0 flex-1">
                  <div className="font-extrabold">{r.title}</div>
                  <div className="mt-0.5 flex flex-wrap gap-1">
                    <span className="chip bg-xp-soft text-xp-ink">🥕 {r.cost}</span>
                    <span className={`chip ${myGift ? "bg-rose-soft text-ink" : "bg-line text-muted"}`}>
                      {myGift ? "🎁 Senin hediyen" : "Kendi ödülü"}
                    </span>
                  </div>
                </div>
                <span className="max-w-24 text-right text-xs leading-tight font-semibold text-muted">
                  {missing > 0 ? `${missing} 🥕 daha` : "Alabilir ✓"}
                </span>
                {myGift && <span className="text-muted">›</span>}
              </>
            );
            return myGift ? (
              <Link key={r.id} href={`/magaza/${r.id}`} className="card flex items-center gap-3 p-3">
                {body}
              </Link>
            ) : (
              <div key={r.id} className="card flex items-center gap-3 p-3">
                {body}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="px-1 text-sm font-semibold text-muted">
          {partner.name} için henüz ödül yok. Kendi havuçlarıyla alabilsin diye bir hediye ekle: masaj, kahvaltı, film
          gecesi seçimi…
        </p>
      )}

      {v.partnerWaiting.length > 0 && (
        <div className="mt-2 space-y-1 px-1">
          {v.partnerWaiting.map((p) => (
            <p key={p.id} className="text-xs font-semibold text-muted">
              🛍️ {partner.name} {day(p.created_at)} günü aldı, henüz kullanmadı: {p.emoji} {p.title}
            </p>
          ))}
        </div>
      )}

      {v.history.length > 0 && (
        <details className="mt-6">
          <summary className="cursor-pointer px-1 font-serif text-lg">Geçmiş</summary>
          <ul className="card mt-2 divide-y divide-line">
            {v.history.map((p) => (
              <li key={p.id} className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold">
                <span>{p.emoji}</span>
                <span className="flex-1">{p.title}</span>
                <span>{p.buyer_id === me.id ? me.emoji : partner.emoji}</span>
                <span className="text-xs text-muted">{p.fulfilled_at ? day(p.fulfilled_at) : ""}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}
