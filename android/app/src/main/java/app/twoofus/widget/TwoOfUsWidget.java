package app.twoofus.widget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * Two Of Us ana ekran widget'ı. Uygulamanın /api/widget uç noktasından bugünkü özeti çeker,
 * son veriyi saklar (çevrimdışıyken de gösterir). Dokununca uygulama açılır, ↻ elle yeniler.
 */
public class TwoOfUsWidget extends AppWidgetProvider {

    static final String ACTION_REFRESH = "app.twoofus.widget.REFRESH";
    static final String PREFS = "twoofus";
    static final String KEY_URL = "url";
    static final String KEY_DATA = "data";
    static final String KEY_ERROR = "error";
    static final String KEY_TIME = "time";
    private static final int[] TASK_IDS = {R.id.task0, R.id.task1, R.id.task2, R.id.task3, R.id.task4};

    @Override
    public void onUpdate(Context ctx, AppWidgetManager mgr, int[] ids) {
        renderAll(ctx);
        refresh(ctx, goAsync());
    }

    @Override
    public void onAppWidgetOptionsChanged(Context ctx, AppWidgetManager mgr, int id, Bundle opts) {
        render(ctx, mgr, id);
    }

    @Override
    public void onReceive(Context ctx, Intent intent) {
        super.onReceive(ctx, intent);
        if (ACTION_REFRESH.equals(intent.getAction())) {
            SharedPreferences p = prefs(ctx);
            p.edit().putString(KEY_ERROR, "Yenileniyor…").apply();
            renderAll(ctx);
            refresh(ctx, goAsync());
        }
    }

    static SharedPreferences prefs(Context ctx) {
        return ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    /** Veriyi arka planda çeker, kaydeder ve tüm widget'ları yeniden çizer. */
    static void refresh(final Context ctx, final PendingResult pending) {
        final Context app = ctx.getApplicationContext();
        new Thread(() -> {
            SharedPreferences p = prefs(app);
            String url = p.getString(KEY_URL, null);
            try {
                if (url == null) {
                    p.edit().putString(KEY_ERROR, "Bağlı değil: Two Of Us > Profil > Widget").apply();
                } else {
                    String body = get(url);
                    JSONObject json = new JSONObject(body);
                    if (json.has("error")) throw new Exception(json.getString("error"));
                    p.edit()
                            .putString(KEY_DATA, body)
                            .putLong(KEY_TIME, System.currentTimeMillis())
                            .remove(KEY_ERROR)
                            .apply();
                }
            } catch (Exception e) {
                String msg = e.getMessage() == null ? "Bağlantı hatası" : e.getMessage();
                p.edit().putString(KEY_ERROR, msg).apply();
            } finally {
                renderAll(app);
                if (pending != null) pending.finish();
            }
        }).start();
    }

    static String get(String address) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(address).openConnection();
        c.setConnectTimeout(15000);
        c.setReadTimeout(15000);
        c.setRequestProperty("Accept", "application/json");
        int code = c.getResponseCode();
        InputStream in = code >= 400 ? c.getErrorStream() : c.getInputStream();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        if (in != null) {
            byte[] buf = new byte[8192];
            int n;
            while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
            in.close();
        }
        c.disconnect();
        String body = out.toString("UTF-8");
        if (code >= 400) {
            try {
                throw new Exception(new JSONObject(body).getString("error"));
            } catch (org.json.JSONException ignored) {
                throw new Exception("Sunucu hatası " + code);
            }
        }
        return body;
    }

    static void renderAll(Context ctx) {
        AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
        int[] ids = mgr.getAppWidgetIds(new ComponentName(ctx, TwoOfUsWidget.class));
        for (int id : ids) render(ctx, mgr, id);
    }

    static void render(Context ctx, AppWidgetManager mgr, int id) {
        Bundle opts = mgr.getAppWidgetOptions(id);
        boolean wide = opts == null || opts.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 250) >= 220;
        RemoteViews v = new RemoteViews(ctx.getPackageName(), wide ? R.layout.widget_wide : R.layout.widget_small);
        SharedPreferences p = prefs(ctx);
        String raw = p.getString(KEY_DATA, null);
        String error = p.getString(KEY_ERROR, null);
        String appUrl = null;

