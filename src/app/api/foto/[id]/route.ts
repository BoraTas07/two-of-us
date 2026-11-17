import { allProfiles, sessionProfileId } from "@/lib/auth";
import { takePhoto } from "@/lib/photos";

// Tek gösterimlik görüntüleme: ilk istekte fotoğrafı verir ve siler; sonrakiler 410.
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const pid = await sessionProfileId();
  const me = (await allProfiles()).find((p) => p.id === pid);
  if (!me) return new Response("Giriş yapmalısın.", { status: 401 });
  const { id } = await ctx.params;
  const photo = await takePhoto(me, Number(id));
  if (!photo) return new Response("Bu fotoğraf zaten görüldü ya da silindi.", { status: 410 });
  return new Response(new Uint8Array(photo.data), {
    headers: {
      "Content-Type": photo.mime,
      "Cache-Control": "no-store, private",
      "Content-Disposition": "inline",
    },
  });
}
