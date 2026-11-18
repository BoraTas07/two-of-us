import type { Metadata, Viewport } from "next";
import "@fontsource-variable/dm-sans";
import "@fontsource-variable/fraunces";
import "./globals.css";
import ThemeDecor from "@/components/theme-decor";
import { currentTheme } from "@/lib/theme-server";

export const metadata: Metadata = {
  title: "Two Of Us",
  description: "Birlikte hallediyoruz: ödüllü, hatırlatıcılı görev takibi",
  appleWebApp: { capable: true, title: "Two Of Us", statusBarStyle: "default" },
  icons: {
    icon: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/apple-icon.png", sizes: "180x180" }],
  },
};

export async function generateViewport(): Promise<Viewport> {
  const t = await currentTheme();
  return {
    themeColor: t.def.top,
    colorScheme: t.def.key === "gece" ? "dark" : "light",
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    viewportFit: "cover",
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const t = await currentTheme();
  return (
    <html lang="tr" data-theme={t.def.key} data-scene={t.decor && t.def.decor ? "" : undefined}>
      <body className="antialiased">
        {t.decor && <ThemeDecor decor={t.def.decor} theme={t.def.key} />}
        {children}
      </body>
    </html>
  );
}
