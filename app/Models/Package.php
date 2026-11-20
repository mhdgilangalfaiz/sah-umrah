<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Package extends Model
{
    use SoftDeletes;

    public const TYPES = ['hemat' => 'Hemat', 'reguler' => 'Reguler', 'plus' => 'Plus (Turki/Dubai)', 'vip' => 'VIP'];
    public const ROOM_TYPES = ['quad' => 'Quad (4 orang)', 'triple' => 'Triple (3 orang)', 'double' => 'Double (2 orang)'];

    protected $fillable = [
        'name', 'slug', 'type', 'summary', 'description', 'duration_days', 'airline', 'departure_city',
        'hotel_makkah', 'hotel_makkah_star', 'hotel_makkah_distance', 'hotel_madinah', 'hotel_madinah_star',
        'hotel_madinah_distance', 'price_quad', 'price_triple', 'price_double', 'min_deposit', 'cover_image',
        'gallery', 'itinerary', 'facilities', 'excludes', 'document_requirements', 'is_featured', 'is_active',
    ];

    protected $appends = ['cover_url', 'gallery_urls'];

    protected function casts(): array
    {
        return [
            'gallery' => 'array', 'itinerary' => 'array', 'facilities' => 'array', 'excludes' => 'array',
            'document_requirements' => 'array', 'is_featured' => 'boolean', 'is_active' => 'boolean',
            'price_quad' => 'integer', 'price_triple' => 'integer', 'price_double' => 'integer', 'min_deposit' => 'integer',
            'duration_days' => 'integer',
        ];
    }

    public static function mediaUrl(?string $path): ?string
    {
        if (! $path) return null;

        return str_starts_with($path, 'http') ? $path : asset('storage/'.$path);
    }

    public function getCoverUrlAttribute(): ?string
    {
        return self::mediaUrl($this->cover_image);
    }

    public function getGalleryUrlsAttribute(): array
    {
        return array_values(array_map(fn ($p) => self::mediaUrl($p), $this->gallery ?? []));
    }

    public function departures() { return $this->hasMany(PackageDeparture::class)->orderBy('departure_date'); }

    public function upcomingDepartures()
    {
        return $this->hasMany(PackageDeparture::class)
            ->where('departure_date', '>', now()->toDateString())
            ->where('status', 'open')->orderBy('departure_date');
    }

    public function priceFor(string $roomType): int
    {
        return (int) match ($roomType) {
            'double' => $this->price_double,
            'triple' => $this->price_triple,
            default => $this->price_quad,
        };
    }

    public function scopeActive($q) { return $q->where('is_active', true); }
}
