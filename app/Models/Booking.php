<?php

namespace App\Models;

use App\Contracts\Payable;
use App\Models\Concerns\IsPayable;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Model;

/**
 * Pemesanan Paket Umrah.
 *
 * Skema cicilan kustom:
 *  - Pembayaran pertama WAJIB minimal deposit awal (default Rp3.000.000 per jamaah, diatur per paket).
 *  - Selanjutnya pelanggan bebas membayar nominal berapa pun (≥ minimal termin) sampai lunas.
 *  - Sisa tagihan = total − total dibayar. Batas pelunasan H-30 keberangkatan.
 *  - Lewat batas → pengingat email + WhatsApp otomatis terus-menerus sampai lunas.
 */
class Booking extends Model implements Payable
{
    use IsPayable;

    protected $fillable = [
        'code', 'user_id', 'package_departure_id', 'room_type', 'pax_count', 'unit_price', 'total_amount',
        'paid_amount', 'payment_scheme', 'status', 'seats_confirmed', 'hold_expires_at', 'payment_deadline',
        'notes', 'cancelled_at', 'cancel_reason',
    ];

    protected function casts(): array
    {
        return [
            'hold_expires_at' => 'datetime', 'payment_deadline' => 'date:Y-m-d', 'cancelled_at' => 'datetime',
            'seats_confirmed' => 'boolean', 'unit_price' => 'integer', 'total_amount' => 'integer',
            'paid_amount' => 'integer', 'pax_count' => 'integer',
        ];
    }

    public function departure() { return $this->belongsTo(PackageDeparture::class, 'package_departure_id'); }
    public function installments() { return $this->hasMany(PaymentInstallment::class)->orderBy('sequence'); }

    public function requiredDeposit(): int
    {
        $pkg = $this->departure->package;
        $deposit = (int) $pkg->min_deposit * (config('payment.deposit_per_pax', true) ? $this->pax_count : 1);

        return min($deposit, (int) $this->total_amount);
    }

    public function minimumPayment(): int
    {
        $outstanding = $this->outstandingAmount();
        if ($this->payment_scheme === 'lunas') return $outstanding;
        if ((int) $this->paid_amount === 0) return min($this->requiredDeposit(), $outstanding);

        return min((int) config('payment.min_installment_amount', 500000), $outstanding);
    }

    public function allowsCustomAmount(): bool
    {
        return $this->payment_scheme === 'cicilan';
    }

    public function canBePaid(): bool
    {
        return in_array($this->status, ['menunggu_pembayaran', 'cicilan_berjalan'], true) && $this->outstandingAmount() > 0;
    }

    public function paymentExpiry(): CarbonInterface
    {
        $default = now()->addHours((int) config('payment.expiry_hours', 24));
        // Sebelum deposit dibayar, VA tidak boleh melewati batas hold kursi
        if (! $this->seats_confirmed && $this->hold_expires_at && $this->hold_expires_at->lt($default)) {
            return $this->hold_expires_at;
        }

        return $default;
    }

    public function applyPayment(Payment $payment): void
    {
        $this->paid_amount = (int) $this->paid_amount + (int) $payment->amount;

        // Konfirmasi kursi: kursi yang ditahan menjadi terkonfirmasi setelah DP/lunas dibayar
        if (! $this->seats_confirmed) {
            $dep = PackageDeparture::lockForUpdate()->find($this->package_departure_id);
            $dep->held = max(0, $dep->held - $this->pax_count);
            $dep->booked = $dep->booked + $this->pax_count;
            $dep->save();
            $this->seats_confirmed = true;
            $this->hold_expires_at = null;
        }

        // Alokasikan nominal ke termin berurutan (DP → Termin 1 → ...)
        $remaining = (int) $payment->amount;
        foreach ($this->installments()->where('status', '!=', 'lunas')->get() as $inst) {
            if ($remaining <= 0) break;
            $need = $inst->amount - $inst->paid_amount;
            $alloc = min($need, $remaining);
            $inst->paid_amount += $alloc;
            $inst->status = $inst->paid_amount >= $inst->amount ? 'lunas' : 'sebagian';
            $inst->save();
            $remaining -= $alloc;
        }

        $this->status = $this->outstandingAmount() <= 0 ? 'lunas' : 'cicilan_berjalan';
        $this->save();
    }

    public function payableLabel(): string
    {
        return 'Paket Umrah '.$this->departure->package->name.' ('.$this->code.')';
    }

    public function customerUrl(): string
    {
        return route('customer.bookings.show', $this);
    }

    public function isOverdue(): bool
    {
        return $this->outstandingAmount() > 0 && $this->payment_deadline && $this->payment_deadline->isPast()
            && in_array($this->status, ['cicilan_berjalan', 'menunggu_pembayaran'], true);
    }

    public function getRouteKeyName(): string
    {
        return 'code';
    }
}
