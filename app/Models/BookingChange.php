<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Riwayat perubahan pesanan umrah: pengurangan jamaah, perubahan kategori/harga, pembatalan. */
class BookingChange extends Model
{
    public const TYPES = ['pengurangan' => 'Pengurangan jamaah', 'perubahan' => 'Perubahan jamaah', 'pembatalan' => 'Pembatalan pesanan', 'refund' => 'Pengembalian dana'];

    protected $fillable = ['booking_id', 'type', 'description', 'old_total', 'new_total', 'refund_amount', 'refund_id', 'changed_by'];

    protected function casts(): array
    {
        return ['old_total' => 'integer', 'new_total' => 'integer', 'refund_amount' => 'integer'];
    }

    public function booking() { return $this->belongsTo(Booking::class); }
    public function refund() { return $this->belongsTo(Refund::class); }
    public function changer() { return $this->belongsTo(User::class, 'changed_by'); }
}
