import Hero from "@/components/hero";
import { requireUser } from "@/lib/auth";
import { distanceMeters, locationOf, sharingOf } from "@/lib/location";
import { colorOf } from "@/lib/types";
import LocationMap, { type MapPerson } from "@/components/location-map";
import { RequestButton, SharingCard } from "@/components/location-controls";
import { Avatar } from "@/components/ui";

export const metadata = { title: "Konum — Two Of Us" };

function ago(iso: string): string {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "az önce";
  if (min < 60) return `${min} dk önce`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} saat önce`;
  return `${Math.round(h / 24)} gün önce`;
}

function olderThan(iso: string, minutes: number): boolean {
  return Date.now() - new Date(iso).getTime() > minutes * 60 * 1000;
}

function distanceText(m: number): string {
  if (m < 50) return "yan yanasınız 💞";
  if (m < 1000) return `aranızda ~${Math.round(m / 10) * 10} m var`;
  return `aranızda ~${(m / 1000).toLocaleString("tr-TR", { maximumFractionDigits: m < 10000 ? 1 : 0 })} km var`;
}

export default async function LocationPage() {
  const { me, partner } = await requireUser();
  const [mySharing, partnerSharing, myLoc, partnerLoc] = await Promise.all([
    sharingOf(me.id),
    sharingOf(partner.id),
    locationOf(me.id),
    locationOf(partner.id),
  ]);

  const people: MapPerson[] = [];
  if (partnerLoc) people.push({ name: partner.name, emoji: partner.emoji, color: colorOf(partner.color).bg, ...partnerLoc });
  if (myLoc) people.push({ name: `${me.name} (sen)`, emoji: me.emoji, color: colorOf(me.color).bg, ...myLoc });
  const stale = !partnerLoc || olderThan(partnerLoc.updatedAt, 15);

  return (
    <>
      <Hero back="/" title="Konum" />

      <div className="card mt-3 p-3">
        {people.length ? (
          <LocationMap people={people} />
        ) : (
          <div className="flex h-48 flex-col items-center justify-center text-center text-sm font-semibold text-muted">
            <span className="text-4xl">🗺️</span>
            İkiniz de konum paylaşmıyorsunuz.
          </div>
        )}
        <div className="mt-3 flex items-center gap-3 px-1">
          <Avatar emoji={partner.emoji} color={partner.color} size={40} />
          <div className="min-w-0 flex-1 text-sm font-semibold">
            {partnerLoc ? (
              <>
                <div className="font-black">
                  {partner.name} · {ago(partnerLoc.updatedAt)}
                </div>
                <div className="text-muted">
                  {myLoc ? distanceText(distanceMeters(myLoc, partnerLoc)) : "Mesafe için senin konumun da gerekli"}
                  {partnerLoc.accuracy ? ` · ±${Math.round(partnerLoc.accuracy)} m` : ""}
                </div>
              </>
            ) : (
              <>
                <div className="font-black">{partner.name}</div>
                <div className="text-muted">
                  {partnerSharing ? "Henüz konum gelmedi; uygulamayı açınca güncellenecek." : "Konumunu paylaşmıyor."}
                </div>
              </>
            )}
          </div>
          {partnerLoc && (
            <a
              href={`https://www.google.com/maps?q=${partnerLoc.lat},${partnerLoc.lng}`}
              target="_blank"
              rel="noopener"
              className="chip bg-line px-3 py-1.5 text-ink"
            >
              Haritada aç
            </a>
          )}
        </div>
        {stale && (
          <div className="mt-3">
            <RequestButton partnerName={partner.name} />
          </div>
        )}
      </div>

      <div className="mt-4">
        <SharingCard
          sharing={mySharing}
          partnerName={partner.name}
          updatedText={myLoc ? ago(myLoc.updatedAt) : null}
        />
      </div>

      <p className="mt-4 px-1 text-xs font-semibold text-muted">
        Gizlilik: Sadece en son konum saklanır, konum geçmişi tutulmaz. Paylaşımı kapatınca kayıtlı konumun hemen silinir.
        Her biriniz kendi paylaşımını kendisi açar ve kapatır.
      </p>
    </>
  );
}
