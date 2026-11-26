<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class Invoice extends Model
{
    /** Invoice yang tidak berlaku lagi: dibatalkan, atau sudah diganti invoice revisi */
    public const INACTIVE = ['batal', 'direvisi'];

    protected $fillable = [
        'number', 'type', 'invoiceable_type', 'invoiceable_id', 'user_id', 'payment_id', 'amount', 'items', 'status', 'issued_at',
        'revision', 'replaces_id', 'revised_by', 'notes', 'details',
    ];

    /** Label yang ditampilkan (stempel PDF & daftar invoice) */
    protected $appends = ['display_status'];

    protected function casts(): array
    {
        return ['items' => 'array', 'details' => 'array', 'issued_at' => 'datetime', 'amount' => 'integer', 'revision' => 'integer'];
    }

    /**
     * Invoice yang sudah diganti revisi tetap ditampilkan "lunas" / "belum lunas" (bukan "direvisi"):
     * lunas bila total pembayaran pesanan sudah menutup nominal invoice tersebut.
     */
    public function getDisplayStatusAttribute(): string
    {
        if ($this->status !== 'direvisi') return (string) $this->status;
        $paid = (int) ($this->invoiceable?->paid_amount ?? 0);

        return $paid >= (int) $this->amount ? 'lunas' : 'belum_lunas';
    }

    public function invoiceable() { return $this->morphTo(); }
    public function user() { return $this->belongsTo(User::class); }
    public function payment() { return $this->belongsTo(Payment::class); }
    public function replaces() { return $this->belongsTo(self::class, 'replaces_id'); }
    public function replacedBy() { return $this->hasOne(self::class, 'replaces_id'); }
    public function reviser() { return $this->belongsTo(User::class, 'revised_by'); }

    /** Invoice yang masih berlaku (bukan batal / direvisi) */
    public function scopeActive(Builder $q): Builder
    {
        return $q->whereNotIn('status', self::INACTIVE);
    }

    /**
     * Subquery "nomor invoice berlaku" untuk daftar pesanan, mis.
     * Booking::addSelect(['bookings.*', 'invoice_number' => Invoice::activeNumberQuery(Booking::class, 'bookings')]).
     */
    public static function activeNumberQuery(string $model, string $table)
    {
        return static::select('number')
            ->whereColumn('invoiceable_id', $table.'.id')->where('invoiceable_type', (new $model)->getMorphClass())
            ->where('type', 'invoice')->whereNotIn('status', self::INACTIVE)->latest('issued_at')->limit(1);
    }

    /** INV/SAH/2026/11/0001 atau KWT/SAH/2026/11/0001 */
    public static function nextNumber(string $type): string
    {
        $prefix = ($type === 'kwitansi' ? 'KWT' : 'INV').'/SAH/'.now()->format('Y/m').'/';
        // Nomor revisi (…/0003-R1) memakai nomor induk yang sama → abaikan saat mencari urutan berikutnya
        $last = static::where('number', 'like', $prefix.'%')->where('number', 'not like', '%-R%')->orderByDesc('id')->value('number');
        $seq = $last ? ((int) substr($last, -4)) + 1 : 1;

        return $prefix.str_pad((string) $seq, 4, '0', STR_PAD_LEFT);
    }

    /** INV/SAH/2026/11/0003 → INV/SAH/2026/11/0003-R2 (revisi ke-2) */
    public function revisionNumber(int $revision): string
    {
        return preg_replace('/-R\d+$/', '', $this->number).'-R'.$revision;
    }
}
