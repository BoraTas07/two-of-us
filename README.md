# Two Of Us

İki kişilik, oyunlaştırılmış (havuç puanı, seviye, seri, joker, rozet, ortak hedef, ödül mağazası), push bildirimli
görev takip uygulaması. Telefona "Ana Ekrana Ekle" ile kurulan bir web uygulaması (PWA).

**Kurulum için: [KURULUM.md](KURULUM.md)**

## Teknik

- Next.js 16 (App Router, Server Actions) + TypeScript + Tailwind CSS 4
- PostgreSQL (`postgres` sürücüsü; Supabase uyumlu). Şema ilk istekte otomatik oluşturulur.
- Web Push (`web-push`, VAPID). Anahtarlar ilk ihtiyaçta üretilip `app_config` tablosunda saklanır.
- Tek gerekli ortam değişkeni: `DATABASE_URL`
- Zamanlayıcı: `GET /api/cron?key=…` her dakika çağrılır (Supabase `pg_cron` + `pg_net`).
  Seri değerlendirmesi ayrıca her sayfa açılışında tembel şekilde yapılır.
- Tüm tarih hesapları `Europe/Istanbul` saatine göre.

## Geliştirme

```bash
echo 'DATABASE_URL=postgres://kullanici:sifre@localhost:5432/ikimiz' > .env.local
npm install
npm run dev
npm test
```

## Yapı

- `src/lib/` — iş mantığı: `game.ts` (tamamlama, onay, havuç, seri, rozet, hedef), `shop.ts` (mağaza),
  `recurrence.ts`, `streak.ts`, `levels.ts`, `badges.ts`, `push.ts`, `auth.ts`, `db.ts`
- `src/app/(app)/` — giriş gerektiren sayfalar: Bugün, Görevler, Biz, İstatistik, Profil
- `src/app/actions.ts` — sunucu eylemleri
- `src/app/api/cron/route.ts` — hatırlatma zamanlayıcısı
- `src/app/api/bildirim/route.ts` — bildirim butonları (imzalı, süreli anahtarla)
- `public/sw.js` — bildirimleri gösteren servis çalışanı
