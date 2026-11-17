import { verifyWidgetToken } from "@/lib/auth";
import { originOf } from "@/lib/widget";
import { scriptableSource } from "@/lib/widget-scriptable";

// iPhone için: kişiye özel bağlantı gömülü Scriptable script'i.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const t = new URL(req.url).searchParams.get("t") ?? "";
  if (!(await verifyWidgetToken(t))) return new Response("Geçersiz bağlantı", { status: 401 });
  const origin = originOf(req);
  return new Response(scriptableSource(`${origin}/api/widget?t=${encodeURIComponent(t)}`), {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
