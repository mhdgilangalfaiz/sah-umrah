<?php

namespace App\Services;

use App\Models\Flight;
use App\Models\FlightOrder;
use App\Models\Invoice;
use App\Models\Refund;
use App\Models\User;
use App\Notifications\SystemNotification;
use App\Services\Payment\PaymentService;
use App\Support\Audit;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Revisi pesanan tiket oleh admin lewat invoice — mis. agen melapor seat terpakai hanya 28 dari 30,
 * atau detail penerbangan (nomor flight/jam/rute) berubah.
 *
 * - Total baru = seat terpakai × harga per seat + baris tambahan (biaya / potongan).
 * - Kelebihan bayar dikembalikan otomatis → tercatat di menu Refund (status disetujui, tinggal transfer & unggah bukti).
 * - Kekurangan bayar → pelanggan dapat melunasi sisa tagihan dari dashboard-nya.
 * - Invoice baru bernomor "-R{n}" terbit; invoice lama berstatus "direvisi".
 */
class FlightOrderRevisionService
{
    public const CLOSED = ['dibatalkan', 'kedaluwarsa'];

    public function __construct(private InvoiceService $invoices, private PaymentService $payments) {}

    /**
     * @param  array{seats:int, unit_price:int, extras?:array, flight:array, reason:string, adjust_stock?:bool}  $data
     */
    public function revise(FlightOrder $order, array $data, ?User $by = null): Invoice
    {
        [$invoice, $refund, $order, $oldTotal] = DB::transaction(function () use ($order, $data, $by) {
            $order = FlightOrder::lockForUpdate()->with('flight')->findOrFail($order->id);
            if (in_array($order->status, self::CLOSED, true)) {
                throw ValidationException::withMessages(['seats' => 'Pesanan sudah dibatalkan/kedaluwarsa, invoice tidak dapat direvisi.']);
            }

            $oldTotal = (int) $order->total_amount;
            $oldSeats = (int) $order->pax_count;
            $seats = (int) $data['seats'];
            $unit = (int) $data['unit_price'];
            $flight = $this->cleanFlight($data['flight'] ?? [], $order);

            $items = [[
                'description' => 'Tiket '.trim($flight['airline'].' '.$flight['flight_number']).' '.$flight['route']
                    .($flight['depart'] ? ' ('.$flight['depart'].($flight['return'] ? ' – kembali '.$flight['return'] : '').')' : ''),
                'qty' => $seats, 'price' => $unit, 'total' => $seats * $unit,
            ]];
            foreach ($data['extras'] ?? [] as $x) {
                $qty = (int) $x['qty'];
                $price = (int) $x['price'];
                $items[] = ['description' => trim($x['description']), 'qty' => $qty, 'price' => $price, 'total' => $qty * $price];
            }
            $newTotal = (int) array_sum(array_column($items, 'total'));
            if ($newTotal < 0) {
                throw ValidationException::withMessages(['extras' => 'Total tagihan tidak boleh negatif — periksa nominal potongan.']);
            }

            // Stok seat jadwal penerbangan ikut disesuaikan (opsional): seat batal dikembalikan, seat tambahan diambil dari stok
            $diff = $seats - $oldSeats;
            if (! empty($data['adjust_stock']) && $diff !== 0) {
                $f = Flight::lockForUpdate()->find($order->flight_id);
                if ($diff > 0 && $f->seats_available < $diff) {
                    throw ValidationException::withMessages(['seats' => "Sisa seat penerbangan hanya {$f->seats_available}, tidak cukup untuk menambah {$diff} seat."]);
                }
                $f->seats_available = $f->seats_available - $diff;
                $f->save();
            }

            // Nominal berubah → VA/QRIS yang masih aktif dinonaktifkan agar tidak dibayar dengan nominal lama
            if ($newTotal !== $oldTotal) {
                $order->payments()->where('status', 'menunggu_pembayaran')->get()
                    ->each(fn ($p) => $this->payments->cancel($p, 'Invoice direvisi'));
            }

            $refund = max(0, (int) $order->paid_amount - $newTotal);
            $order->pax_count = $seats;
            $order->unit_price = $unit;
            $order->total_amount = $newTotal;
            $order->paid_amount = (int) $order->paid_amount - $refund;
            if ($flight['pnr']) $order->pnr = $flight['pnr'];
            if (in_array($order->status, ['menunggu_pembayaran', 'cicilan_berjalan'], true) && (int) $order->paid_amount > 0 && $order->outstandingAmount() <= 0) {
                $order->status = 'dibayar';
            }
            $order->save();

            $reason = trim($data['reason']);
            $invoice = $this->invoices->revise($order, $items, $reason, [
                'flight' => $flight,
                'seats_before' => $oldSeats, 'seats_after' => $seats,
                'total_before' => $oldTotal, 'refund' => $refund,
            ], $by);

            if ($refund > 0) {
                $this->recordRefund($order, $refund, "Revisi invoice {$invoice->number}: {$reason}", $by);
            }

            Audit::log('invoice.revisi', "Revisi invoice tiket {$order->code} → {$invoice->number} (seat {$oldSeats} → {$seats}, total Rp".number_format($oldTotal, 0, ',', '.').' → Rp'.number_format($newTotal, 0, ',', '.').'). Alasan: '.$reason,
                $order, ['pax_count' => $oldSeats, 'total_amount' => $oldTotal], ['pax_count' => $seats, 'total_amount' => $newTotal], $by);

            return [$invoice, $refund, $order, $oldTotal];
        });

        $rp = fn ($n) => 'Rp'.number_format($n, 0, ',', '.');
        $order->user->notify(new SystemNotification('pesanan', 'Invoice Diperbarui — '.$order->code,
            "Invoice pesanan tiket Anda diperbarui menjadi {$invoice->number}. {$invoice->notes} Total baru {$rp($order->total_amount)} (sebelumnya {$rp($oldTotal)})."
            .($refund > 0 ? " Kelebihan bayar {$rp($refund)} akan dikembalikan ke rekening Anda." : '')
            .($order->outstandingAmount() > 0 ? " Sisa tagihan {$rp($order->outstandingAmount())}." : ' Tagihan Anda LUNAS.'),
            $order->customerUrl(), 'Lihat Invoice'));

        return $invoice;
    }

