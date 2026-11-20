<?php

namespace App\Models\Concerns;

use App\Models\BookingPassenger;
use App\Models\Document;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Refund;
use App\Models\User;

trait IsPayable
{
    public function user() { return $this->belongsTo(User::class); }
    public function payments() { return $this->morphMany(Payment::class, 'payable')->latest(); }
    public function passengers() { return $this->morphMany(BookingPassenger::class, 'orderable'); }
    public function invoices() { return $this->morphMany(Invoice::class, 'invoiceable')->latest('issued_at'); }
    public function refunds() { return $this->morphMany(Refund::class, 'refundable'); }
    public function documents() { return $this->morphMany(Document::class, 'documentable'); }

    public function outstandingAmount(): int
    {
        return max(0, (int) $this->total_amount - (int) $this->paid_amount);
    }

    public function pendingPayment(): ?Payment
    {
        return $this->payments()->where('status', 'menunggu_pembayaran')->where('expires_at', '>', now())->first();
    }

    /** Membuat kode pesanan unik, mis. SAH-U-261119-4F7K */
    public static function generateCode(string $prefix): string
    {
        do {
            $code = 'SAH-'.$prefix.'-'.now()->format('ymd').'-'.strtoupper(\Illuminate\Support\Str::random(4));
        } while (static::where('code', $code)->exists());

        return $code;
    }
}
