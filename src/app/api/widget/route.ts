import { verifyWidgetToken } from "@/lib/auth";
import { originOf, widgetData } from "@/lib/widget";

// Ana ekran widget'ının (iPhone Scriptable / Android uygulaması) çektiği salt-okunur özet.
//   GET /api/widget?t=<kişiye özel widget anahtarı>

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const t = new URL(req.url).searchParams.get("t") ?? "";
  const pid = await verifyWidgetToken(t);
  if (!pid) {
    return Response.json(
      { error: "Widget bağlantısı geçersiz. Uygulamada Profil > Widget bölümünden yeniden bağla." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }
  const data = await widgetData(pid, originOf(req));
  if (!data) return Response.json({ error: "Profil bulunamadı" }, { status: 404 });
  return Response.json(data, { headers: { "Cache-Control": "no-store" } });
}
