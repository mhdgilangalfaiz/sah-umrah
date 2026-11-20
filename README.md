# PT. Sumatera Andalan Haramain — Sistem Transaksi Terintegrasi

Web aplikasi biro perjalanan umrah (Kota Medan) untuk **Paket Umrah**, **Tiket Pesawat**, dan **Layanan Visa**.
Seluruh aktivitas — pendaftaran, pemesanan, pembayaran, pengajuan visa, komunikasi — tercatat di sistem dan audit log.
Tidak ada tombol WhatsApp untuk konsultasi/pemesanan/pembayaran; WhatsApp hanya dipakai untuk **pengingat otomatis**.

| Lapisan | Teknologi |
|---|---|
| Backend | Laravel 12, PHP 8.2+ |
| Frontend | React 18 + Inertia.js 2, Tailwind CSS, Recharts, lucide-react |
| Database | MySQL / MariaDB |
| Payment gateway | **Xendit** (VA Mandiri, BSI, Muamalat + QRIS) — mode `simulator` untuk lokal |
| Storage | Disk lokal privat (dev) / S3 atau Supabase Storage (produksi), file dienkripsi |
| Email | SMTP / Resend / SendGrid |
| Queue & cron | Laravel queue (database) + scheduler |

---

## 1. Instalasi lokal

Prasyarat: PHP 8.2+ (ekstensi `pdo_mysql`, `gd`, `zip`, `sodium`, `intl`), Composer, Node 18+, MySQL/MariaDB.
(Di Windows: Laravel Herd + XAMPP MySQL sudah cukup.)

```bash
composer install
npm install
cp .env.example .env
php artisan key:generate
php -r "echo bin2hex(random_bytes(32)).PHP_EOL;"   # salin ke FINANCE_INTEGRITY_KEY di .env

# buat database kosong (nama default: sah_umrah_app)
mysql -uroot -e "CREATE DATABASE sah_umrah_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

php artisan migrate --seed
php artisan storage:link
npm run build          # atau: npm run dev (hot reload)
```

### Menjalankan
```bash
php artisan serve            # atau buka http://sah-umrah.test bila memakai Herd
php artisan queue:work       # email & WhatsApp terkirim lewat antrean
php artisan schedule:work    # auto-expire, pengingat cicilan, pengingat keberangkatan, cek integritas
```
Atau sekaligus: `composer run dev`.

### Akun demo (dari seeder)
| Peran | Email | Kata sandi |
|---|---|---|
| **Admin Utama** (Super Admin, satu-satunya yang bisa menambah admin) | `admin@sah.co.id` | `Admin#SAH2026` |
| Finance | `finance@sah.co.id` | `Admin#SAH2026` |
| Operasional | `operasional@sah.co.id` | `Admin#SAH2026` |
| Customer Service | `cs@sah.co.id` | `Admin#SAH2026` |
| Pelanggan | `jaya.demo@gmail.com` | `Jamaah123` |

> Ganti kata sandi segera di produksi (`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` di `.env` sebelum seeding).

### Menjalankan test
```bash
php artisan test
```
Test memakai SQLite in-memory (tidak menyentuh database MySQL). Cakupan: aturan login @gmail.com, RBAC & admin utama,
alur cicilan kustom (deposit 3jt → cicil → lunas), signature & idempotensi webhook, pembayaran ganda → refund otomatis,
auto-expire kursi, alur visa lengkap, chatbox → eskalasi admin, keamanan rekening (persetujuan, blokir, deteksi tamper),
dokumen privat terenkripsi + signed URL, dan *smoke test* seluruh halaman.

---

## 2. Fitur utama

**Akun & autentikasi** — satu halaman login untuk pelanggan & admin. Pelanggan wajib `@gmail.com`; admin bebas.
Registrasi (nama, email, sandi + persetujuan UU PDP) dengan verifikasi email. Login Google opsional → wajib melengkapi profil.
Setiap pelanggan mendapat **kode unik** `SAH-XXXXXX`.

