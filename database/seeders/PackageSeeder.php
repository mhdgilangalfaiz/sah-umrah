<?php

namespace Database\Seeders;

use App\Models\Package;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;

/**
 * Paket umrah sesuai brosur resmi (update brosur 21 Sep & 07 Okt 2025).
 * Poster disalin ke storage publik dan dipakai sebagai sampul paket.
 * Aman dijalankan berulang: data dicocokkan berdasarkan slug.
 */
class PackageSeeder extends Seeder
{
    private const FREE = ['Free ziarah Taif', 'Ziarah Masjid Kiblatain', 'Ziarah Jabal Magnet', 'Kunjungan Percetakan Al-Qur\'an', 'Ziarah Badar', 'Free Albaik & Nasi Mandhi'];

    private const DOCS = ['Paspor berlaku minimal 8 bulan', 'Pas foto 4x6 latar putih (80% wajah)', 'Fotokopi KTP & Kartu Keluarga', 'Buku nikah (suami-istri)', 'Akta lahir (anak)', 'Sertifikat vaksin meningitis'];

    private const JUL_SEP_A = ['2026-07-01', '2026-07-08', '2026-07-15', '2026-07-22', '2026-07-29', '2026-08-05', '2026-08-12', '2026-08-19', '2026-08-26', '2026-09-02', '2026-09-09', '2026-09-16', '2026-09-23', '2026-09-30'];

