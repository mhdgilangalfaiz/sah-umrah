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
        'company_address' => 'Jl. Eka Rasmi Springville Residence No.32, Gedung Johor, Kec. Medan Johor, Kota Medan, Sumatera Utara 20147',
        'company_phone' => '(061) 1234 5678',
        'company_email' => 'info@sumateraandalanharamain.co.id',
        // Nomor WhatsApp format internasional tanpa "+" (dipakai tautan wa.me di landing page)
        'company_whatsapp' => '6281234567890',
        'social_instagram' => '',
        'social_facebook' => '',
        'social_youtube' => '',
        'social_tiktok' => '',
        'license_ppiu' => 'No. PPIU: 91201032614170001',
        'office_hours' => 'Senin – Sabtu, 08.30 – 17.00 WIB',
        'map_embed' => 'https://www.google.com/maps?q=Medan&output=embed',
        'usd_rate' => '16500', // kurs USD → Rupiah untuk layanan berharga USD (mis. visa)
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
        // Default digabung di luar cache: key baru langsung tersedia walau cache lama masih ada
        return array_merge(self::DEFAULTS, Cache::rememberForever('settings.all', function () {
            try {
                return static::pluck('value', 'key')->all();
            } catch (\Throwable) {
                return [];
            }
        }));
    }

    protected static function booted(): void
    {
        static::saved(fn () => Cache::forget('settings.all'));
    }
}