**Skema pembayaran kustom (umrah)**
- Pembayaran pertama minimal **deposit Rp3.000.000 per jamaah** (diatur per paket; ubah `DEPOSIT_PER_PAX=false` untuk per pesanan).
- Selanjutnya pelanggan bebas mengisi nominal (min. `MIN_INSTALLMENT_AMOUNT`) — sisa tagihan = total − total dibayar.
- Batas pelunasan **H-30** keberangkatan. Jadwal termin disarankan otomatis; pembayaran dialokasikan ke termin berurutan.
- Lewat jatuh tempo → pengingat **email + WhatsApp setiap hari** sampai lunas.
- Kursi **ditahan** (`held`) saat pesanan dibuat, menjadi **terkonfirmasi** (`booked`) setelah pembayaran pertama, dilepas otomatis bila tidak dibayar dalam `SEAT_HOLD_HOURS`.

**Payment gateway** — alur: buat order → generate VA/QRIS → bayar → webhook → status otomatis. Status: Menunggu Pembayaran,
Dibayar, Kedaluwarsa, Gagal, Refund. Verifikasi signature, idempotensi 3 lapis, auto-expire. Invoice & kwitansi PDF otomatis.

**Visa** — pengajuan → admin terbitkan invoice (bisa ubah jumlah pemesan, harga, biaya, data pemohon) → bayar → invoice lunas →
upload ZIP/RAR → verifikasi → diproses → terbit (unduh dari dashboard). Riwayat status lengkap.

**Pusat bantuan (chatbox)** — asisten otomatis menjawab dari basis kata kunci (dikelola admin di *Jawaban Chatbox*).
Tidak bisa menjawab → tawarkan "Hubungkan saya dengan Admin" → admin CS menerima notifikasi, membuka tiket, dan langsung
melihat seluruh riwayat percakapan + profil & pesanan pelanggan.

**Panel admin** (RBAC: Super Admin, Finance, Operasional, CS) — dashboard omzet & grafik, paket + jadwal + kuota, pesanan &
manifest (Excel/PDF), monitor keberangkatan berwarna (H-1 merah, ≤H-7 oranye, ≤H-30 kuning), jadwal penerbangan manual,
penerbitan e-ticket, verifikasi dokumen, pembayaran & rekonsiliasi, refund, laporan per periode (Excel/PDF), pusat bantuan,
konten (halaman, blog, testimoni, galeri, FAQ), promo broadcast, pelanggan, audit log, akun admin (hanya Admin Utama).

**Keamanan** — lihat juga [`app/Security/Finance/README.md`](app/Security/Finance/README.md).
- NIK, nomor paspor, nomor rekening dienkripsi (cast `encrypted`); file dokumen dienkripsi AES-256 sebelum disimpan, diunduh hanya via signed URL 10 menit + cek pemilik.
- CSRF (kecuali webhook yang diverifikasi signature), proteksi XSS (React escaping + whitelist `strip_tags` untuk konten HTML admin), Eloquent/binding (SQL injection), rate limiting pada login, checkout, pembayaran, chat, webhook.
- Security headers, HSTS di produksi, sesi terenkripsi, `role`/`is_primary_admin` tidak mass-assignable.
- **Folder keamanan keuangan** `app/Security/Finance`: perubahan rekening wajib disetujui pemilik via email; "Batalkan" langsung memblokir rekening baru & menonaktifkan admin pengaju; segel HMAC mendeteksi perubahan langsung di database.
- Tidak menyimpan data kartu — pembayaran sepenuhnya di payment gateway.

**Penamaan file** — unggahan pelanggan: `{jenis}_{nama}.ext` (mis. `berkas_visa_jaya.zip`, `paspor_jaya.pdf`);
unggahan admin: `{dd-mm-yy}-{jenis}.ext` (mis. `19-11-26-bukti-transfer-refund.jpg`).

---

## 3. Struktur kode penting