    /**
     * Detail penerbangan dari form. Maskapai, nomor flight & rute wajib → bila kosong pakai detail yang berlaku sekarang.
     * Jadwal berangkat/kembali & PNR boleh dikosongkan (mis. tiket sekali jalan).
     */
    private function cleanFlight(array $in, FlightOrder $order): array
    {
        $base = $order->flightDetails();
        $val = fn ($k) => ($v = trim((string) ($in[$k] ?? ''))) !== '' ? $v : null;

        return [
            'airline' => $val('airline') ?? $base['airline'],
            'flight_number' => $val('flight_number') ?? $base['flight_number'],
            'route' => $val('route') ?? $base['route'],
            'depart' => $val('depart'),
            'return' => $val('return'),
            'pnr' => ($p = $val('pnr')) ? strtoupper($p) : null,
        ];
    }

    /** Kelebihan bayar → refund disetujui (memakai rekening refund terakhir pelanggan bila ada) */
    private function recordRefund(FlightOrder $order, int $amount, string $reason, ?User $by): Refund
    {
        $last = Refund::where('user_id', $order->user_id)->whereNotNull('bank_name')->latest()->first();

        return Refund::create([
            'code' => 'RF-'.now()->format('ymd').'-'.strtoupper(Str::random(4)),
            'type' => 'refund', 'user_id' => $order->user_id,
            'refundable_type' => $order->getMorphClass(), 'refundable_id' => $order->id,
            'requested_amount' => $amount, 'approved_amount' => $amount, 'reason' => $reason,
            'bank_name' => $last?->bank_name, 'account_number' => $last?->account_number, 'account_holder' => $last?->account_holder,
            'status' => 'disetujui', 'reviewed_by' => $by?->id, 'reviewed_at' => now(),
        ]);
    }
}