        try {
            if (raw == null) {
                v.setTextViewText(R.id.header, "Two Of Us");
                v.setTextViewText(R.id.level, "");
                v.setTextViewText(R.id.streak, "");
                v.setTextViewText(R.id.carrots, "");
                v.setTextViewText(R.id.today, error != null ? error : "Bağlanmak için dokun");
                v.setProgressBar(R.id.level_bar, 100, 0, false);
                v.setProgressBar(R.id.today_bar, 100, 0, false);
                v.setTextViewText(R.id.partner, "");
            } else {
                JSONObject d = new JSONObject(raw);
                appUrl = d.optString("appUrl", null);
                JSONObject me = d.getJSONObject("me");
                v.setTextViewText(R.id.header, me.optString("emoji") + " " + me.optString("name"));
                v.setTextViewText(R.id.level, "Sv. " + me.optInt("level") + " · " + me.optString("levelTitle"));
                v.setProgressBar(R.id.level_bar, Math.max(1, me.optInt("needed")), me.optInt("into"), false);
                v.setTextViewText(R.id.streak, "🔥 " + me.optInt("streak"));
                v.setTextColor(R.id.streak, ctx.getColor(me.optBoolean("streakLit") ? R.color.fire : R.color.muted));
                v.setTextViewText(R.id.carrots, "🥕 " + me.optInt("carrots"));
                int done = me.optInt("done"), due = me.optInt("due");
                v.setTextViewText(R.id.today,
                        due == 0 ? "Bugün görev yok" : done >= due ? "Bugünlük tamam ✓" : done + "/" + due + " görev");
                v.setProgressBar(R.id.today_bar, Math.max(1, due), Math.min(done, Math.max(1, due)), false);

                JSONObject pt = d.getJSONObject("partner");
                int pd = pt.optInt("done"), pdue = pt.optInt("due"), ps = pt.optInt("streak");
                String status = error != null && !error.startsWith("Yenileniyor")
                        ? "⚠ " + error
                        : pt.optString("emoji") + " " + pt.optString("name") + " · "
                          + (pdue == 0 ? "görev yok" : pd + "/" + pdue) + (ps > 0 ? "  🔥" + ps : "")
                          + "  · " + time(p.getLong(KEY_TIME, 0));
                v.setTextViewText(R.id.partner, status);

                if (wide) renderTasks(ctx, v, d.optJSONArray("tasks"));
            }
        } catch (Exception e) {
            v.setTextViewText(R.id.today, "Veri okunamadı");
        }

        // Dokununca: uygulama (bağlı değilse kurulum ekranı)
        Intent open = appUrl != null
                ? new Intent(Intent.ACTION_VIEW, Uri.parse(appUrl))
                : new Intent(ctx, SetupActivity.class);
        open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        v.setOnClickPendingIntent(R.id.root, PendingIntent.getActivity(ctx, 0, open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));

        Intent r = new Intent(ctx, TwoOfUsWidget.class).setAction(ACTION_REFRESH);
        v.setOnClickPendingIntent(R.id.refresh, PendingIntent.getBroadcast(ctx, 1, r,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));

        mgr.updateAppWidget(id, v);
    }

    private static void renderTasks(Context ctx, RemoteViews v, JSONArray tasks) throws Exception {
        int n = tasks == null ? 0 : tasks.length();
        for (int i = 0; i < TASK_IDS.length; i++) {
            if (i < n) {
                JSONObject t = tasks.getJSONObject(i);
                boolean done = t.optBoolean("done"), pending = t.optBoolean("pending");
                String mark = done ? "✓" : pending ? "⏳" : "○";
                String steps = t.isNull("steps") ? "" : "  " + t.optString("steps");
                v.setTextViewText(TASK_IDS[i], mark + "  " + t.optString("emoji") + " " + t.optString("title")
                        + steps + "  🥕" + t.optInt("xp"));
                v.setTextColor(TASK_IDS[i], ctx.getColor(done ? R.color.muted : R.color.ink));
                v.setViewVisibility(TASK_IDS[i], View.VISIBLE);
            } else {
                v.setViewVisibility(TASK_IDS[i], View.GONE);
            }
        }
        if (n == 0) {
            v.setTextViewText(R.id.more, "Bugün sana ait görev yok 🌤️");
            v.setViewVisibility(R.id.more, View.VISIBLE);
        } else if (n > TASK_IDS.length) {
            v.setTextViewText(R.id.more, "+" + (n - TASK_IDS.length) + " görev daha");
            v.setViewVisibility(R.id.more, View.VISIBLE);
        } else {
            v.setViewVisibility(R.id.more, View.GONE);
        }
    }

    private static String time(long ms) {
        if (ms == 0) return "";
        return new SimpleDateFormat("HH:mm", new Locale("tr")).format(new Date(ms));
    }
}
