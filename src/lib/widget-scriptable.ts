// iPhone ana ekran widget'ı: ücretsiz "Scriptable" uygulamasında çalışan script.
// Kullanıcıya kişiye özel bağlantı gömülü halde verilir (/api/widget/scriptable).

export function scriptableSource(dataUrl: string): string {
  return `// Two Of Us — ana ekran widget'ı (Scriptable)
// Bu script sana özel bağlantı içerir; kimseyle paylaşma.
// Kurulum: Scriptable'da yeni script → bunu yapıştır → ana ekrana Scriptable widget'ı ekle
// → widget'a uzun bas → "Widget'ı Düzenle" → Script: bu script.

const DATA_URL = ${JSON.stringify(dataUrl)};

const C = {
  bg: Color.dynamic(new Color("#f4eee5"), new Color("#2a2420")),
  card: Color.dynamic(new Color("#fffcf7"), new Color("#352e29")),
  ink: Color.dynamic(new Color("#3b332d"), new Color("#f2ebe2")),
  muted: Color.dynamic(new Color("#877b6f"), new Color("#b3a698")),
  brand: new Color("#a65d3c"),
  honey: new Color("#b9893a"),
  sage: new Color("#6e8a5d"),
  fire: new Color("#c4692f"),
  track: new Color("#a65d3c", 0.18),
};

const fm = FileManager.local();
const cachePath = fm.joinPath(fm.documentsDirectory(), "two-of-us-widget.json");

async function load() {
  try {
    const req = new Request(DATA_URL);
    req.timeoutInterval = 15;
    const data = await req.loadJSON();
    const code = req.response ? req.response.statusCode : 200;
    if (code >= 400 || !data || data.error) throw new Error((data && data.error) || "Sunucu hatası " + code);
    fm.writeString(cachePath, JSON.stringify(data));
    return { data: data, stale: false };
  } catch (e) {
    if (fm.fileExists(cachePath)) {
      return { data: JSON.parse(fm.readString(cachePath)), stale: true };
    }
    return { error: String((e && e.message) || e) };
  }
}

function text(stack, str, size, color, weight) {
  const t = stack.addText(String(str));
  t.font =
    weight === "bold"
      ? Font.boldRoundedSystemFont(size)
      : weight === "semibold"
        ? Font.semiboldRoundedSystemFont(size)
        : Font.mediumRoundedSystemFont(size);
  t.textColor = color;
  t.lineLimit = 1;
  return t;
}

function bar(value, max, width, height, color) {
  const ctx = new DrawContext();
  ctx.size = new Size(width, height);
  ctx.opaque = false;
  ctx.respectScreenScale = true;
  const track = new Path();
  track.addRoundedRect(new Rect(0, 0, width, height), height / 2, height / 2);
  ctx.addPath(track);
  ctx.setFillColor(C.track);
  ctx.fillPath();
  const ratio = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  if (ratio > 0) {
    const fill = new Path();
    fill.addRoundedRect(new Rect(0, 0, Math.max(height, width * ratio), height), height / 2, height / 2);
    ctx.addPath(fill);
    ctx.setFillColor(color);
    ctx.fillPath();
  }
  return ctx.getImage();
}

function addBar(stack, value, max, width, height, color) {
  const img = stack.addImage(bar(value, max, width, height, color));
  img.imageSize = new Size(width, height);
  return img;
}

function todayLine(me) {
  if (me.due === 0) return "Bugün görev yok";
  if (me.done >= me.due) return "Bugünlük tamam ✓";
  return me.done + "/" + me.due + " görev";
}

function partnerLine(p) {
  const st = p.due === 0 ? "görev yok" : p.done + "/" + p.due;
  return p.emoji + " " + p.name + " · " + st + (p.streak > 0 ? "  🔥" + p.streak : "");
}

function stats(stack, me, size) {
  const row = stack.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();
  text(row, "🔥 " + me.streak, size, me.streakLit ? C.fire : C.muted, "bold");
  row.addSpacer(10);
  text(row, "🥕 " + me.carrots, size, C.honey, "bold");
}

function taskRow(stack, t, size) {
  const row = stack.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();
  const mark = t.done ? "✓" : t.pending ? "⏳" : "○";
  const m = text(row, mark, size, t.done ? C.sage : t.pending ? C.honey : C.brand, "bold");
  m.lineLimit = 1;
  row.addSpacer(6);
  const title = text(row, t.emoji + " " + t.title, size, t.done ? C.muted : C.ink, "semibold");
  title.minimumScaleFactor = 0.8;
  row.addSpacer();
  if (t.steps) {
    text(row, t.steps, size - 2, C.muted, "medium");
    row.addSpacer(6);
  }
  text(row, "🥕" + t.xp, size - 2, t.done ? C.muted : C.honey, "medium");
}

function small(w, d) {
  const head = w.addStack();
  head.layoutHorizontally();
  head.centerAlignContent();
  text(head, d.me.emoji, 18, C.ink, "bold");
  head.addSpacer(6);
  text(head, "Sv. " + d.me.level, 12, C.muted, "semibold");
  w.addSpacer(6);
  stats(w, d.me, 17);
  w.addSpacer(8);
  text(w, todayLine(d.me), 13, C.ink, "semibold");
  w.addSpacer(4);
  addBar(w, d.me.done, Math.max(1, d.me.due), 120, 7, C.sage);
  w.addSpacer();
  const p = text(w, partnerLine(d.partner), 11, C.muted, "medium");
  p.minimumScaleFactor = 0.7;
}

function summaryColumn(col, d) {
  const head = col.addStack();
  head.layoutHorizontally();
  head.centerAlignContent();
  text(head, d.me.emoji, 18, C.ink, "bold");
  head.addSpacer(6);
  text(head, d.me.name, 13, C.ink, "bold");
  col.addSpacer(2);
  text(col, "Sv. " + d.me.level + " · " + d.me.levelTitle, 11, C.muted, "medium");
  col.addSpacer(3);
  addBar(col, d.me.into, d.me.needed, 110, 6, C.honey);
  col.addSpacer(8);
  stats(col, d.me, 15);
  col.addSpacer(6);
  text(col, todayLine(d.me), 12, C.ink, "semibold");
  col.addSpacer(3);
  addBar(col, d.me.done, Math.max(1, d.me.due), 110, 6, C.sage);
}

function taskList(stack, d, max, size) {
  if (d.tasks.length === 0) {
    text(stack, "Bugün sana ait görev yok 🌤️", size, C.muted, "medium");
    return;
  }
  d.tasks.slice(0, max).forEach(function (t, i) {
    if (i > 0) stack.addSpacer(5);
    taskRow(stack, t, size);
  });
  const rest = d.tasks.length - max;
  if (rest > 0) {
    stack.addSpacer(4);
    text(stack, "+" + rest + " görev daha", size - 2, C.muted, "medium");
  }
}

function medium(w, d) {
  const body = w.addStack();
  body.layoutHorizontally();
  const left = body.addStack();
  left.layoutVertically();
  left.size = new Size(120, 0);
  summaryColumn(left, d);
  body.addSpacer(12);
  const right = body.addStack();
  right.layoutVertically();
  taskList(right, d, 4, 12);
  w.addSpacer();
  const p = text(w, partnerLine(d.partner), 11, C.muted, "medium");
  p.minimumScaleFactor = 0.7;
}

function large(w, d) {
  summaryColumn(w, d);
  w.addSpacer(12);
  text(w, "Bugün", 13, C.muted, "semibold");
  w.addSpacer(6);
  taskList(w, d, 8, 13);
  w.addSpacer();
  text(w, partnerLine(d.partner), 12, C.muted, "medium");
}

function errorView(w, msg) {
  text(w, "Two Of Us", 14, C.brand, "bold");
  w.addSpacer(6);
  const t = w.addText(msg);
  t.font = Font.mediumRoundedSystemFont(12);
  t.textColor = C.muted;
}

async function main() {
  const family = config.widgetFamily || "medium";
  const w = new ListWidget();
  w.backgroundColor = C.bg;
  w.setPadding(12, 14, 12, 14);
  w.refreshAfterDate = new Date(Date.now() + 15 * 60 * 1000);

  const r = await load();
  if (r.error) {
    errorView(w, r.error);
  } else {
    const d = r.data;
    w.url = d.appUrl;
    if (family === "small") small(w, d);
    else if (family === "large" || family === "extraLarge") large(w, d);
    else medium(w, d);
    if (r.stale) {
      w.addSpacer(2);
      text(w, "çevrimdışı · son veri", 9, C.muted, "medium");
    }
  }

  if (config.runsInWidget) Script.setWidget(w);
  else await w.presentMedium();
  Script.complete();
}

await main();
`;
}
