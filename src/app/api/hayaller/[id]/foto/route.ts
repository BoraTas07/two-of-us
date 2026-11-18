import { allProfiles, sessionProfileId } from "@/lib/auth";
import { dreamPhoto } from "@/lib/dreams";

// Gerçekleşen hayalin fotoğrafı (sadece giriş yapmış iki kişi görebilir)
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const pid = await sessionProfileId();
  if (!(await allProfiles()).some((p) => p.id === pid)) return new Response("Giriş yapmalısın.", { status: 401 });
  const { id } = await ctx.params;
  const photo = await dreamPhoto(Number(id));
  if (!photo) return new Response("Bulunamadı", { status: 404 });
  return new Response(new Uint8Array(photo.data), {
    headers: { "Content-Type": photo.mime, "Cache-Control": "private, max-age=31536000, immutable" },
  });
}
