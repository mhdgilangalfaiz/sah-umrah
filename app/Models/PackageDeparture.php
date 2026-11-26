<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PackageDeparture extends Model
{
    protected $fillable = ['package_id', 'departure_date', 'return_date', 'quota', 'booked', 'held', 'status'];

    protected $appends = ['remaining'];

    protected $attributes = ['booked' => 0, 'held' => 0, 'status' => 'open'];

    protected function casts(): array
    {
        return [
            'departure_date' => 'date:Y-m-d', 'return_date' => 'date:Y-m-d',
            'quota' => 'integer', 'booked' => 'integer', 'held' => 'integer',
        ];
    }

    /** Sisa kuota real-time = kuota − kursi terkonfirmasi − kursi yang sedang ditahan */
    public function getRemainingAttribute(): int
    {
        return max(0, (int) $this->quota - (int) $this->booked - (int) $this->held);
    }

    /** Batas pelunasan: H-40 (dapat diatur di config/payment.php) */
    public function paymentDeadline()
    {
        return $this->departure_date->copy()->subDays((int) config('payment.settlement_days_before_departure', 40));
    }

    public function package() { return $this->belongsTo(Package::class)->withTrashed(); }
    public function bookings() { return $this->hasMany(Booking::class); }
}
