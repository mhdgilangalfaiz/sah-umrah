<?php

namespace App\Services\Flights;

use App\Models\Flight;

/**
 * Pencarian penerbangan.
 * Saat ini TIDAK ada kerja sama API — data dikelola admin di tabel `flights`.
 * Arsitektur siap diganti: buat provider baru (Amadeus, dsb.) dengan method yang sama
 * lalu bind di AppServiceProvider.
 */
class FlightSearch
{
    public function search(array $c)
    {
        $pax = (int) ($c['penumpang'] ?? 1);

        return Flight::where('is_active', true)
            ->where('depart_at', '>', now()->addHours(6))
            ->where('seats_available', '>=', $pax)
            ->when($c['asal'] ?? null, fn ($q, $v) => $q->where('origin_code', strtoupper($v)))
            ->when($c['tujuan'] ?? null, fn ($q, $v) => $q->where('destination_code', strtoupper($v)))
            ->when($c['tanggal'] ?? null, fn ($q, $v) => $q->whereDate('depart_at', '>=', $v)->whereDate('depart_at', '<=', \Carbon\Carbon::parse($v)->addDays(3)))
            ->when($c['kelas'] ?? null, fn ($q, $v) => $q->where('cabin_class', $v))
            ->orderBy('depart_at')->orderBy('price')
            ->limit(50)->get();
    }

    public function upcoming()
    {
        return Flight::where('is_active', true)->where('depart_at', '>', now()->addHours(6))
            ->where('seats_available', '>', 0)->orderBy('depart_at')->limit(12)->get();
    }

    public function airports(): array
    {
        $o = Flight::where('is_active', true)->select('origin_code as code', 'origin_city as city')->distinct()->get();
        $d = Flight::where('is_active', true)->select('destination_code as code', 'destination_city as city')->distinct()->get();

        return $o->concat($d)->unique('code')->sortBy('city')->values()->all();
    }
}
