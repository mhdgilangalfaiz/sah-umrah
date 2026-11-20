<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class Setting extends Model
{
    protected $primaryKey = 'key';
    public $incrementing = false;
    protected $keyType = 'string';
    protected $fillable = ['key', 'value'];

    public const DEFAULTS = [
        'company_name' => 'PT. Sumatera Andalan Haramain',
        'company_tagline' => 'Biro Perjalanan Umrah Terpercaya dari Kota Medan',
        'company_address' => 'Jl. Sisingamangaraja No. 88, Kota Medan, Sumatera Utara 20217',
        'company_phone' => '(061) 1234 5678',
        'company_email' => 'info@sumateraandalanharamain.co.id',
        'license_ppiu' => 'PPIU No. U.123 Tahun 2024',
        'office_hours' => 'Senin – Sabtu, 08.30 – 17.00 WIB',
        'map_embed' => 'https://www.google.com/maps?q=Medan&output=embed',
        'hero_title' => 'Wujudkan Perjalanan Suci ke Tanah Haram dengan Tenang',
        'hero_subtitle' => 'Paket umrah resmi berizin Kemenag, hotel dekat Masjidil Haram, dan skema cicilan yang ringan — semua transaksi tercatat aman di sistem.',
    ];

    public static function get(string $key, $default = null)
    {
        $all = static::allCached();

        return $all[$key] ?? $default ?? (self::DEFAULTS[$key] ?? null);
    }

    public static function allCached(): array
    {
        return Cache::rememberForever('settings.all', function () {
            try {
                return array_merge(self::DEFAULTS, static::pluck('value', 'key')->all());
            } catch (\Throwable) {
                return self::DEFAULTS;
            }
        });
    }

    protected static function booted(): void
    {
        static::saved(fn () => Cache::forget('settings.all'));
    }
}
