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
        return $this->status === 'menunggu_pembayaran' && $this->expires_at?->isFuture();
    }

    public function paymentExpiry(): CarbonInterface
    {
        return $this->expires_at ?? now()->addHours(3);
    }

    public function applyPayment(Payment $payment): void
    {
        $this->paid_amount = (int) $this->paid_amount + (int) $payment->amount;
        if ($this->outstandingAmount() <= 0) {
            $this->status = 'dibayar';
        }
        $this->save();
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
