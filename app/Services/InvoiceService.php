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
            $payable instanceof Booking => array_values(array_filter([[
                'description' => 'Paket Umrah '.$payable->departure->package->name.' — berangkat '.$payable->departure->departure_date->translatedFormat('d M Y').' (kamar '.ucfirst($payable->room_type).')',
                'qty' => $payable->pax_count, 'price' => $payable->unit_price, 'total' => $payable->unit_price * $payable->pax_count,
            ]])),
            $payable instanceof FlightOrder => [[
                'description' => 'Tiket '.$payable->flight->airline.' '.$payable->flight->flight_number.' '.$payable->flight->origin_code.' → '.$payable->flight->destination_code.' ('.$payable->flight->depart_at->translatedFormat('d M Y H:i').')',
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
