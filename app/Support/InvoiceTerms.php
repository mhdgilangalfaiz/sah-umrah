<?php

namespace App\Support;

/**
 * Syarat & ketentuan yang dicetak di bawah invoice tiket pesawat.
 * Teks bawaan di bawah ini; tiap invoice dapat diubah admin lewat "Revisi invoice" (disimpan di invoice.details.terms).
 *
 * Format teks: baris "A. Judul" / judul huruf besar dicetak tebal, baris diawali "- " dicetak menjorok.
 */
class InvoiceTerms
{
    public const FLIGHT_DEFAULT = <<<'TXT'
SYARAT & KETENTUAN

A. Ketentuan Booking dan Pembayaran Deposit
1. Booking tiket harus disertai dengan pembayaran deposit minimal 30% per penumpang dari harga tiket.
2. Time limit pembayaran deposit adalah 1×24 jam setelah invoice diterbitkan (belum di-HK).
3. Jika tidak dilakukan pembayaran dalam 1×24 jam, maka booking akan otomatis dibatalkan (tidak di-HK).
4. Deposit tidak dapat dialihkan ke tanggal lain kecuali terjadi cancel flight pada tanggal booking.
5. Pembatalan booking setelah pembayaran deposit akan menyebabkan deposit hangus (tidak dapat direfund).

B. Ketentuan Pembatalan
6. Pembatalan setelah deposit s/d H-60 sebelum hari keberangkatan dikenakan penalti 30% per pax dari harga tiket.
7. Pembatalan H-45 s/d H-30 hari sebelum keberangkatan dikenakan penalti 60% per pax dari harga tiket.
8. Pembatalan H-25 hari sebelum keberangkatan dikenakan penalti 100% per pax dari harga tiket.
9. Pelunasan tiket wajib dilakukan paling lambat 30 hari sebelum keberangkatan.
10. Jika pelunasan tidak dilakukan sesuai waktu, maka booking dibatalkan dan deposit hangus.
11. Tiket yang telah dilunasi tidak dapat ditarik kembali atau dibatalkan, meskipun belum di-issued.

C. Ketentuan Harga & Penumpang
12. Harga tiket dewasa dan anak-anak 2 tahun ke atas sama, terhitung 1 tiket penuh (full payment).
13. Infant (bayi) 0–24 bulan dikenakan harga khusus sebesar Rp5.000.000 (tidak terhitung dalam tiket).

D. Tahapan Pembayaran
- DP1: Ketika booking confirm : 30%
- DP2: H-60 s/d H-50 sebesar 60% : 50%

E. Proses Tiket & Koreksi Data
14. Nama penumpang (manifest) dikirim melalui Grup WhatsApp sesuai format, paling lambat 7 hari sebelum keberangkatan sesuai dengan format yang telah disediakan.
15. Tiket yang sudah di-insert akan dikirim ke agen/travel untuk pengecekan data.
- Jika telah dikonfirmasi "data benar", maka akan diproses issued.
- Kesalahan setelah konfirmasi (tiket di-issued) menjadi tanggung jawab agen/travel.
- Biaya koreksi:
- Core name / gender: Rp500.000,-
- Change name: Rp3.500.000,-
- Perubahan rute (ADD ON): gratis, namun harga tiket mengikuti rute baru. Perubahan add on hanya bisa dilakukan sebelum tiket di-issued dan add on yang diminta masih tersedia.
16. Semua perubahan harus disertai surat pengajuan resmi via email atau WA Grup.

F. Tanggung Jawab & Pengembalian Dana
17. Pihak kami tidak bertanggung jawab atas gagal keberangkatan karena:
- Gagal visa
- Kesalahan dari pihak agen/travel
18. Tiket one-way tidak dapat direfund kecuali penumpang meninggal dunia.
19. Pengajuan refund karena meninggal dunia wajib disertai surat keterangan resmi.
20. Pengajuan reschedule karena sakit harus menyertakan surat keterangan dokter lengkap dengan diagnosa.

G. Ketentuan Umum
21. Seluruh ketentuan ini bersifat tetap dan wajib dipatuhi oleh setiap agen/travel.
22. Segala kebijakan baru dari pihak maskapai di luar tanggung jawab kami.

Booking Confirmation
Dengan melakukan pembayaran, agen/travel dianggap telah MENYETUJUI seluruh peraturan dan kebijakan yang tercantum di atas.
TXT;

    /** S&K bawaan invoice paket umrah (dapat diubah admin per invoice lewat Revisi invoice) */
    public const UMRAH_DEFAULT = <<<'TXT'
SYARAT & KETENTUAN

A. Pembayaran
1. Pemesanan paket dikonfirmasi setelah pembayaran deposit awal sesuai ketentuan paket.
2. Sisa tagihan dapat dicicil kapan saja dan berapa kali saja, tanpa jadwal termin bulanan.
3. Pelunasan wajib dilakukan paling lambat H-40 sebelum tanggal keberangkatan.
4. Pembayaran dapat dilakukan melalui Virtual Account (Mandiri, BSI, Muamalat), QRIS, atau tunai di kantor.
5. Pembayaran tunai di kantor wajib disertai kwitansi resmi dari kantor. Kwitansi diunggah sebagai bukti pembayaran dan tercatat di invoice setelah diverifikasi admin.

B. Ketentuan Umum
6. Setiap pembayaran tercatat pada riwayat pembayaran di invoice ini.
7. Perubahan jumlah jamaah, kategori, atau biaya tambahan akan diterbitkan dalam invoice revisi.

Booking Confirmation
Dengan melakukan pembayaran, jamaah dianggap telah MENYETUJUI seluruh ketentuan yang tercantum di atas.
TXT;

    /** S&K yang dicetak: hasil revisi invoice ini bila ada, selain itu teks bawaan sesuai jenis pesanan */
    public static function forInvoice(\App\Models\Invoice $invoice, $payable): ?string
    {
        $details = $invoice->details ?? [];
        if (array_key_exists('terms', $details)) return (string) $details['terms'];

        return match (true) {
            $payable instanceof \App\Models\FlightOrder => self::FLIGHT_DEFAULT,
            $payable instanceof \App\Models\Booking => self::UMRAH_DEFAULT,
            default => null,
        };
    }

    /**
     * Pecah teks menjadi baris siap cetak: ['text' => ..., 'kind' => heading|bullet|text|blank].
     *
     * @return array<int, array{text:string, kind:string}>
     */
    public static function lines(?string $text): array
    {
        if (trim((string) $text) === '') return [];

        return collect(preg_split('/\r\n|\r|\n/', (string) $text))->map(function ($raw) {
            $t = trim($raw);
            $kind = match (true) {
                $t === '' => 'blank',
                (bool) preg_match('/^[A-Z]\.\s/', $t), $t === mb_strtoupper($t) && preg_match('/[A-Z]/', $t), $t === 'Booking Confirmation' => 'heading',
                str_starts_with($t, '- '), str_starts_with($t, '• ') => 'bullet',
                default => 'text',
            };

            return ['text' => $kind === 'bullet' ? trim(mb_substr($t, 2)) : $t, 'kind' => $kind];
        })->all();
    }
}
