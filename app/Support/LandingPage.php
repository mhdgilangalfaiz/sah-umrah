<?php

namespace App\Support;

use App\Models\Gallery;
use App\Models\Package;
use App\Models\Testimonial;
use Illuminate\Support\Str;

/**
 * Menyusun props halaman landing (route "/").
 * Semua data yang tampil di landing berasal dari sini, React hanya merender.
 */
class LandingPage
{
    /** Foto bawaan bila admin belum mengunggah galeri. */
    private const DEFAULT_GALLERY = [
        'Jamaah berdoa di Masjidil Haram', 'Kubah Hijau Masjid Nabawi', 'Masjid Quba, Madinah', 'Payung raksasa Masjid Nabawi',
        'Interior Masjid Nabawi', 'Jabal Rahmah, Arafah', 'Kota Makkah di malam hari',
    ];

    /** Tujuan kartu layanan, urut sama dengan content.services. */
    private const SERVICE_ROUTES = ['packages.index', 'flights.index', 'visa.index'];

    public static function props(): array
    {
        $content = LandingContent::forDisplay();

        return [
            'content' => $content,
            'services' => self::services($content['services']),
            'packages' => self::packages($content['packages']['count']),
            'packageOptions' => Package::active()->orderBy('name')->pluck('name'),
            'galleries' => self::galleries(),
            'testimonials' => self::testimonials(),
            'rating' => self::rating(),
        ];
    }

    private static function services(array $services): array
    {
        return collect($services)->map(fn ($s, $i) => [
            'title' => $s['title'],
            'text' => $s['text'],
            'image' => $s['image'],
            'icon' => ['kaabah', 'plane', 'passport'][$i] ?? 'kaabah',
            'url' => route(self::SERVICE_ROUTES[$i] ?? 'packages.index'),
        ])->all();
    }

    private static function packages(int $count): array
    {
        return Package::active()->with('upcomingDepartures')
            ->orderByDesc('is_featured')->orderBy('price_quad')->take($count)->get()
            ->map(function (Package $p) {
                $facilities = array_values(array_filter($p->facilities ?? []));
                $meal = collect($facilities)->first(fn ($f) => Str::contains(Str::lower($f), 'makan'));

                return [
                    'id' => $p->id,
                    'name' => $p->name,
                    'url' => route('packages.show', $p->slug),
                    'price' => $p->price_quad,
                    'is_best_seller' => $p->is_featured,
                    'airline' => $p->airline,
                    'airline_logo' => self::airlineLogo($p->airline),
                    'duration_days' => $p->duration_days,
                    'departure_date' => $p->upcomingDepartures->first()?->departure_date?->toDateString(),
                    'hotel' => $p->hotel_makkah,
                    'hotel_star' => $p->hotel_makkah_star,
                    'meal' => $meal,
                    'facilities' => array_slice(array_values(array_filter($facilities, fn ($f) => $f !== $meal)), 0, 4),
                ];
            })->all();
    }

    /** Logo maskapai di public/images/airlines/{slug}.webp|png; null → kartu menampilkan nama maskapai. */
    private static function airlineLogo(?string $airline): ?string
    {
        if (! $airline) {
            return null;
        }
        $slug = Str::slug($airline);
        foreach (['webp', 'png', 'svg'] as $ext) {
            if (is_file(public_path("images/airlines/{$slug}.{$ext}"))) {
                return "/images/airlines/{$slug}.{$ext}";
            }
        }

        return null;
    }

    private static function galleries(): array
    {
        $photos = Gallery::where('type', 'foto')->latest('id')->take(24)->get(['id', 'title', 'image'])
            ->map(fn (Gallery $g) => ['id' => $g->id, 'title' => $g->title, 'image_url' => $g->image_url])->all();

        return $photos ?: collect(self::DEFAULT_GALLERY)
            ->map(fn ($title, $i) => ['id' => 'd'.($i + 1), 'title' => $title, 'image_url' => '/images/landing/galeri-'.($i + 1).'.webp'])
            ->all();
    }

    private static function testimonials(): array
    {
        return Testimonial::where('is_active', true)->latest()->take(12)->get()
            ->map(fn (Testimonial $t) => [
                'id' => $t->id,
                'name' => $t->name,
                'city' => $t->city,
                'content' => $t->content,
                'rating' => $t->rating,
                'departure_month' => $t->departure_month?->format('Y-m'),
                'package_name' => $t->package_name,
                'photo_url' => $t->photo_url,
            ])->all();
    }

    /** Ringkasan rating dari seluruh testimoni yang tampil. */
    private static function rating(): array
    {
        $q = Testimonial::where('is_active', true);
        $count = (clone $q)->count();

        return ['average' => $count ? round((float) $q->avg('rating'), 1) : 0, 'count' => $count];
    }
}
