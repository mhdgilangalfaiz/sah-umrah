<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Maskapai + logo. Dicocokkan ke paket lewat nama (packages.airline). */
class Airline extends Model
{
    protected $fillable = ['name', 'logo'];

    protected $appends = ['logo_url'];

    /** Peta nama → URL logo, dimuat sekali per request. */
    private static ?array $logos = null;

    public function packages() { return $this->hasMany(Package::class, 'airline', 'name'); }

    public function getLogoUrlAttribute(): ?string
    {
        return Package::mediaUrl($this->logo);
    }

    public static function logoFor(?string $name): ?string
    {
        if (! $name) {
            return null;
        }
        self::$logos ??= static::whereNotNull('logo')->get(['name', 'logo'])
            ->mapWithKeys(fn ($a) => [mb_strtolower($a->name) => $a->logo_url])->all();

        return self::$logos[mb_strtolower(trim($name))] ?? null;
    }

    public static function names(): array
    {
        return static::orderBy('name')->pluck('name')->all();
    }

    protected static function booted(): void
    {
        static::saved(fn () => self::$logos = null);
        static::deleted(fn () => self::$logos = null);

        // Nama diganti → paket yang memakai nama lama ikut diperbarui agar logo tetap tersambung
        static::updated(function (Airline $a) {
            if ($a->wasChanged('name')) {
                Package::withTrashed()->where('airline', $a->getOriginal('name'))->update(['airline' => $a->name]);
            }
        });
    }
}