```
app/
├── Contracts/Payable.php                # kontrak pesanan yang dapat dibayar
├── Models/                              # User, Booking, FlightOrder, VisaApplication, Payment, ...
├── Services/
│   ├── Payment/PaymentService.php       # buat transaksi, proses webhook, idempotensi
│   ├── Payment/XenditGateway.php        # integrasi Xendit (VA + QRIS)
│   ├── Payment/SimulatorGateway.php     # gateway lokal bertanda tangan HMAC
│   ├── BookingService.php               # hold kursi + jadwal cicilan
│   ├── ChatbotService.php               # asisten otomatis + eskalasi
│   ├── InvoiceService.php               # invoice/kwitansi + PDF
│   ├── FileStorage.php                  # penamaan & enkripsi file
│   └── Flights/FlightSearch.php         # pencarian (siap diganti provider API)
├── Security/Finance/                    # keamanan perubahan rekening bank
├── Console/Commands/                    # orders:expire, reminders:*, finance:verify-integrity
└── Http/Controllers/{Admin,Customer}/
resources/js/
├── Pages/{Public,Checkout,Customer,Admin,Auth,Payment,Profile}/
├── Layouts/ (PublicLayout, CustomerLayout, AdminLayout, GuestLayout)
└── Components/ (ui.jsx, PayBox, ChatWidget, NotificationBell, ...)
docs/
├── WEBHOOK.md                           # dokumentasi endpoint webhook
└── TESTING-PEMBAYARAN.md                # alur testing sandbox
```

Skema database: `database/migrations/` (users, jamaah, packages, package_departures, bookings, booking_passengers,
flights, flight_orders, visa_services, visa_applications, visa_status_logs, documents, payments, payment_installments,
webhook_events, refunds, invoices, support_tickets, ticket_messages, chatbot_intents, notifications, audit_logs,
reminder_logs, pages, posts, testimonials, galleries, faqs, settings, promotions, company_bank_accounts, security_alerts).

---

## 4. Deploy ke produksi

1. **Server**: PHP 8.2+ FPM + Nginx, MySQL 8 / MariaDB 10.6+, Node hanya untuk build. HTTPS wajib (Let's Encrypt).
2. **Kode**:
   ```bash
   git clone … && cd sah-umrah
   composer install --no-dev --optimize-autoloader
   npm ci && npm run build
   cp .env.example .env && php artisan key:generate
   ```
3. **.env produksi**: `APP_ENV=production`, `APP_DEBUG=false`, `APP_URL=https://domain-anda`, `SESSION_SECURE_COOKIE=true`,
   kredensial DB, `MAIL_*` (Resend/SendGrid/SMTP), `PAYMENT_GATEWAY=xendit` + `XENDIT_SECRET_KEY` (production) + `XENDIT_CALLBACK_TOKEN`,
   `PRIVATE_DISK=s3` + `AWS_*` (atau Supabase S3), `FINANCE_OWNER_EMAIL`, `FINANCE_INTEGRITY_KEY`, `WHATSAPP_TOKEN`, `GOOGLE_*`.
4. **Migrasi & cache**:
   ```bash
   php artisan migrate --force
   php artisan db:seed --force          # hanya sekali, lalu ganti sandi admin
   php artisan storage:link
   php artisan config:cache route:cache view:cache
   ```
5. **Cron** (`crontab -e`):
   ```
   * * * * * cd /var/www/sah-umrah && php artisan schedule:run >> /dev/null 2>&1
   ```
6. **Queue worker** (Supervisor):
   ```ini
   [program:sah-queue]
   command=php /var/www/sah-umrah/artisan queue:work --sleep=3 --tries=3 --max-time=3600
   autostart=true
   autorestart=true
   user=www-data
   numprocs=2
   ```
7. **Webhook Xendit**: Dashboard Xendit → Settings → Webhooks → isi URL `https://domain-anda/webhooks/payment/xendit`
   untuk *Fixed Virtual Account paid* dan *QR code paid*. Salin *Verification token* ke `XENDIT_CALLBACK_TOKEN`.
8. **Nginx**: `root /var/www/sah-umrah/public;` — pastikan folder `storage/app/private` tidak dapat diakses publik.
9. Setelah deploy ulang: `php artisan migrate --force && php artisan optimize && php artisan queue:restart`.

---

## 5. Catatan

- **Tiket pesawat** tidak memakai API maskapai (tidak ada kerja sama). Admin memperbarui jadwal, harga & kursi di *Jadwal Penerbangan*. Untuk integrasi kelak, buat provider baru dengan method yang sama seperti `App\Services\Flights\FlightSearch`.
- **Muamalat VA di Xendit**: pastikan bank `MUAMALAT` sudah aktif di akun Xendit Anda; kode bank dapat diubah lewat `XENDIT_BANK_*` tanpa mengubah kode.
- Real-time chat memakai *polling* (4 detik saat terhubung admin) sehingga tidak butuh server WebSocket. Dapat ditingkatkan ke Laravel Reverb.
