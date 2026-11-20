# Alur Testing Pembayaran (Sandbox)

## A. Mode simulator (tanpa akun gateway) — paling cepat

`.env`: `PAYMENT_GATEWAY=simulator`

1. Jalankan `php artisan serve` (atau Herd) dan `php artisan queue:work`.
2. Masuk sebagai `jaya.demo@gmail.com` / `Jamaah123`.
3. **Paket Umrah** → pilih paket (contoh harga Rp10.000.000) → *Pesan Sekarang* → jadwal & kamar → data jamaah → skema **Cicilan** → setujui S&K → *Buat Pesanan*.
   - Cek: status *Menunggu Pembayaran*, kursi ditahan (Admin › Keberangkatan, kolom *Ditahan*), invoice PDF dapat diunduh.
4. Kotak **Bayar Deposit Awal**: coba nominal Rp2.000.000 → ditolak (min. Rp3.000.000/jamaah). Isi Rp3.000.000, pilih **VA BSI** → *Bayar*.
5. Halaman instruksi menampilkan nomor VA + hitung mundur. Klik **Simulasikan Bayar** (kotak kuning “Mode sandbox”).
   - Halaman otomatis berubah *Pembayaran berhasil* (polling status), kwitansi dapat diunduh.
   - Pesanan: *Cicilan Berjalan*, sisa Rp7.000.000, kursi menjadi *Terisi*, termin “Deposit Awal” lunas.
6. Bayar lagi nominal bebas, mis. Rp2.000.000 via **QRIS** → simulasikan → sisa Rp5.000.000.
7. Lunasi Rp5.000.000 via **VA Muamalat** → status **Lunas**, invoice bercap LUNAS.
8. Uji kedaluwarsa: buat transaksi lalu klik **Simulasikan Kedaluwarsa** → status *Kedaluwarsa*, buat transaksi baru.
9. Uji ganti metode: pada transaksi aktif klik *Ganti metode / nominal* → transaksi lama *Gagal*, buat yang baru.
10. Admin (`finance@sah.co.id`) → **Pembayaran** & **Rekonsiliasi**: semua transaksi + webhook tercatat; **Audit Log** (admin utama) menampilkan `pembayaran.dibuat` dan `pembayaran.diterima`.

### Uji visa
1. Pelanggan: *Layanan Visa* → *Ajukan Visa* (3 orang) → status *Menunggu Invoice*.
2. Admin `operasional@sah.co.id`: *Pengajuan Visa* → buka → ubah jumlah pemesan/harga → *Terbitkan Invoice*.
3. Pelanggan bayar → simulasikan → status *Menunggu Dokumen* → unggah `.zip` → admin *Verifikasi* → *Diproses* → *Terbit* (unggah file visa) → pelanggan mengunduh visa.

### Uji pengingat & auto-expire
```bash
php artisan orders:expire            # lepas kursi & kedaluwarsakan transaksi lewat batas
php artisan reminders:installments   # H-7/H-3/H-1 + harian untuk yang terlambat (email + WA)
php artisan reminders:departures     # H-30 / H-7 / H-1
```
Untuk mensimulasikan keterlambatan: di database ubah `bookings.payment_deadline` / `payment_installments.due_date` ke tanggal kemarin, lalu jalankan `reminders:installments`. Email terlihat di `storage/logs/laravel.log` (`MAIL_MAILER=log`) dan WhatsApp tercatat sebagai `[WA-SIMULASI]` bila `WHATSAPP_TOKEN` kosong.

## B. Xendit sandbox (test mode)

1. Daftar di dashboard.xendit.co → aktifkan **Test Mode**.
2. *Settings → API Keys* → buat **Secret key** (izin *Money-in: Write*) → `XENDIT_SECRET_KEY=xnd_development_...`
3. *Settings → Webhooks*:
   - *Fixed Virtual Account → paid*: `https://<domain-publik>/webhooks/payment/xendit`
   - *QR code → paid*: URL yang sama
   - Salin *Verification token* → `XENDIT_CALLBACK_TOKEN`
4. Lokal butuh URL publik: `herd share` (Expose) atau `ngrok http 80`, lalu set `APP_URL` & URL webhook ke domain tersebut.
5. `.env`: `PAYMENT_GATEWAY=xendit` → `php artisan config:clear`.
6. Buat pesanan & transaksi seperti di atas. VA yang tampil adalah VA sandbox asli dari Xendit.
7. Simulasikan pembayaran (Xendit yang akan mengirim webhook):
   ```bash
   # Virtual Account
   curl -u "$XENDIT_SECRET_KEY:" -X POST \
     "https://api.xendit.co/callback_virtual_accounts/external_id=PAY-XXXXXXXX/simulate_payment" \
     -H "Content-Type: application/json" -d '{"amount":3000000}'

   # QRIS (id = gateway_id transaksi, terlihat di tabel payments)
   curl -u "$XENDIT_SECRET_KEY:" -X POST \
     "https://api.xendit.co/qr_codes/qr_XXXXXXXX/payments/simulate" \
     -H "api-version: 2022-07-31" -H "Content-Type: application/json" -d '{"amount":2000000}'
   ```
   Atau gunakan tombol *Simulate payment* di dashboard Xendit (menu Virtual Accounts / QR Codes).
8. Verifikasi: status pesanan berubah otomatis; *Admin › Rekonsiliasi* tidak menunjukkan selisih.
9. Bila webhook gagal terkirim (mis. URL belum publik), di *Admin › Pembayaran* klik ikon ⟳ *Cek ke gateway*: untuk QRIS sistem menyinkronkan otomatis bila Xendit mengonfirmasi pembayaran; untuk VA ditampilkan status VA — kirim ulang callback dari dashboard Xendit.

## Checklist sebelum produksi
- [ ] `PAYMENT_GATEWAY=xendit`, secret key **production**, callback token production
- [ ] Bank `MANDIRI`, `BSI`, `MUAMALAT` aktif di akun Xendit (atur `XENDIT_BANK_*` bila kodenya berbeda)
- [ ] Webhook URL HTTPS terdaftar & diuji dari dashboard (Test webhook)
- [ ] `queue:work` (Supervisor) & cron `schedule:run` berjalan
- [ ] `FINANCE_OWNER_EMAIL` & `FINANCE_INTEGRITY_KEY` diisi; rekening settlement diajukan & disetujui lewat email
- [ ] Sandi akun demo/seed diganti
