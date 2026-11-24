<?php

namespace App\Models;

use App\Contracts\Payable;
use App\Models\Concerns\IsPayable;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Model;

class FlightOrder extends Model implements Payable
{
    use IsPayable;

    protected $fillable = [
        'code', 'user_id', 'flight_id', 'pax_count', 'unit_price', 'total_amount', 'paid_amount', 'status',
        'contact_email', 'contact_phone', 'pnr', 'issued_at', 'expires_at',
    ];

    protected function casts(): array
    {
        return [
            'issued_at' => 'datetime', 'expires_at' => 'datetime',
            'unit_price' => 'integer', 'total_amount' => 'integer', 'paid_amount' => 'integer', 'pax_count' => 'integer',
        ];
    }

    public function flight() { return $this->belongsTo(Flight::class); }

    public function minimumPayment(): int { return $this->outstandingAmount(); }

    public function allowsCustomAmount(): bool { return false; }

    public function canBePaid(): bool
    {
        if ($this->status === 'menunggu_pembayaran') {
            return (bool) $this->expires_at?->isFuture();
        }

        // Invoice direvisi naik setelah lunas (mis. tambah seat) → sisa tagihan tetap bisa dibayar tanpa mengubah status pesanan
        return in_array($this->status, ['dibayar', 'tiket_terbit'], true) && $this->outstandingAmount() > 0;
    }

    public function paymentExpiry(): CarbonInterface
    {
        return $this->expires_at ?? now()->addHours(3);
    }

    public function applyPayment(Payment $payment): void
    {
        $this->paid_amount = (int) $this->paid_amount + (int) $payment->amount;
        // Pelunasan sisa tagihan revisi tidak boleh menurunkan status "tiket_terbit"
        if ($this->outstandingAmount() <= 0 && $this->status === 'menunggu_pembayaran') {
            $this->status = 'dibayar';
        }
        $this->save();
    }

    /** Invoice tagihan yang sedang berlaku (revisi terbaru) */
    public function activeInvoice(): ?Invoice
    {
        return $this->invoices()->where('type', 'invoice')->active()->first();
    }

    /**
     * Detail penerbangan yang berlaku untuk pesanan ini: hasil revisi invoice bila admin mengubahnya,
     * selain itu diambil dari jadwal penerbangan. Jadwal penerbangan (stok mitra) tidak diubah karena dipakai pesanan lain.
     */
    public function flightDetails(): array
    {
        $override = $this->activeInvoice()?->details['flight'] ?? null;
        if ($override) return $override;

        $f = $this->flight;
        $fmt = fn ($d) => $d?->translatedFormat('d M Y H:i');

        return [
            'airline' => $f->airline,
            'flight_number' => $f->flight_number,
            'route' => $f->route_label,
            'depart' => $fmt($f->depart_at),
            'return' => $fmt($f->return_depart_at),
            'pnr' => $this->pnr,
        ];
    }

    public function payableLabel(): string
    {
        return 'Tiket '.$this->flight->airline.' '.$this->flight->route_label.' ('.$this->code.')';
    }

    public function customerUrl(): string
    {
        return route('customer.flight-orders.show', $this);
    }

    public function getRouteKeyName(): string { return 'code'; }
}
