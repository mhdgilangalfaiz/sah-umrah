<?php

namespace App\Support;

/**
 * Daftar bandara yang umum dipakai rute umrah + selisih zona waktu (jam dari UTC).
 * Jam berangkat/tiba di jadwal selalu jam LOKAL bandara, jadi selisih zona waktu
 * dipakai untuk menghitung durasi perjalanan yang benar (mis. KNO UTC+7 → JED UTC+3).
 * Tambahkan bandara baru di sini bila diperlukan.
 */
class Airports
{
    public const LIST = [
        // Indonesia
        'KNO' => ['Medan', 7], 'CGK' => ['Jakarta', 7], 'SUB' => ['Surabaya', 7], 'BTH' => ['Batam', 7],
        'PDG' => ['Padang', 7], 'PKU' => ['Pekanbaru', 7], 'BTJ' => ['Banda Aceh', 7], 'PLM' => ['Palembang', 7],
        'SOC' => ['Solo', 7], 'JOG' => ['Yogyakarta', 7], 'YIA' => ['Yogyakarta', 7], 'KJT' => ['Majalengka', 7],
        'UPG' => ['Makassar', 8], 'BPN' => ['Balikpapan', 8], 'BDJ' => ['Banjarmasin', 8], 'DPS' => ['Denpasar', 8], 'LOP' => ['Lombok', 8],
        // Transit
        'KUL' => ['Kuala Lumpur', 8], 'SIN' => ['Singapura', 8], 'BKK' => ['Bangkok', 7], 'DXB' => ['Dubai', 4],
        'AUH' => ['Abu Dhabi', 4], 'DOH' => ['Doha', 3], 'MCT' => ['Muscat', 4], 'IST' => ['Istanbul', 3], 'CAI' => ['Kairo', 2],
        'BAH' => ['Bahrain', 3], 'KWI' => ['Kuwait', 3], 'CMB' => ['Kolombo', 5.5],
        // Arab Saudi
        'JED' => ['Jeddah', 3], 'MED' => ['Madinah', 3], 'RUH' => ['Riyadh', 3], 'TIF' => ['Taif', 3],
    ];

    public static function city(?string $code): string
    {
        $code = strtoupper((string) $code);

        return self::LIST[$code][0] ?? $code;
    }

    public static function offset(?string $code): ?float
    {
        return self::LIST[strtoupper((string) $code)][1] ?? null;
    }

    /** Untuk pilihan di form admin: [['code' => 'KNO', 'city' => 'Medan'], ...] */
    public static function options(): array
    {
        return collect(self::LIST)->map(fn ($v, $k) => ['code' => $k, 'city' => $v[0]])->values()->all();
    }
}
