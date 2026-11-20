<?php

namespace App\Services\Flights;

use App\Models\Flight;
use Carbon\Carbon;

/**
 * Pencarian seat pesawat.
 * TIDAK memakai API maskapai: seat diperoleh dari mitra dan diperbarui manual oleh admin setiap hari.
 * Setiap pembelian di web langsung mengurangi seats_available (lihat CheckoutController::storeFlight).
 * Arsitektur tetap siap diganti provider lain dengan method yang sama bila suatu saat diperlukan.
 */
class FlightSearch
{
    private function base()
    {
        return Flight::where('is_active', true)->where('depart_at', '>', now()->addHours(6));
    }

    public function search(array $c)
    {
        return $this->base()
            ->when($c['asal'] ?? null, fn ($q, $v) => $q->where('origin_code', strtoupper($v)))
            ->when($c['tujuan'] ?? null, fn ($q, $v) => $q->where('destination_code', strtoupper($v)))
            ->when($c['tanggal'] ?? null, fn ($q, $v) => $q->whereDate('depart_at', '>=', $v)->whereDate('depart_at', '<=', Carbon::parse($v)->addDays(3)))
            ->when($c['kelas'] ?? null, fn ($q, $v) => $q->where('cabin_class', $v))
            ->when($c['jenis'] ?? null, fn ($q, $v) => $q->where('trip_type', $v))
            ->when($c['transit'] ?? null, fn ($q, $v) => $v === 'langsung' ? $q->where('transit_count', 0) : $q->where('transit_count', '>', 0))
            ->orderBy('depart_at')->orderBy('price')
            ->limit(60)->get();
    }

    public function upcoming()
    {
        return $this->base()->orderBy('depart_at')->limit(20)->get();
    }

    public function airports(): array
    {
        $o = Flight::where('is_active', true)->select('origin_code as code', 'origin_city as city')->distinct()->get();
        $d = Flight::where('is_active', true)->select('destination_code as code', 'destination_city as city')->distinct()->get();

        return $o->concat($d)->unique('code')->sortBy('city')->values()->all();
    }
}
