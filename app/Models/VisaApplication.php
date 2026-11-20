<?php

namespace App\Models;

use App\Contracts\Payable;
use App\Models\Concerns\IsPayable;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Model;

/**
 * Alur visa: pengajuan → admin terbitkan invoice (bisa diubah) → bayar via gateway → invoice lunas
 *  → upload berkas (zip/rar) → verifikasi admin → diproses → terbit / ditolak.
 */
class VisaApplication extends Model implements Payable
{
    use IsPayable;

    public const STATUSES = [
        'menunggu_invoice' => 'Menunggu Invoice',
        'menunggu_pembayaran' => 'Menunggu Pembayaran',
        'menunggu_dokumen' => 'Menunggu Dokumen',
        'diverifikasi' => 'Diverifikasi',
        'diproses' => 'Diproses',
        'terbit' => 'Terbit',
        'ditolak' => 'Ditolak',
        'dibatalkan' => 'Dibatalkan',
    ];

    protected $fillable = [
        'code', 'user_id', 'visa_service_id', 'pax_count', 'planned_departure', 'notes', 'status', 'unit_price',
        'extra_fee', 'extra_fee_label', 'discount', 'total_amount', 'paid_amount', 'invoice_issued_at',
        'rejection_reason', 'issued_at',
    ];

    protected function casts(): array
    {
        return [
            'planned_departure' => 'date:Y-m-d', 'invoice_issued_at' => 'datetime', 'issued_at' => 'datetime',
            'unit_price' => 'integer', 'extra_fee' => 'integer', 'discount' => 'integer', 'total_amount' => 'integer',
            'paid_amount' => 'integer', 'pax_count' => 'integer',
        ];
    }

    public function service() { return $this->belongsTo(VisaService::class, 'visa_service_id'); }
    public function statusLogs() { return $this->hasMany(VisaStatusLog::class)->latest(); }

    public function recalculateTotal(): void
    {
        $this->total_amount = max(0, $this->unit_price * $this->pax_count + $this->extra_fee - $this->discount);
    }

    /** Ubah status + simpan riwayat perubahan status */
    public function transitionTo(string $status, ?string $note = null, ?int $by = null): void
    {
        $from = $this->status;
        $this->status = $status;
        $this->save();
        $this->statusLogs()->create(['from_status' => $from, 'to_status' => $status, 'note' => $note, 'changed_by' => $by]);
    }

    public function minimumPayment(): int { return $this->outstandingAmount(); }

    public function allowsCustomAmount(): bool { return false; }

    public function canBePaid(): bool
    {
        return $this->status === 'menunggu_pembayaran' && $this->outstandingAmount() > 0;
    }

    public function paymentExpiry(): CarbonInterface
    {
        return now()->addHours((int) config('payment.expiry_hours', 24));
    }

    public function applyPayment(Payment $payment): void
    {
        $this->paid_amount = (int) $this->paid_amount + (int) $payment->amount;
        $this->save();
        if ($this->outstandingAmount() <= 0) {
            $this->transitionTo('menunggu_dokumen', 'Pembayaran lunas diterima. Silakan unggah berkas (zip/rar).');
        }
    }

    public function payableLabel(): string
    {
        return ($this->service->name ?? 'Visa').' — '.$this->pax_count.' orang ('.$this->code.')';
    }

    public function customerUrl(): string
    {
        return route('customer.visa.show', $this);
    }

    public function getRouteKeyName(): string { return 'code'; }
}
