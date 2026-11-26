<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Invoice;
use App\Models\Refund;
use App\Models\User;
use App\Notifications\SystemNotification;
use App\Services\Payment\PaymentService;
use App\Support\Audit;
use App\Support\InvoiceTerms;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Revisi invoice paket umrah oleh admin:
 * - keterangan tiap baris paket (qty & harga per jamaah tetap mengikuti data jamaah — diubah lewat "Ubah pesanan")
 * - baris tambahan biaya / potongan (mengubah total tagihan)
 * - syarat & ketentuan invoice
 * Invoice baru "-R{n}" terbit, yang lama berstatus direvisi; kelebihan bayar tercatat di menu Refund.
 */
class BookingInvoiceRevisionService
{
    public const CLOSED = ['dibatalkan', 'refund', 'selesai', 'kedaluwarsa'];

    public function __construct(private InvoiceService $invoices, private PaymentService $payments, private BookingService $bookings) {}

    /** @param array{descriptions?:array<string,string>, extras?:array, terms?:string|null, reason:string} $data */
    public function revise(Booking $booking, array $data, ?User $by = null): Invoice
    {
        [$invoice, $refund, $booking, $oldTotal] = DB::transaction(function () use ($booking, $data, $by) {
            $booking = Booking::lockForUpdate()->with('departure.package')->findOrFail($booking->id);
            if (in_array($booking->status, self::CLOSED, true)) {
                throw ValidationException::withMessages(['reason' => 'Pesanan sudah ditutup, invoice tidak dapat direvisi.']);
            }

            $oldTotal = (int) $booking->total_amount;
            $keys = array_column($this->invoices->bookingLines($booking), 'key');
            $descriptions = collect($data['descriptions'] ?? [])->only($keys)->map(fn ($d) => trim((string) $d))->filter()->all();
            $extras = collect($data['extras'] ?? [])->map(fn ($x) => [
                'description' => trim((string) $x['description']), 'qty' => (int) $x['qty'], 'price' => (int) $x['price'],
            ])->values()->all();

            $booking->invoice_meta = ['descriptions' => $descriptions, 'extras' => $extras];
            $base = (int) $booking->passengers()->get()->sum(fn ($p) => $p->price ?? $booking->unit_price);
            $newTotal = $base + $booking->extrasTotal();
            if ($newTotal < 0) {
                throw ValidationException::withMessages(['extras' => 'Total tagihan tidak boleh negatif — periksa nominal potongan.']);
            }

            // nominal berubah → VA/QRIS aktif dinonaktifkan agar tidak dibayar dengan nominal lama
            if ($newTotal !== $oldTotal) {
                $booking->payments()->where('status', 'menunggu_pembayaran')->get()
                    ->each(fn ($p) => $this->payments->cancel($p, 'Invoice direvisi'));
            }

            $refund = max(0, (int) $booking->paid_amount - $newTotal);
            $booking->total_amount = $newTotal;
            $booking->paid_amount = (int) $booking->paid_amount - $refund;
            if ($booking->outstandingAmount() <= 0 && (int) $booking->paid_amount > 0) {
                $booking->status = 'lunas';
            } elseif (in_array($booking->status, ['lunas'], true)) {
                $booking->status = 'cicilan_berjalan';
            }
            $booking->save();
            $this->bookings->rebalanceInstallments($booking);

            $reason = trim($data['reason']);
            $invoice = $this->invoices->revise($booking, $this->invoices->items($booking), $reason, [
                'total_before' => $oldTotal, 'refund' => $refund,
                'terms' => array_key_exists('terms', $data) ? trim((string) $data['terms']) : $this->currentTerms($booking),
            ], $by);

            $refundRecord = null;
            if ($refund > 0) {
                $last = Refund::where('user_id', $booking->user_id)->whereNotNull('bank_name')->latest()->first();
                $refundRecord = Refund::create([
                    'code' => 'RF-'.now()->format('ymd').'-'.strtoupper(Str::random(4)),
                    'type' => 'refund', 'user_id' => $booking->user_id,
                    'refundable_type' => $booking->getMorphClass(), 'refundable_id' => $booking->id,
                    'requested_amount' => $refund, 'approved_amount' => $refund, 'reason' => "Revisi invoice {$invoice->number}: {$reason}",
                    'bank_name' => $last?->bank_name, 'account_number' => $last?->account_number, 'account_holder' => $last?->account_holder,
                    'status' => 'disetujui', 'reviewed_by' => $by?->id, 'reviewed_at' => now(),
                ]);
            }
            $booking->changes()->create([
                'type' => 'revisi_invoice', 'description' => "Invoice direvisi menjadi {$invoice->number}: {$reason}",
                'old_total' => $oldTotal, 'new_total' => $newTotal, 'refund_amount' => $refund, 'refund_id' => $refundRecord?->id, 'changed_by' => $by?->id,
            ]);
            Audit::log('invoice.revisi', "Revisi invoice umrah {$booking->code} → {$invoice->number}. Alasan: {$reason}",
                $booking, ['total_amount' => $oldTotal], ['total_amount' => $newTotal], $by);

            return [$invoice, $refund, $booking, $oldTotal];
        });

        $rp = fn ($n) => 'Rp'.number_format($n, 0, ',', '.');
        $booking->user->notify(new SystemNotification('pesanan', 'Invoice Diperbarui — '.$booking->code,
            "Invoice paket umrah Anda diperbarui menjadi {$invoice->number}. {$invoice->notes}"
            .((int) $booking->total_amount !== $oldTotal ? " Total baru {$rp($booking->total_amount)} (sebelumnya {$rp($oldTotal)})." : '')
            .($refund > 0 ? " Kelebihan bayar {$rp($refund)} akan dikembalikan ke rekening Anda." : '')
            .($booking->outstandingAmount() > 0 ? " Sisa tagihan {$rp($booking->outstandingAmount())}." : ' Tagihan Anda LUNAS.'),
            $booking->customerUrl(), 'Lihat Invoice'));

        return $invoice;
    }

    /** S&K yang berlaku saat ini (invoice terbaru, selain itu teks bawaan) */
    public function currentTerms(Booking $booking): string
    {
        $active = $booking->invoices()->where('type', 'invoice')->active()->first();

        return $active ? (string) InvoiceTerms::forInvoice($active, $booking) : InvoiceTerms::UMRAH_DEFAULT;
    }
}
