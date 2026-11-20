<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Invoice extends Model
{
    protected $fillable = [
        'number', 'type', 'invoiceable_type', 'invoiceable_id', 'user_id', 'payment_id', 'amount', 'items', 'status', 'issued_at',
    ];

    protected function casts(): array
    {
        return ['items' => 'array', 'issued_at' => 'datetime', 'amount' => 'integer'];
    }

    public function invoiceable() { return $this->morphTo(); }
    public function user() { return $this->belongsTo(User::class); }
    public function payment() { return $this->belongsTo(Payment::class); }

    /** INV/SAH/2026/11/0001 atau KWT/SAH/2026/11/0001 */
    public static function nextNumber(string $type): string
    {
        $prefix = ($type === 'kwitansi' ? 'KWT' : 'INV').'/SAH/'.now()->format('Y/m').'/';
        $last = static::where('number', 'like', $prefix.'%')->orderByDesc('id')->value('number');
        $seq = $last ? ((int) substr($last, -4)) + 1 : 1;

        return $prefix.str_pad((string) $seq, 4, '0', STR_PAD_LEFT);
    }
}
