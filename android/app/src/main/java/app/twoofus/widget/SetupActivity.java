package app.twoofus.widget;

import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.Bundle;
import android.text.InputType;
import android.view.Gravity;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

/**
 * Widget'ı kişinin hesabına bağlayan tek ekran. Two Of Us > Profil > Widget'taki
 * "Android widget'ını bağla" butonu twoofus://baglan?u=<widget-bağlantısı> ile burayı açar.
 */
public class SetupActivity extends Activity {

    private TextView status;
    private EditText input;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        buildUi();
        handle(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        handle(intent);
    }

    private void handle(Intent intent) {
        Uri data = intent == null ? null : intent.getData();
        if (data != null && "twoofus".equals(data.getScheme())) {
            String u = data.getQueryParameter("u");
            if (u != null) save(u);
        }
        showStatus();
    }

    private boolean valid(String u) {
        return u != null && u.startsWith("http") && u.contains("/api/widget?t=");
    }

    private void save(String raw) {
        String u = raw == null ? "" : raw.trim();
        if (!valid(u)) {
            Toast.makeText(this, "Bu bir Two Of Us widget bağlantısı değil", Toast.LENGTH_LONG).show();
            return;
        }
        TwoOfUsWidget.prefs(this).edit()
                .putString(TwoOfUsWidget.KEY_URL, u)
                .remove(TwoOfUsWidget.KEY_DATA)
                .remove(TwoOfUsWidget.KEY_ERROR)
                .apply();
        input.setText(u);
        Toast.makeText(this, "Bağlandı ✓ Şimdi ana ekrana widget'ı ekle", Toast.LENGTH_LONG).show();
        TwoOfUsWidget.refresh(this, null);
    }

    private void showStatus() {
        String u = TwoOfUsWidget.prefs(this).getString(TwoOfUsWidget.KEY_URL, null);
        status.setText(u == null
                ? "Henüz bağlı değil.\n\nTwo Of Us uygulamasında Profil > Ana ekran widget'ı > Android bölümündeki "
                  + "\"Android widget'ını bağla\" butonuna dokun. Ya da oradaki bağlantıyı kopyalayıp aşağıya yapıştır."
                : "Bağlı ✓\n\nAna ekranda boş bir yere uzun bas → Widget'lar → Two Of Us. Widget'taki ↻ ile elle "
                  + "yenileyebilirsin; kendiliğinden de yaklaşık yarım saatte bir yenilenir.");
        if (u != null && input.getText().length() == 0) input.setText(u);
    }

    private void buildUi() {
        int pad = dp(20);
        int ink = Color.parseColor("#3B332D");
        int brand = Color.parseColor("#A65D3C");

        LinearLayout col = new LinearLayout(this);
        col.setOrientation(LinearLayout.VERTICAL);
        col.setPadding(pad, dp(48), pad, pad);
        col.setBackgroundColor(Color.parseColor("#F4EEE5"));

        TextView title = new TextView(this);
        title.setText("Two Of Us Widget");
        title.setTextSize(26);
        title.setTypeface(Typeface.SERIF, Typeface.BOLD);
        title.setTextColor(ink);
        col.addView(title);

        status = new TextView(this);
        status.setTextSize(15);
        status.setTextColor(Color.parseColor("#877B6F"));
        status.setPadding(0, dp(12), 0, dp(16));
        col.addView(status);

        input = new EditText(this);
        input.setHint("https://…/api/widget?t=…");
        input.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_URI);
        input.setSingleLine(true);
        col.addView(input, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT));

        Button paste = button("Panodan yapıştır", Color.WHITE, ink);
        paste.setOnClickListener(x -> {
            ClipboardManager cm = (ClipboardManager) getSystemService(CLIPBOARD_SERVICE);
            ClipData clip = cm == null ? null : cm.getPrimaryClip();
            if (clip != null && clip.getItemCount() > 0) {
                CharSequence t = clip.getItemAt(0).coerceToText(this);
                if (t != null) save(t.toString());
            } else {
                Toast.makeText(this, "Pano boş", Toast.LENGTH_SHORT).show();
            }
            showStatus();
        });
        col.addView(paste);

        Button saveBtn = button("Kaydet", brand, Color.WHITE);
        saveBtn.setOnClickListener(x -> {
            save(input.getText().toString());
            showStatus();
        });
        col.addView(saveBtn);

        Button refresh = button("Widget'ı şimdi yenile", Color.WHITE, ink);
        refresh.setOnClickListener(x -> {
            TwoOfUsWidget.refresh(this, null);
            Toast.makeText(this, "Yenileniyor…", Toast.LENGTH_SHORT).show();
        });
        col.addView(refresh);

        ScrollView scroll = new ScrollView(this);
        scroll.setBackgroundColor(Color.parseColor("#F4EEE5"));
        scroll.addView(col);
        setContentView(scroll);
    }

    private Button button(String text, int bg, int fg) {
        Button b = new Button(this);
        b.setText(text);
        b.setAllCaps(false);
        b.setTextColor(fg);
        b.setBackgroundColor(bg);
        b.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(48));
        lp.topMargin = dp(10);
        b.setLayoutParams(lp);
        return b;
    }

    private int dp(int v) {
        return Math.round(v * getResources().getDisplayMetrics().density);
    }
}
