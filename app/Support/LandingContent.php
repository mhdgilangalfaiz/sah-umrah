<?php

namespace App\Support;

use App\Models\Setting;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Konten landing page (beranda) yang bisa diubah admin tanpa menyentuh kode.
 * Disimpan sebagai satu JSON di tabel settings (key: landing_content), digabung dengan nilai bawaan.
 * Gambar: path di disk "public" (landing/...), atau path bawaan di /images/landing.
 */
class LandingContent
{
    public const KEY = 'landing_content';

    /** Field gambar yang boleh diunggah: key => label */
    public const IMAGES = [
        'hero.image' => 'Gambar hero',
        'about.image' => 'Gambar Tentang Kami',
        'services.0.image' => 'Ikon layanan 1',
        'services.1.image' => 'Ikon layanan 2',
        'services.2.image' => 'Ikon layanan 3',
    ];

    public static function defaults(): array
    {
        return [
            'hero' => [
                'badge' => 'PT. Sumatera Andalan Haramain',
                'title' => 'Melayani Perjalanan Ibadah Umrah Anda',
                'highlight' => 'dengan Amanah & Profesional',
                'subtitle' => 'Solusi lengkap kebutuhan umrah Anda, mulai dari paket umrah terbaik, tiket pesawat, visa, hingga pembimbing yang berpengalaman.',
                'primary_label' => 'Lihat Paket Umrah',
                'secondary_label' => 'Pelayanan Profesional',
                'points' => ['Terpercaya', 'Berpengalaman', 'Aman & Nyaman'],
                'image' => '/images/landing/hero-kaabah.jpg',
            ],
            'about' => [
                'label' => 'Tentang Kami',
                'title' => 'PT. Sumatera Andalan Haramain',
                'lead' => 'Perusahaan penyelenggara perjalanan ibadah umrah yang berkomitmen memberikan layanan terbaik, amanah, dan profesional.',
                'body' => 'Berkantor pusat di Kota Medan, kami melayani jamaah dengan keberangkatan dari Bandara Kualanamu, hotel dekat Masjidil Haram dan Masjid Nabawi, serta pendampingan pembimbing ibadah berpengalaman. Seluruh pendaftaran dan pembayaran dilakukan melalui sistem resmi sehingga setiap transaksi tercatat dengan aman.',
                'vision' => "Menjadi penyelenggara perjalanan ibadah umrah yang terpercaya, profesional, dan unggul di Indonesia.\nKami ingin setiap jamaah dapat beribadah dengan tenang dan khusyuk, didukung pelayanan yang amanah sejak persiapan keberangkatan, selama di Tanah Suci, hingga kembali ke tanah air.",
                'mission' => [
                    'Memberikan layanan ibadah umrah yang aman & nyaman.',
                    'Menyediakan paket perjalanan yang berkualitas.',
                    'Memberikan pendampingan ibadah oleh tim berpengalaman.',
                    'Menjaga kepercayaan dan kepuasan seluruh jamaah.',
                ],
                'image' => '/images/landing/nabawi.jpg',
            ],
            'services_heading' => [
                'title' => 'Layanan Utama Kami',
                'subtitle' => 'Tiga layanan utama untuk memenuhi kebutuhan perjalanan ibadah umrah Anda.',
            ],
            'services' => [
                ['title' => 'Paket Umrah', 'text' => 'Pilihan paket umrah terbaik dengan fasilitas lengkap.', 'image' => null],
                ['title' => 'Tiket Pesawat Ibadah Umrah', 'text' => 'Pemesanan tiket pesawat untuk keberangkatan umrah dengan harga kompetitif.', 'image' => null],
                ['title' => 'Layanan Visa', 'text' => 'Pengurusan visa umrah secara cepat, aman, dan sesuai ketentuan resmi.', 'image' => null],
            ],
            'packages' => [
                'title' => 'Pilihan Paket Umrah Terbaik',
                'subtitle' => 'Berbagai pilihan paket dengan fasilitas lengkap, maskapai terpercaya, dan harga kompetitif.',
                'badge' => 'Best Seller',
                'count' => 4,
            ],
            'gallery' => [
                'title' => 'Galeri Kegiatan',
                'subtitle' => 'Dokumentasi perjalanan ibadah umrah bersama jamaah kami.',
            ],
            'testimonials' => [
                'title' => 'Testimoni Jamaah',
                'subtitle' => 'Cerita dan pengalaman jamaah yang telah berangkat bersama kami.',
            ],
            'faq' => [
                'title' => 'Pertanyaan yang Sering Diajukan',
                'subtitle' => 'Informasi seputar layanan umrah PT. Sumatera Andalan Haramain.',
                'note' => 'Masih ada pertanyaan? Klik tombol Butuh Bantuan? di pojok kanan bawah untuk berkonsultasi langsung dengan tim kami.',
            ],
        ];
    }

    /** Konten tersimpan (mentah, path gambar belum diubah ke URL). */
    public static function raw(): array
    {
        $saved = json_decode((string) Setting::get(self::KEY, '{}'), true) ?: [];
        $out = self::defaults();
        foreach ($out as $section => $value) {
            if (! isset($saved[$section]) || ! is_array($saved[$section])) {
                continue;
            }
            if ($section === 'services') {
                foreach ($value as $i => $item) {
                    $out[$section][$i] = array_merge($item, array_intersect_key($saved[$section][$i] ?? [], $item));
                }
            } else {
                $out[$section] = array_merge($value, array_intersect_key($saved[$section], $value));
            }
        }

        return $out;
    }

    /** Konten siap tampil: path gambar diubah menjadi URL. */
    public static function forDisplay(): array
    {
        $c = self::raw();
        foreach (array_keys(self::IMAGES) as $key) {
            data_set($c, $key, self::url(data_get($c, $key)));
        }

        return $c;
    }

    public static function url(?string $path): ?string
    {
        if (! $path) {
            return null;
        }

        return Str::startsWith($path, ['/', 'http://', 'https://']) ? $path : Storage::disk('public')->url($path);
    }

    public static function save(array $content): void
    {
        Setting::updateOrCreate(['key' => self::KEY], ['value' => json_encode($content, JSON_UNESCAPED_UNICODE)]);
    }

    public static function storeImage(UploadedFile $file, string $key): string
    {
        $name = now()->format('d-m-y').'-'.Str::slug(str_replace('.', '-', $key)).'-'.Str::random(6).'.'.$file->extension();

        return $file->storeAs('landing', $name, 'public');
    }

    /** Hapus file unggahan lama (gambar bawaan di /images tidak disentuh). */
    public static function deleteImage(?string $path): void
    {
        if ($path && ! Str::startsWith($path, ['/', 'http'])) {
            Storage::disk('public')->delete($path);
        }
    }
}
