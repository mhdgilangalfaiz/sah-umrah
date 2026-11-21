<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Testimonial extends Model
{
    protected $fillable = ['name', 'city', 'content', 'rating', 'departure_month', 'package_name', 'photo', 'is_active'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean', 'rating' => 'integer', 'departure_month' => 'date:Y-m-d'];
    }

    /** Form mengirim bulan "2026-03"; disimpan sebagai tanggal awal bulan. */
    public function setDepartureMonthAttribute($value): void
    {
        $this->attributes['departure_month'] = $value && preg_match('/^\d{4}-\d{2}$/', (string) $value) ? $value.'-01' : ($value ?: null);
    }

    protected $appends = ['photo_url'];
    public function getPhotoUrlAttribute() { return Package::mediaUrl($this->photo); }
}
