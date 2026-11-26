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
        'tunai' => 'Tunai (Kantor)',
    ];

    public const STATUSES = [
        'menunggu_pembayaran' => 'Menunggu Pembayaran',
        'dibayar' => 'Dibayar',
        'kedaluwarsa' => 'Kedaluwarsa',
        'gagal' => 'Gagal',
        'refund' => 'Refund',
        'menunggu_verifikasi' => 'Menunggu Verifikasi',
        'ditolak' => 'Ditolak',
    ];

    protected $fillable = [
        'code', 'user_id', 'payable_type', 'payable_id', 'payment_installment_id', 'amount', 'method', 'gateway',
        'gateway_id', 'va_number', 'qr_string', 'status', 'idempotency_key', 'expires_at', 'paid_at', 'gateway_response',
        'proof_path', 'proof_name', 'proof_note', 'proof_uploaded_at', 'review_note', 'reviewed_by', 'reviewed_at',
    ];

    protected $hidden = ['gateway_response', 'proof_path'];

    protected $appends = ['method_label', 'proof_url', 'needs_proof'];

    protected function casts(): array
    {
        return ['expires_at' => 'datetime', 'paid_at' => 'datetime', 'proof_uploaded_at' => 'datetime', 'reviewed_at' => 'datetime', 'gateway_response' => 'array', 'amount' => 'integer'];
    }

    public function getMethodLabelAttribute(): string
    {
        return self::METHODS[$this->method] ?? $this->method;
    }

    /** Tautan melihat bukti pembayaran (pemilik & admin) */
    public function getProofUrlAttribute(): ?string
    {
        return $this->proof_path ? route('payments.proof', $this->code) : null;
    }

    /** Pembayaran sukses yang belum dilengkapi bukti pembayaran */
    public function getNeedsProofAttribute(): bool
    {
        return $this->status === 'dibayar' && ! $this->proof_path;
    }

    public function payable() { return $this->morphTo(); }
    public function user() { return $this->belongsTo(User::class); }
    public function installment() { return $this->belongsTo(PaymentInstallment::class, 'payment_installment_id'); }

    public function isPending(): bool
    {
        return $this->status === 'menunggu_pembayaran' && $this->expires_at?->isFuture();
    }

    public function getRouteKeyName(): string { return 'code'; }
}
