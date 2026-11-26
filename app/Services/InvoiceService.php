<?php

namespace App\Services;

use App\Contracts\Payable;
use App\Models\Booking;
use App\Models\FlightOrder;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Setting;
use App\Models\User;
use App\Models\VisaApplication;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Database\Eloquent\Model;

/** Invoice (tagihan + riwayat pembayaran) otomatis + render PDF. Tidak ada kwitansi terpisah. */
class InvoiceService
{
    public function items(Model $payable): array
    {
        return match (true) {
            $payable instanceof Booking => $this->bookingItems($payable),
            $payable instanceof FlightOrder => [[
                'description' => $payable->ticketDescription(),
                'qty' => $payable->pax_count, 'price' => $payable->unit_price, 'total' => $payable->total_amount,
            ]],
            $payable instanceof VisaApplication => array_values(array_filter([
                ['description' => $payable->service->name, 'qty' => $payable->pax_count, 'price' => $payable->unit_price, 'total' => $payable->unit_price * $payable->pax_count],
                $payable->extra_fee > 0 ? ['description' => $payable->extra_fee_label ?: 'Biaya tambahan', 'qty' => 1, 'price' => $payable->extra_fee, 'total' => $payable->extra_fee] : null,
                $payable->discount > 0 ? ['description' => 'Potongan', 'qty' => 1, 'price' => -$payable->discount, 'total' => -$payable->discount] : null,
            ])),
            default => [],
        };
    }

    /** Baris invoice umrah dikelompokkan per kategori & harga jamaah (mis. 1 Dewasa + 1 Anak) */
    private function bookingItems(Booking $b): array
    {
        $label = 'Paket Umrah '.$b->departure->package->name.' — berangkat '.$b->departure->departure_date->translatedFormat('d M Y').' (kamar '.ucfirst($b->room_type).')';
        $groups = $b->passengers()->get(['category', 'price'])->groupBy(fn ($p) => ($p->category ?: 'dewasa').'|'.($p->price ?? $b->unit_price));
        if ($groups->isEmpty()) {
            return [['description' => $label, 'qty' => $b->pax_count, 'price' => $b->unit_price, 'total' => $b->unit_price * $b->pax_count]];
        }
        $single = $groups->count() === 1;

        return $groups->map(function ($rows, $key) use ($label, $single) {
            [$cat, $price] = explode('|', $key);

            return ['description' => $label.($single && $cat === 'dewasa' ? '' : ' — '.(\App\Models\BookingPassenger::CATEGORIES[$cat] ?? ucfirst($cat))),
                'qty' => $rows->count(), 'price' => (int) $price, 'total' => (int) $price * $rows->count()];
        })->values()->all();
    }

    /** Pesanan berubah (jamaah dikurangi/diubah) → invoice tagihan ikut diperbarui meski sudah ada pembayaran */
    public function refreshInvoice(Model&Payable $payable): void
    {
        $invoice = $payable->invoices()->where('type', 'invoice')->active()->first();
        if (! $invoice) {
            $this->issueInvoice($payable);

            return;
        }
        $invoice->update([
            'amount' => $payable->total_amount,
            'items' => $this->items($payable),
            'status' => (int) $payable->paid_amount >= (int) $payable->total_amount ? 'lunas' : 'belum_lunas',
        ]);
    }

    /** Terbitkan (atau perbarui jika belum dibayar sama sekali) invoice tagihan */
    public function issueInvoice(Model&Payable $payable): Invoice
    {
        $existing = $payable->invoices()->where('type', 'invoice')->active()->first();
        if ($existing && $existing->status === 'belum_lunas' && (int) $payable->paid_amount === 0) {
            $existing->update(['amount' => $payable->total_amount, 'items' => $this->items($payable)]);

            return $existing;
        }
        if ($existing) return $existing;

        return Invoice::create([
            'number' => Invoice::nextNumber('invoice'),
            'type' => 'invoice',
            'invoiceable_type' => $payable->getMorphClass(),
            'invoiceable_id' => $payable->getKey(),
            'user_id' => $payable->user_id,
            'amount' => $payable->total_amount,
            'items' => $this->items($payable),
            'status' => 'belum_lunas',
            'issued_at' => now(),
        ]);
    }

