import Link from "next/link";
import { currentTheme } from "@/lib/theme-server";
import ThemeFx from "./theme-fx";
import { Icon } from "./icons";

/**
 * Her sayfanın üstündeki fotoğraflı, tema renginde başlık. Altı yuvarlak bir "sayfa" kenarıyla
 * biter; sayfanın içeriği onun altından devam eder.
 */
export default async function Hero({
  title,
  sub,
  desc,
  back,
  right,
  children,
  big = false,
}: {
  title: React.ReactNode;
  sub?: React.ReactNode;
  /** Başlığın altındaki kısa açıklama */
  desc?: React.ReactNode;
  back?: string;
  right?: React.ReactNode;
  children?: React.ReactNode;
  big?: boolean;
}) {
  const t = await currentTheme();
  return (
    <section className="hero">
      <div className="hero-bg" />
      {t.decor && <ThemeFx layers={t.def.fx} />}
      <div className="relative z-[1]">
        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1">
            {sub && <div className="hero-sub">{sub}</div>}
            <h1 className={`flex items-center gap-1 ${big ? "mt-1" : "mt-0.5 !text-[1.7rem]"}`}>
              {back && (
                <Link href={back} aria-label="Geri" className="-ml-2 shrink-0 rounded-full p-1 text-white/80">
                  <Icon name="back" size={22} />
                </Link>
              )}
              <span className="min-w-0">{title}</span>
            </h1>
            {desc && <p className="mt-1.5 text-[13px] leading-snug opacity-80">{desc}</p>}
          </div>
          {right}
        </div>
        {children}
      </div>
    </section>
  );
}