    public function run(): void
    {
        $packages = [
            [
                'poster' => 'umrah-maghfiroh.jpg', 'name' => 'Umrah Maghfiroh Awal Musim 13 Hari', 'type' => 'hemat', 'days' => 13,
                'airline' => 'Batik Air Malaysia',
                'makkah' => ['Hilton Tower (MB)', 5, 'Pelataran Masjidil Haram'], 'madinah' => ['Al Marsa / Royal Madinah', 4, null],
                'price' => [27500000, 27500000, 27500000], 'deposit' => 3000000, 'quota' => 45,
                'summary' => 'Langsung umrah 13 hari dengan Batik Air Malaysia dari Kualanamu Medan, hotel Makkah di pelataran Masjidil Haram. DP Rp1.500.000.',
                'notes' => ['Harga Rp27,5 juta per jamaah, sekamar ber-5 s/d 6 orang.', 'Kuota promo hanya 45 pax per tanggal keberangkatan.', 'Harga hemat dengan hotel di pelataran Masjidil Haram.', 'Kurs mengikuti kurs per hari pengajuan.'],
                'excludes' => ['Koper & perlengkapan ibadah'],
                'dates' => self::JUL_SEP_A, 'brochure' => '07 Oktober 2025',
            ],
            [
                'poster' => 'umrah-paten.jpg', 'name' => 'Umrah Paten Awal Musim 12 Hari', 'type' => 'reguler', 'days' => 12,
                'airline' => 'Batik Air Malaysia (OD)',
                'makkah' => ['Hilton Tower / Makkah Tower (MB)', 5, 'Pelataran Masjidil Haram'], 'madinah' => ['Amjad Assalam / Emaar Taiba', 4, '150 m'],
                'price' => [28500000, 30500000, 33000000], 'deposit' => 3000000, 'quota' => 45,
                'summary' => 'Langsung umrah 12 hari dengan Batik Air Malaysia start KNO Medan, hotel Makkah di pelataran masjid dan hotel Madinah 150 meter.',
                'notes' => ['Booking kuota Rp3.000.000 per jamaah.', 'Kurs mengikuti kurs per hari pengajuan.'],
                'excludes' => ['Perlengkapan ibadah (Rp1.000.000)'],
                'dates' => ['2026-08-02', '2026-08-09', '2026-08-16', '2026-08-23', '2026-08-30', '2026-09-06', '2026-09-13', '2026-09-20', '2026-09-27'], 'brochure' => '21 September 2025',
            ],
            [
                'poster' => 'umrah-cerdas.jpg', 'name' => 'Umrah Cerdas Awal Musim 13 Hari', 'type' => 'reguler', 'days' => 13,
                'airline' => 'Batik Air Malaysia',
                'makkah' => ['Safwa Royal (MB)', 5, 'Pelataran Masjidil Haram'], 'madinah' => ['Al Marsa / Royal Madinah', 4, null],
                'price' => [29500000, 32000000, 34500000], 'deposit' => 3000000, 'quota' => 45,
                'summary' => 'Langsung umrah 13 hari dengan Batik Air Malaysia start KNO Medan, hotel Safwa Royal di pelataran Masjidil Haram.',
                'notes' => ['Upgrade Business Class + Rp7.500.000.', 'Booking kuota Rp3.000.000 per jamaah.', 'Kurs mengikuti kurs per hari pengajuan.'],
                'excludes' => ['Koper & perlengkapan ibadah (Rp1.000.000)'],
                'dates' => self::JUL_SEP_A, 'brochure' => '21 September 2025',
            ],
            [
                'poster' => 'umrah-mantap.jpg', 'name' => 'Umrah Mantap Awal Musim 1448 H 12 Hari', 'type' => 'hemat', 'days' => 12,
                'airline' => 'Batik Air Malaysia',
                'makkah' => ['Azka Safa / Rayana Mashaer', 4, '200 m (4 menit ke pelataran)'], 'madinah' => ['Al Marsa / Royal Madinah', 4, null],
                'price' => [27000000, 28500000, 30500000], 'deposit' => 3000000, 'quota' => 45,
                'summary' => 'Langsung umrah 12 hari awal musim 1448 H dengan Batik Air Malaysia start KNO Medan, hotel Makkah 4 menit ke pelataran.',
                'notes' => ['Upgrade Business Class + Rp7.500.000.', 'Booking kuota Rp3.000.000 per jamaah.', 'Kurs mengikuti kurs per hari pengajuan.'],
                'excludes' => [],
                'dates' => ['2026-07-05', '2026-07-12', '2026-07-19', '2026-07-26', '2026-08-02', '2026-08-09', '2026-08-16', '2026-08-23', '2026-08-30', '2026-09-06', '2026-09-13', '2026-09-20', '2026-09-27'], 'brochure' => '21 September 2025',
            ],
        ];

        foreach ($packages as $d) {
            [$mk, $mkStar, $mkDist] = $d['makkah'];
            [$md, $mdStar, $mdDist] = $d['madinah'];

            $cover = 'packages/poster-'.$d['poster'];
            Storage::disk('public')->put($cover, file_get_contents(__DIR__.'/assets/posters/'.$d['poster']));

            $package = Package::withTrashed()->updateOrCreate(['slug' => str($d['name'])->slug()->toString()], [
                'name' => $d['name'], 'type' => $d['type'], 'duration_days' => $d['days'],
                'airline' => $d['airline'], 'departure_city' => 'Medan (KNO)',
                'hotel_makkah' => $mk, 'hotel_makkah_star' => $mkStar, 'hotel_makkah_distance' => $mkDist,
                'hotel_madinah' => $md, 'hotel_madinah_star' => $mdStar, 'hotel_madinah_distance' => $mdDist,
                'price_quad' => $d['price'][0], 'price_triple' => $d['price'][1], 'price_double' => $d['price'][2],
                'min_deposit' => $d['deposit'], 'cover_image' => $cover,
                'summary' => $d['summary'],
                'description' => $d['summary']."\n\n".collect($d['notes'])->map(fn ($n) => "• {$n}")->join("\n")
                    ."\n\nUpdate brosur {$d['brochure']}. Ketentuan harga, hotel, maskapai & tanggal keberangkatan mengikuti update brosur terbaru.",
                'facilities' => [
                    "Tiket pesawat {$d['airline']} PP, start Kualanamu Medan (KNO)",
                    "Hotel Makkah {$mk} (5 malam)".($mkDist ? " — {$mkDist}" : ''),
                    "Hotel Madinah {$md} (5 malam)".($mdDist ? " — {$mdDist}" : ''),
                    'Langsung umrah setibanya di Tanah Suci',
                    ...self::FREE,
                ],
                'excludes' => $d['excludes'],
                'itinerary' => [],
                'document_requirements' => self::DOCS,
                'is_featured' => true, 'is_active' => true, 'deleted_at' => null,
            ]);

            foreach ($d['dates'] as $date) {
                $dep = Carbon::parse($date);
                $package->departures()->updateOrCreate(
                    ['departure_date' => $dep->toDateString()],
                    ['return_date' => $dep->copy()->addDays($d['days'] - 1)->toDateString(), 'quota' => $d['quota']],
                );
            }
        }
    }
}
