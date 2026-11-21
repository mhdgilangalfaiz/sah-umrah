# Keamanan Data Keuangan (`app/Security/Finance`)

Folder ini berisi semua logika yang melindungi **rekening bank perusahaan** dari perubahan tanpa izin.

| File | Fungsi |
|---|---|
| `CompanyBankAccount.php` | Model rekening. Nomor rekening terenkripsi, setiap baris disegel HMAC (`integrity_hash`). |
| `BankAccountGuard.php` | Satu-satunya jalur resmi untuk mengubah rekening: ajukan → email pemilik → setujui/blokir. Juga verifikasi segel. |
| `BankChangeRequestedNotification.php` | Email peringatan ke pemilik (`FINANCE_OWNER_EMAIL`). |
| `BankDecisionController.php` | Halaman konfirmasi dari tautan email (signed URL + token sekali pakai). |

## Alur
1. Admin (Super Admin/Finance) menambah/mengganti rekening di **Admin › Keamanan Keuangan**.
2. Rekening baru berstatus **Menunggu Verifikasi** — belum dipakai sistem.
3. Email peringatan dikirim ke `FINANCE_OWNER_EMAIL` (diatur di `.env`, **tidak bisa diubah dari web**).
4. Pemilik klik:
   - **Setujui** → rekening aktif, rekening lama berstatus *Diganti*.
   - **Batalkan & Blokir** → rekening baru langsung **diblokir & dimatikan**, akun admin pengaju dinonaktifkan dan sesinya diputus (kecuali Super Admin).
5. Tidak ada keputusan dalam `FINANCE_APPROVAL_HOURS` jam → otomatis diblokir.
6. `php artisan finance:verify-integrity` (terjadwal tiap 15 menit) mengecek segel HMAC. Jika data diubah langsung lewat database (mis. peretas mengakses DB), segel tidak cocok → rekening diblokir + alarm keamanan + email ke super admin.

## Variabel .env
```
FINANCE_OWNER_EMAIL=pemilik@gmail.com
FINANCE_INTEGRITY_KEY=   # php -r "echo bin2hex(random_bytes(32));"
FINANCE_APPROVAL_HOURS=24
```
> Simpan `FINANCE_INTEGRITY_KEY` terpisah dari database (mis. secret manager server). Tanpa kunci ini penyerang tidak bisa membuat segel yang valid.
