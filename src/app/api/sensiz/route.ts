import { allProfiles, sessionProfileId } from "@/lib/auth";
import { createMoment } from "@/lib/moments";
import { MAX_PHOTO_BYTES } from "@/lib/photos";

// "Sensiz İçime Sinmiyor" paylaşımı (multipart: text, photo?)
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const pid = await sessionProfileId();
  const profiles = await allProfiles();
  const me = profiles.find((p) => p.id === pid);
  const partner = profiles.find((p) => p.id !== pid);
  if (!me || !partner) return Response.json({ error: "Giriş yapmalısın." }, { status: 401 });

  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > MAX_PHOTO_BYTES + 64 * 1024) return Response.json({ error: "Fotoğraf çok büyük." }, { status: 413 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: "Geçersiz istek." }, { status: 400 });
  }
  const file = form.get("photo");
  const photo =
    file instanceof File && file.size > 0 ? { bytes: Buffer.from(await file.arrayBuffer()), mime: file.type } : null;
  const err = await createMoment(me, partner, String(form.get("text") ?? ""), photo);
  if (err) return Response.json({ error: err }, { status: 400 });
  return Response.json({ ok: true });
}
