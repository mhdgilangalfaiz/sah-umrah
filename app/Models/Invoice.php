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

    protected function casts(): array
    {
        return ['items' => 'array', 'details' => 'array', 'issued_at' => 'datetime', 'amount' => 'integer', 'revision' => 'integer'];
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
