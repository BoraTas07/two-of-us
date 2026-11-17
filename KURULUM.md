# Two Of Us — Kurulum Rehberi

Bu rehber, kod bilmeden uygulamayı internete koyman için hazırlandı. Toplam ~20 dakika sürer
ve **tamamen ücretsizdir**. 3 ücretsiz hesap gerekiyor: **GitHub**, **Supabase**, **Vercel**.

> Kısaca: Supabase = veritabanı (görevler, puanlar burada saklanır) · Vercel = uygulamanın
> yayınlandığı yer (sana bir internet adresi verir) · GitHub = kodun durduğu yer.

---

## 1. Veritabanı: Supabase (5 dk)

1. <https://supabase.com> → **Start your project** → GitHub ile giriş yap.
2. **New project**:
   - Name: `two-of-us`
   - Database Password: **Generate a password**'e bas, çıkan şifreyi bir yere **kaydet**.
   - Region: **Central EU (Frankfurt)** (Türkiye'ye en yakın)
   - **Create new project** → 1-2 dakika hazırlanmasını bekle.
3. Üstteki **Connect** düğmesine bas → **Connection String** sekmesi → **Transaction pooler**
   bölümündeki adresi kopyala. Şuna benzer:
   ```
   postgresql://postgres.abcxyz:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
   ```
4. Bu adresteki `[YOUR-PASSWORD]` kısmını (köşeli parantezler dahil) 2. adımda kaydettiğin
   şifreyle değiştir. Bu son hali **DATABASE_URL**'in. Bir yere not et.

Tabloları oluşturmana gerek yok — uygulama ilk açılışta kendisi oluşturur.

## 2. Yayınlama: Vercel (5 dk)

1. <https://vercel.com/signup> → **Continue with GitHub**.
2. **Add New… → Project** → listeden `two-of-us` deposunu bul → **Import**.
3. **Environment Variables** bölümünü aç:
   - Key: `DATABASE_URL`
   - Value: 1. bölümde hazırladığın adres
4. **Deploy** → 1-2 dakika bekle. Bittiğinde sana `https://two-of-us-xxxx.vercel.app` gibi bir
   adres verir. **Bu senin uygulamanın adresi.**

## 3. İlk açılış (2 dk)

1. Adresi telefonundan aç. **Kurulum** ekranı gelir.
2. Kendi adını, partnerinin adını, birer hayvan simgesi, renk ve **4-6 haneli PIN** seç.
3. **Başlayalım** → artık içerdesin. Partnerin kendi telefonundan aynı adresi açıp kendi
   profiline dokunur ve PIN'ini girer.

## 4. Hatırlatmaların zamanında gelmesi (2 dk, bir kez)

Uygulamanın her dakika "saati gelen hatırlatma var mı?" diye bakması gerekiyor:

1. Uygulamada sağ üstteki/sol üstteki avatarına dokun → **Profil & Ayarlar**.
2. En altta **⚙️ Zamanlayıcı kurulumu**'nu aç → koddaki **Kopyala**'ya bas.
3. Supabase'de soldaki menüden **SQL Editor**'ü aç → kopyaladığını yapıştır → **Run**.
4. Bir dakika sonra aynı ekranda "Son çalışma" kısmında saat görünmelidir. ✅

## 5. Telefonlara kurma ve bildirimleri açma

### iPhone (iOS 16.4 veya üstü gerekli)
1. Adresi **Safari**'de aç (Chrome değil).
2. Alttaki **Paylaş** düğmesi (kare + yukarı ok) → **Ana Ekrana Ekle** → **Ekle**.
3. Ana ekrandaki **Two Of Us** simgesinden aç (bundan sonra hep buradan aç).
4. Avatarına dokun → **🔔 Bildirimleri aç** → **İzin Ver**. Deneme bildirimi gelir.

### Android
1. Adresi **Chrome**'da aç.
2. Sağ üstteki **⋮** menü → **Ana ekrana ekle** (veya **Uygulamayı yükle**).
3. Simgeden aç → avatarına dokun → **🔔 Bildirimleri aç** → **İzin ver**.

---

## Nasıl çalışır?

| | |
|---|---|
| **Görev tipleri** | 📌 Bir kez · 🔁 Tekrarlı (her gün / haftanın günleri / ayda bir) · 🌱 Alışkanlık (kendi serisi tutulur) |
| **Kime** | Kendine, partnerine ya da 💞 ortak (biri bitirince ikinize de havuç) |
| **Onay** | Görevi oluşturan "partner onayı gereksin" derse havuçlar onaydan sonra gelir; yoksa güvene dayalı, hemen gelir |
| **Düzenleme** | Bir görevi ya da ödülü sadece oluşturan kişi değiştirip silebilir |
| **Havuç 🥕 & seviye** | Görevi oluşturan, çubukla ya da yazarak 1–200 arası havuç belirler. Toplam havuç arttıkça seviye atlarsın |
| **Mağaza 🛍️** | Kendine ödül koy ya da partnerine hediye tanımla; havuçlarla satın alınır. Harcamak seviyeni düşürmez |
| **Seri 🔥** | Günün tüm görevlerini bitirince seri 1 artar. 7 ve 30. günde bonus havuç |
| **Joker 🧊** | Bir gün kaçırırsan otomatik devreye girer, serin korunur. Her ay 2 tane yenilenir |
| **Ortak hedef 🏆** | Haftalık hedef sadece 💞 ortak görevlerden gelen havuçla dolar (varsayılan 100, değiştirilebilir). Ulaşınca ikinize de +50 🥕 |
| **Rozetler** | 16 rozet: ilk görev, seriler, erkenci kuş, gece kuşu, adil hakem… |
| **Bildirim butonları** | Android'de hatırlatmadan "✓ Tamamla", onay isteğinden "✓ Onayla / ↩ Geri çevir" doğrudan yapılır. iPhone bu butonları desteklemiyor; bildirime dokununca uygulama ilgili ekranda açılır |
| **Bildirimler** | Görevin hatırlatma saatinde · sabah 09:00 özeti · akşam 21:00 "serin tehlikede" · partnerin görev verince / onay isteyince / rozet kazanınca · "Dürt" düğmesi |

## Sorun giderme

- **"DATABASE_URL ayarlanmamış" hatası** → Vercel'de Project → Settings → Environment
  Variables'ı kontrol et, sonra Deployments → en üstteki → ⋯ → **Redeploy**.
- **Veritabanına bağlanamıyor** → Adreste `[YOUR-PASSWORD]` kısmını değiştirdiğinden ve
  "Transaction pooler" (6543 portlu) adresi kullandığından emin ol.
- **iPhone'da bildirim düğmesi yok** → Uygulamayı Safari'den değil ana ekrandaki simgeden açmalısın.
- **Bildirim gelmiyor** → Profil sayfasında **🔔 Dene**'ye bas. Gelmiyorsa telefonun
  Ayarlar → Bildirimler bölümünde Two Of Us'a izin verildiğini kontrol et.
- **Hatırlatmalar gecikiyor / hiç gelmiyor** → 4. adımı yaptığından ve "Son çalışma"
  saatinin güncel olduğundan emin ol.
- **PIN'i unuttum** → Partnerin giriş yapmış haldeyse sorun yok ama PIN sıfırlama ekranı yok;
  Supabase → Table Editor → `profiles` tablosunda ilgili satırı bana (Claude'a) sorarak düzeltebilirsin.

## 6. Ana ekran widget'ı (isteğe bağlı)

Uygulamada **Profil & Ayarlar → 📱 Ana ekran widget'ı** bölümündeki adımları izle. Widget bugünkü
görevlerini, serini, havucunu, seviyeni ve partnerinin durumunu gösterir; dokununca uygulama açılır.

- **iPhone:** App Store'dan ücretsiz **Scriptable** uygulamasını indir, profildeki "Script'i kopyala" ile
  kopyaladığını Scriptable'da yeni script olarak yapıştır, ana ekrana Scriptable widget'ı ekleyip script
  olarak "Two Of Us"ı seç.
- **Android:** Profildeki butonla küçük widget uygulamasını (APK) indirip kur, "Android widget'ını bağla"ya
  bas, sonra ana ekrana uzun basıp Widget'lar → Two Of Us.

Widget bağlantısı sana özeldir. Paylaştıysan "Bağlantıyı yenile" ile eskisini geçersiz kılabilirsin.

**Geliştirici notu:** Android widget kaynak kodu `android/` klasöründe. Yeniden derlemek için
`android/build.sh` (JDK 17+, Gradle 8.13+, Android SDK 35 gerekir); çıktı `public/two-of-us-widget.apk`.
