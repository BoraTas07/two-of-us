import { allProfiles, sessionProfileId } from "@/lib/auth";
import { MAX_PHOTO_BYTES, attachPhoto } from "@/lib/photos";

// Kanıt fotoğrafı yükleme (multipart): completionId + photo
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const pid = await sessionProfileId();
  const me = (await allProfiles()).find((p) => p.id === pid);
  if (!me) return Response.json({ error: "Giriş yapmalısın." }, { status: 401 });

  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > MAX_PHOTO_BYTES + 64 * 1024) return Response.json({ error: "Fotoğraf çok büyük." }, { status: 413 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: "Geçersiz istek." }, { status: 400 });
  }
  const file = form.get("photo");
  const completionId = Number(form.get("completionId"));
  if (!(file instanceof File) || !completionId) return Response.json({ error: "Fotoğraf seçilmedi." }, { status: 400 });

  const err = await attachPhoto(me, completionId, Buffer.from(await file.arrayBuffer()), file.type);
  if (err) return Response.json({ error: err }, { status: 400 });
  return Response.json({ ok: true });
}
