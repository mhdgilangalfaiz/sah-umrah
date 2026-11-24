<?php

namespace App\Models;

use App\Contracts\Payable;
use App\Models\Concerns\IsPayable;
use App\Notifications\SystemNotification;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class FlightOrder extends Model implements Payable
{
    use IsPayable;

    protected $fillable = [
        'code', 'user_id', 'flight_id', 'pax_count', 'unit_price', 'total_amount', 'paid_amount', 'status',
        'contact_email', 'contact_phone', 'pnr', 'issued_at', 'expires_at',
        'buyer_type', 'bill_company', 'bill_name', 'bill_address', 'settlement_due_at', 'manifest_uploaded_at', 'manifest_warnings',
    ];

    public const BUYER_TYPES = ['agen' => 'Agen / Travel', 'perorangan' => 'Perorangan / Keluarga'];

    protected function casts(): array
    {
        return [
            'issued_at' => 'datetime', 'expires_at' => 'datetime', 'settlement_due_at' => 'datetime', 'manifest_uploaded_at' => 'datetime',
            'manifest_warnings' => 'array',
            'unit_price' => 'integer', 'total_amount' => 'integer', 'paid_amount' => 'integer', 'pax_count' => 'integer',
        ];
    }

    public function flight() { return $this->belongsTo(Flight::class); }

    /** DP minimum pembayaran pertama: persentase dari total (config payment.flight_min_dp_percent), dibulatkan ke atas per Rp1.000 */
    public function requiredDeposit(): int
    {
        $pct = max(0, min(100, (int) config('payment.flight_min_dp_percent', 30)));

        return min((int) $this->total_amount, (int) (ceil($this->total_amount * $pct / 100 / 1000) * 1000));
    }

    /** Pembayaran pertama minimal DP, selanjutnya bebas dicicil (minimal nominal cicilan) sampai lunas */
    public function minimumPayment(): int
    {
        $outstanding = $this->outstandingAmount();
        if ((int) $this->paid_amount === 0) return min(max(1, $this->requiredDeposit()), $outstanding);

        return min((int) config('payment.min_installment_amount', 500000), $outstanding);
    }

    public function allowsCustomAmount(): bool { return true; }

    public function canBePaid(): bool
    {
        if ($this->status === 'menunggu_pembayaran') {
            return (bool) $this->expires_at?->isFuture();
        }
        if ($this->status === 'cicilan_berjalan') {
            return $this->outstandingAmount() > 0;
        }

        // Invoice direvisi naik setelah lunas (mis. tambah seat) → sisa tagihan tetap bisa dibayar tanpa mengubah status pesanan
        return in_array($this->status, ['dibayar', 'tiket_terbit'], true) && $this->outstandingAmount() > 0;
    }

    public function paymentExpiry(): CarbonInterface
    {
        // Sebelum DP masuk, VA tidak boleh melewati batas tahan seat
        if ($this->status === 'menunggu_pembayaran' && $this->expires_at) return $this->expires_at;

        return now()->addHours((int) config('payment.expiry_hours', 24));
    }

    public function applyPayment(Payment $payment): void
    {
        $this->paid_amount = (int) $this->paid_amount + (int) $payment->amount;
        // Pelunasan sisa tagihan revisi tidak boleh menurunkan status "tiket_terbit"
        if (in_array($this->status, ['menunggu_pembayaran', 'cicilan_berjalan'], true) && $this->outstandingAmount() <= 0) {
            $this->status = 'dibayar';
            // Lunas → pembeli diminta mengunggah manifest penumpang
            if (! $this->manifest_uploaded_at) {
                $order = $this;
                DB::afterCommit(fn () => $order->user?->notify(new SystemNotification('pesanan',
                    'Lunas — Silakan Unggah Manifest '.$order->code,
                    'Pembayaran '.$order->pax_count.' seat sudah lunas. Silakan unggah manifest penumpang (Excel) agar tiket dapat kami terbitkan.',
                    $order->customerUrl(), 'Unggah Manifest')));
            }
        } elseif ($this->status === 'menunggu_pembayaran') {
            // DP masuk → seat terkunci untuk pembeli, sisa tagihan dicicil sampai lunas
            $this->status = 'cicilan_berjalan';
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

    /** Penerima invoice: nama travel/perusahaan & penanggung jawab (null → pakai data akun) */
    public function billTo(): ?array
    {
        if (! $this->bill_name && ! $this->bill_company) return null;

        return [
            'company' => $this->bill_company,
            'name' => $this->bill_name,
            'address' => $this->bill_address,
            'phone' => $this->contact_phone,
            'email' => $this->contact_email,
        ];
    }

    /** Manifest boleh diunggah/diganti setelah lunas dan sebelum e-ticket terbit */
    public function canUploadManifest(): bool
    {
        return $this->status === 'dibayar';
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