    /**
     * Revisi invoice oleh admin: terbitkan invoice baru bernomor "-R{n}" berisi baris tagihan terbaru,
     * invoice lama berstatus "direvisi" (tetap tersimpan sebagai riwayat). Total pesanan harus sudah diperbarui pemanggil.
     */
    public function revise(Model&Payable $payable, array $items, string $notes, ?array $details, ?User $by): Invoice
    {
        $current = $payable->invoices()->where('type', 'invoice')->active()->first();
        $revision = $current ? $current->revision + 1 : 0;

        $invoice = Invoice::create([
            'number' => $current ? $current->revisionNumber($revision) : Invoice::nextNumber('invoice'),
            'type' => 'invoice',
            'invoiceable_type' => $payable->getMorphClass(),
            'invoiceable_id' => $payable->getKey(),
            'user_id' => $payable->user_id,
            'amount' => $payable->total_amount,
            'items' => $items,
            'notes' => $notes,
            'details' => $details,
            'status' => (int) $payable->paid_amount >= (int) $payable->total_amount ? 'lunas' : 'belum_lunas',
            'revision' => $revision,
            'replaces_id' => $current?->id,
            'revised_by' => $by?->id,
            'issued_at' => now(),
        ]);
        $current?->update(['status' => 'direvisi']);

        return $invoice;
    }

    /**
     * Setelah pembayaran diterima: tidak ada kwitansi terpisah — cukup tandai invoice berlaku "lunas" bila tagihan sudah terbayar penuh.
     * Riwayat pembayaran tercetak di invoice (lihat paymentHistory()).
     */
    public function syncPaidStatus(Model&Payable $payable): void
    {
        if ($payable->outstandingAmount() <= 0) {
            $payable->invoices()->where('type', 'invoice')->where('status', 'belum_lunas')->update(['status' => 'lunas']);
        }
    }

    /** Jenis pembayaran untuk dicetak di invoice */
    public const PAYMENT_TYPES = [
        'va_mandiri' => 'Transfer Mandiri',
        'va_bsi' => 'Transfer BSI',
        'va_muamalat' => 'Transfer Muamalat',
        'qris' => 'QRIS',
    ];

    /**
     * Riwayat pembayaran sebuah pesanan: tanggal, jenis pembayaran, keterangan, nominal.
     * Keterangan: pembayaran pertama "Deposit", berikutnya "Pembayaran Termin 1, 2, …", yang menutup tagihan "Lunas".
     *
     * @return array<int, array{date:string, type:string, info:string, amount:int}>
     */
    public function paymentHistory(?Model $payable, int $total): array
    {
        if (! $payable || ! method_exists($payable, 'payments')) return [];

        $rows = [];
        $sum = 0;
        $term = 0;
        $payments = $payable->payments()->reorder()->where('status', 'dibayar')->orderBy('paid_at')->orderBy('id')->get();
        foreach ($payments as $i => $p) {
            $sum += (int) $p->amount;
            $info = match (true) {
                $sum >= $total && $total > 0 => 'Lunas',
                $i === 0 => 'Deposit',
                default => 'Pembayaran Termin '.(++$term),
            };
            $rows[] = [
                'date' => ($p->paid_at ?? $p->updated_at)->format('d-m-Y'),
                'type' => self::PAYMENT_TYPES[$p->method] ?? $p->method_label,
                'info' => $info,
                'amount' => (int) $p->amount,
                'code' => $p->code,
            ];
        }

        return $rows;
    }

    public function pdf(Invoice $invoice)
    {
        $invoice->loadMissing('invoiceable', 'user', 'payment', 'replaces');
        $payable = $invoice->invoiceable;

        return Pdf::loadView('pdf.invoice', [
            'invoice' => $invoice,
            'payable' => $payable,
            'company' => Setting::allCached(),
            'paid' => $payable?->paid_amount ?? 0,
            'outstanding' => $payable?->outstandingAmount() ?? 0,
            'history' => $this->paymentHistory($payable, (int) $invoice->amount),
            // Syarat & ketentuan (tiket pesawat): versi invoice ini bila pernah direvisi, selain itu teks bawaan
            'terms' => $payable instanceof FlightOrder
                ? \App\Support\InvoiceTerms::lines(array_key_exists('terms', $invoice->details ?? []) ? $invoice->details['terms'] : \App\Support\InvoiceTerms::FLIGHT_DEFAULT)
                : [],
        ])->setPaper('a4');
    }
}
