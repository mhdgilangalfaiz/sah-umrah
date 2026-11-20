<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Flight extends Model
{
    public const CLASSES = ['ekonomi' => 'Ekonomi', 'bisnis' => 'Bisnis', 'first' => 'First Class'];

    protected $fillable = [
        'airline', 'airline_code', 'flight_number', 'origin_code', 'origin_city', 'destination_code', 'destination_city',
        'depart_at', 'arrive_at', 'transit_count', 'transit_info', 'cabin_class', 'price', 'baggage_kg', 'cabin_baggage_kg',
        'seats_available', 'refund_policy', 'reschedule_policy', 'is_active',
    ];

    protected $appends = ['duration_label'];

    protected function casts(): array
    {
        return [
            'depart_at' => 'datetime:Y-m-d H:i', 'arrive_at' => 'datetime:Y-m-d H:i',
            'is_active' => 'boolean', 'price' => 'integer', 'seats_available' => 'integer', 'transit_count' => 'integer',
        ];
    }

    public function getDurationLabelAttribute(): string
    {
        if (! $this->depart_at || ! $this->arrive_at) return '-';
        $m = (int) abs($this->depart_at->diffInMinutes($this->arrive_at));

        return intdiv($m, 60).'j '.($m % 60).'m';
    }

    public function orders() { return $this->hasMany(FlightOrder::class); }
}
