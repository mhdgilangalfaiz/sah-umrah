<?php

namespace App\Services;

use App\Contracts\Payable;
use App\Models\Booking;
use App\Models\FlightOrder;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Setting;
use App\Models\VisaApplication;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Database\Eloquent\Model;

/** Invoice (tagihan) dan kwitansi (bukti bayar) otomatis + render PDF. */
class InvoiceService
{
    public function items(Model $payable): array
    {
        return match (true) {
            $payable instanceof Booking => $this->bookingItems($payable),
            $payable instanceof FlightOrder => [[
                'description' => 'Tiket '.$payable->flight->airline.' '.$payable->flight->flight_number.' '.$payable->flight->route_label.' ('.$payable->flight->depart_at->translatedFormat('d M Y H:i').($payable->flight->return_depart_at ? ' – kembali '.$payable->flight->return_depart_at->translatedFormat('d M Y H:i') : '').')',
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
        $invoice = $payable->invoices()->where('type', 'invoice')->where('status', '!=', 'batal')->first();
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
        $existing = $payable->invoices()->where('type', 'invoice')->where('status', '!=', 'batal')->first();
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

    public function issueReceipt(Payment $payment, Model&Payable $payable): Invoice
    {
        $receipt = Invoice::create([
            'number' => Invoice::nextNumber('kwitansi'),
            'type' => 'kwitansi',
            'invoiceable_type' => $payable->getMorphClass(),
            'invoiceable_id' => $payable->getKey(),
            'user_id' => $payment->user_id,
            'payment_id' => $payment->id,
            'amount' => $payment->amount,
            'items' => [[
                'description' => 'Pembayaran '.($payment->installment?->label ?? 'pesanan').' — '.$payable->payableLabel().' via '.$payment->method_label,
                'qty' => 1, 'price' => $payment->amount, 'total' => $payment->amount,
            ]],
            'status' => 'lunas',
            'issued_at' => now(),
        ]);

        if ($payable->outstandingAmount() <= 0) {
            $payable->invoices()->where('type', 'invoice')->where('status', 'belum_lunas')->update(['status' => 'lunas']);
        }

        return $receipt;
    }

    public function pdf(Invoice $invoice)
    {
        $invoice->loadMissing('invoiceable', 'user', 'payment');
        $payable = $invoice->invoiceable;

        return Pdf::loadView('pdf.invoice', [
            'invoice' => $invoice,
            'payable' => $payable,
            'company' => Setting::allCached(),
            'paid' => $payable?->paid_amount ?? 0,
            'outstanding' => $payable?->outstandingAmount() ?? 0,
        ])->setPaper('a4');
    }
}
