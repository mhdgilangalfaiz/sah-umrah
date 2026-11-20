<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    public const METHODS = [
        'va_mandiri' => 'Virtual Account Mandiri',
        'va_bsi' => 'Virtual Account BSI',
        'va_muamalat' => 'Virtual Account Muamalat',
        'qris' => 'QRIS',
    ];

    public const STATUSES = [
        'menunggu_pembayaran' => 'Menunggu Pembayaran',
        'dibayar' => 'Dibayar',
        'kedaluwarsa' => 'Kedaluwarsa',
        'gagal' => 'Gagal',
        'refund' => 'Refund',
    ];

    protected $fillable = [
        'code', 'user_id', 'payable_type', 'payable_id', 'payment_installment_id', 'amount', 'method', 'gateway',
        'gateway_id', 'va_number', 'qr_string', 'status', 'idempotency_key', 'expires_at', 'paid_at', 'gateway_response',
    ];

    protected $hidden = ['gateway_response'];

    protected $appends = ['method_label'];

    protected function casts(): array
    {
        return ['expires_at' => 'datetime', 'paid_at' => 'datetime', 'gateway_response' => 'array', 'amount' => 'integer'];
    }

    public function getMethodLabelAttribute(): string
    {
        return self::METHODS[$this->method] ?? $this->method;
    }

    public function payable() { return $this->morphTo(); }
    public function user() { return $this->belongsTo(User::class); }
    public function installment() { return $this->belongsTo(PaymentInstallment::class, 'payment_installment_id'); }
    public function receipt() { return $this->hasOne(Invoice::class)->where('type', 'kwitansi'); }

    public function isPending(): bool
    {
        return $this->status === 'menunggu_pembayaran' && $this->expires_at?->isFuture();
    }

    public function getRouteKeyName(): string { return 'code'; }
}
