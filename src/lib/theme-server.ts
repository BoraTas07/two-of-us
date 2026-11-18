import "server-only";
import { cache } from "react";
import { connection } from "next/server";
import { sessionProfileId } from "./auth";
import { ensureSchema, getConfig, sql } from "./db";
import { THEMES, autoTheme, resolveTheme, type ThemeContext, type ThemeDef } from "./themes";
import { todayStr } from "./time";

export type CurrentTheme = {
  def: ThemeDef;
  greeting: string | null;
  decor: boolean;
  /** Kişinin seçimi ('auto' ya da tema anahtarı) */
  choice: string;
  /** Otomatik seçilseydi bugün hangi tema olurdu */
  autoKey: ThemeDef["key"];
  birthday: string | null;
  anniversary: string | null;
};

/** Bu istekte gösterilecek tema (bir istekte bir kez hesaplanır) */
export const currentTheme = cache(async (): Promise<CurrentTheme> => {
  // Tema güne ve kişiye göre değişir: sayfa her istekte çizilmeli (try dışında olmalı)
  await connection();
  const today = todayStr();
  try {
    await ensureSchema();
    const pid = await sessionProfileId();
    const people = await sql<{ id: number; name: string; theme: string; decor: boolean; birthday: string | null }[]>`
      select id, name, theme, decor, birthday from profiles order by id`;
    const me = people.find((p) => p.id === pid);
    const anniversary = (await getConfig("anniversary")) || null;
    const ctx: ThemeContext = {
      people: people.map((p) => ({ name: p.name, birthday: p.birthday, isMe: p.id === pid })),
      anniversary,
    };
    // Giriş yapmamışken kimsenin doğum günü/yıl dönümü sızmasın: sadece mevsim
    const r = me ? resolveTheme(me.theme, today, ctx) : autoTheme(today, { people: [], anniversary: null });
    return {
      def: THEMES[r.key],
      greeting: me ? r.greeting : null,
      decor: me ? me.decor : true,
      choice: me?.theme ?? "auto",
      autoKey: autoTheme(today, ctx).key,
      birthday: me?.birthday ?? null,
      anniversary,
    };
  } catch {
    const r = autoTheme(today, { people: [], anniversary: null });
    return { def: THEMES[r.key], greeting: null, decor: true, choice: "auto", autoKey: r.key, birthday: null, anniversary: null };
  }
});
