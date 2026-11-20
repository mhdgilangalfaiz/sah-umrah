<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Harga layanan visa ditetapkan dalam USD (price_usd). Pembayaran tetap dalam Rupiah,
 * dihitung dengan kurs yang berlaku saat pembelian (pengaturan `usd_rate`).
 * Kolom `price` (Rp) otomatis mengikuti kurs saat ini sebagai estimasi.
 */
class VisaService extends Model
{
    protected $fillable = ['name', 'description', 'requirements', 'processing_days', 'price', 'price_usd', 'is_active'];

    protected $appends = ['usd_rate'];

    protected function casts(): array
    {
        return ['requirements' => 'array', 'is_active' => 'boolean', 'price' => 'integer', 'price_usd' => 'float'];
    }

    protected static function booted(): void
    {
        static::saving(function (VisaService $s) {
            if ($s->price_usd) $s->price = $s->priceIdr();
        });
    }

    /** Kurs USD → Rupiah yang berlaku saat ini (diatur admin di Pengaturan). */
    public static function currentRate(): float
    {
        return (float) Setting::get('usd_rate', 16500);
    }

    /** Harga per orang dalam Rupiah dengan kurs saat ini (dibulatkan ke ratusan rupiah). */
    public function priceIdr(?float $rate = null): int
    {
        if (! $this->price_usd) return (int) $this->price;

        return (int) (round($this->price_usd * ($rate ?? self::currentRate()) / 100) * 100);
    }

    public function getUsdRateAttribute(): ?float
    {
        return $this->price_usd ? self::currentRate() : null;
    }

    public function getPriceAttribute($value): int
    {
        // Selalu tampilkan estimasi Rupiah dengan kurs terbaru
        return $this->price_usd ? $this->priceIdr() : (int) $value;
    }

    public function applications() { return $this->hasMany(VisaApplication::class); }
}
