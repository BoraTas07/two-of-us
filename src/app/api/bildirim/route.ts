import { allProfiles, verifyAction } from "@/lib/auth";
import { completeTask, decideCompletion } from "@/lib/game";

// Bildirimdeki butonlar (ör. "✓ Tamamla", "✓ Onayla") buraya POST eder:
//   { token: "act.complete.<kişi>.<görev>.<bitiş>.<imza>", action: "complete" }
// Token sunucu tarafından imzalandığı için uygulama kapalıyken de güvenle çalışır.

export const dynamic = "force-dynamic";

type Body = { token?: string; action?: string };

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ ok: false, message: "Geçersiz istek" }, { status: 400 });
  }
  const act = await verifyAction(body.token ?? "");
  if (!act) {
    return Response.json({ ok: false, message: "Bu bildirim geçersiz ya da süresi dolmuş. Uygulamadan devam et." }, { status: 401 });
  }
  const me = (await allProfiles()).find((p) => p.id === act.profileId);
  if (!me) return Response.json({ ok: false, message: "Profil bulunamadı" }, { status: 404 });

  try {
    if (act.kind === "complete" && body.action === "complete") {
      const r = await completeTask(me, act.id);
      if (r.status === "already") return Response.json({ ok: true, title: "Zaten tamamlanmış ✓", body: "" });
      return Response.json({
        ok: true,
        title: r.status === "pending" ? "⏳ Onaya gönderildi" : `✓ Tamamlandı · +${r.xp} 🥕`,
        body: r.levelUp
          ? `Tebrikler, ${r.levelUp}. seviyeye çıktın!`
          : r.badges.length
            ? `Yeni rozet: ${r.badges.map((b) => `${b.emoji} ${b.name}`).join(", ")}`
            : r.status === "pending"
              ? "Partnerin onaylayınca havuçların gelecek."
              : "Harika gidiyorsun!",
      });
    }
    if (act.kind === "decide" && (body.action === "approve" || body.action === "reject")) {
      await decideCompletion(me, act.id, body.action === "approve");
      return Response.json({
        ok: true,
        title: body.action === "approve" ? "✓ Onaylandı" : "↩ Geri çevrildi",
        body: body.action === "approve" ? "Havuçlar verildi 🥕" : "Partnerine haber verildi.",
      });
    }
    return Response.json({ ok: false, message: "Bilinmeyen işlem" }, { status: 400 });
  } catch (e) {
    return Response.json({ ok: false, message: (e as Error).message }, { status: 409 });
  }
}
