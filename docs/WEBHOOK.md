# Dokumentasi Webhook Payment Gateway

## Endpoint

```
POST /webhooks/payment/{gateway}
```

| `{gateway}` | Kapan dipakai | Verifikasi |
|---|---|---|
| `xendit` | Sandbox & produksi | Header `x-callback-token` harus sama persis dengan `XENDIT_CALLBACK_TOKEN` (dibandingkan dengan `hash_equals`) |
| `simulator` | Lokal / testing (`PAYMENT_GATEWAY=simulator`) | Header `X-Simulator-Signature` = `HMAC-SHA256(raw_body, PAYMENT_SIMULATOR_SECRET)` |

- Tanpa CSRF (dikecualikan di `bootstrap/app.php`), rate limit 120 request/menit.
- Kode: `app/Http/Controllers/WebhookController.php` → `App\Services\Payment\PaymentService::handleWebhook()`.

### Respons

| HTTP | Body | Arti |
|---|---|---|
| `200` | `{"ok":true,"result":"dibayar"}` | Pembayaran diterapkan ke pesanan, kwitansi terbit, notifikasi terkirim |
| `200` | `{"ok":true,"result":"duplikat"}` | `event_id` sudah pernah diproses (idempotensi event) |
| `200` | `{"ok":true,"result":"sudah_dibayar"}` | Event baru untuk transaksi yang sudah lunas (idempotensi transaksi) |
| `200` | `{"ok":true,"result":"nominal_tidak_cocok"}` | Nominal webhook ≠ nominal transaksi → TIDAK diproses, muncul di Rekonsiliasi |
| `200` | `{"ok":true,"result":"payment_tidak_ditemukan"}` | `external_id`/`reference_id` tidak dikenal |
| `200` | `{"ok":true,"result":"kedaluwarsa" \| "gagal" \| "diabaikan"}` | Status lain |
| `401` | `{"ok":false,"message":"invalid signature"}` | Signature/token salah — dicatat di `webhook_events` dengan `signature_valid = false` |

Selain 401, endpoint selalu mengembalikan 200 agar gateway tidak mengirim ulang tanpa henti.

## Payload yang diproses

### Xendit — Fixed Virtual Account terbayar
```json
{
  "id": "57fb4e076fa3fa296b7f5a97",
  "payment_id": "demo-1475459775872",
  "callback_virtual_account_id": "57fb4df9af86ce19778ad359",
  "external_id": "PAY-261119143015-A1B2C",
  "bank_code": "BSI",
  "account_number": "9999000001",
  "amount": 3000000,
  "transaction_timestamp": "2026-11-19T14:30:15.000Z"
}
```
- `external_id` = `payments.code`; `payment_id` dipakai sebagai `event_id`.
- Callback "VA created/updated" (tanpa `payment_id`) diabaikan.

### Xendit — QRIS (QR Codes API `2022-07-31`)
```json
{
  "event": "qr.payment",
  "data": { "id": "qrpy_8182837te-87st-49ing-8696-1239bd4d759c", "qr_id": "qr_...", "reference_id": "PAY-261119143015-A1B2C",
            "amount": 2000000, "currency": "IDR", "status": "SUCCEEDED" }
}
```

### Simulator
```json
{ "event_id": "sim_evt_x1y2z3", "external_id": "PAY-261119143015-A1B2C", "amount": 3000000, "status": "PAID", "paid_at": "2026-11-19T14:30:15+07:00" }
```
`status`: `PAID` | `EXPIRED` | `FAILED`.

## Apa yang terjadi saat `dibayar`

Semua di dalam satu transaksi database dengan `SELECT … FOR UPDATE` pada payment & pesanan:

1. `webhook_events` dibuat — `event_id` UNIQUE ⇒ pemrosesan ganda mustahil.
2. `payments.status = dibayar`, `paid_at` diisi.
3. Bila pesanan sudah lunas sebelumnya ⇒ **pembayaran ganda**: dibuat `refunds` otomatis untuk ditinjau Finance.
4. Jika tidak: `Payable::applyPayment()`:
   - **Umrah**: `paid_amount += amount`; kursi `held → booked` (sekali); alokasi ke termin; status `cicilan_berjalan`/`lunas`.
   - **Tiket**: status `dibayar` (admin lalu menerbitkan e-ticket).
   - **Visa**: lunas ⇒ status `menunggu_dokumen` + log status.
5. Kwitansi `KWT/SAH/YYYY/MM/####` dibuat; invoice ditandai `lunas` bila tagihan habis.
6. Audit log `pembayaran.diterima` (pelaku: Sistem), notifikasi pelanggan (in-app + email) & admin Finance.

## Lapisan anti pembayaran ganda

1. `idempotency_key` (UUID per form) unik di tabel `payments` — submit ganda mengembalikan transaksi yang sama.
2. Hanya satu VA/QR aktif per pesanan; ganti nominal/metode ⇒ VA lama dinonaktifkan (`cancelCharge`).
3. VA Xendit `is_closed=true` (nominal harus tepat) & `is_single_use=true`.
4. `event_id` unik di `webhook_events` + cek status `dibayar` sebelum diterapkan.
5. Bila tetap terjadi (mis. dua channel berbeda), kelebihan dana otomatis diajukan refund.

## Menguji dengan cURL (simulator)

```bash
SECRET=$(grep PAYMENT_SIMULATOR_SECRET .env | cut -d= -f2)
BODY='{"event_id":"evt-uji-1","external_id":"PAY-XXXXXXXX","amount":3000000,"status":"PAID"}'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$SECRET" | sed 's/^.* //')

curl -X POST http://sah-umrah.test/webhooks/payment/simulator \
  -H "Content-Type: application/json" -H "X-Simulator-Signature: $SIG" -d "$BODY"
# kirim ulang perintah yang sama → result: "duplikat"
# ubah 1 karakter BODY tanpa menghitung ulang SIG → HTTP 401
```

## Menguji dengan cURL (Xendit sandbox)

```bash
curl -X POST https://sah-umrah.test/webhooks/payment/xendit \
  -H "Content-Type: application/json" -H "x-callback-token: $XENDIT_CALLBACK_TOKEN" \
  -d '{"payment_id":"uji-123","external_id":"PAY-XXXXXXXX","amount":3000000,"bank_code":"BSI"}'
```
Lebih realistis: gunakan endpoint simulasi resmi Xendit (lihat `TESTING-PEMBAYARAN.md`) sehingga Xendit sendiri yang mengirim webhook.
