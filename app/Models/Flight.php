<?php

namespace App\Models;

use App\Support\Airports;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * Seat pesawat dari mitra (bukan API maskapai). Satu baris = satu penawaran seat:
 * sekali jalan atau pulang-pergi, berisi satu/lebih segmen penerbangan (transit).
 * Kolom ringkasan (origin/destination/depart_at/arrive_at/transit_count/flight_number)
 * dihitung otomatis dari segmen saat disimpan, sehingga pencarian & pesanan lama tetap berjalan.
 */
class Flight extends Model
{
    public const CLASSES = ['ekonomi' => 'Ekonomi', 'bisnis' => 'Bisnis'];
    public const TRIP_TYPES = ['oneway' => 'Sekali Jalan', 'pp' => 'Pulang-Pergi (PP)'];

    protected $fillable = [
        'airline', 'airline_code', 'flight_number', 'origin_code', 'origin_city', 'destination_code', 'destination_city',
        'depart_at', 'arrive_at', 'transit_count', 'transit_info', 'cabin_class', 'trip_type', 'segments', 'return_segments',
        'return_depart_at', 'return_arrive_at', 'price', 'baggage_kg', 'cabin_baggage_kg',
        'seats_available', 'seats_total', 'seats_updated_at', 'refund_policy', 'reschedule_policy', 'is_active',
    ];

    protected $appends = ['duration_label', 'route_label', 'itinerary'];

    protected function casts(): array
    {
        return [
            'depart_at' => 'datetime:Y-m-d H:i', 'arrive_at' => 'datetime:Y-m-d H:i',
            'return_depart_at' => 'datetime:Y-m-d H:i', 'return_arrive_at' => 'datetime:Y-m-d H:i',
            'seats_updated_at' => 'datetime:Y-m-d H:i',
            'segments' => 'array', 'return_segments' => 'array',
            'is_active' => 'boolean', 'price' => 'integer', 'seats_available' => 'integer', 'seats_total' => 'integer', 'transit_count' => 'integer',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (Flight $f) {
            $legs = self::normalizeLegs($f->segments ?? []);
            if ($legs) {
                $first = $legs[0];
                $last = end($legs);
                $f->segments = $legs;
                $f->origin_code = $first['origin_code'];
                $f->origin_city = Airports::city($first['origin_code']);
                $f->destination_code = $last['destination_code'];
                $f->destination_city = Airports::city($last['destination_code']);
                $f->depart_at = $first['depart_at'];
                $f->arrive_at = $last['arrive_at'];
                $f->transit_count = count($legs) - 1;
                $f->flight_number = collect($legs)->pluck('flight_number')->unique()->implode(' / ');
                $f->transit_info = self::transitText($legs);
            }

            $back = $f->trip_type === 'pp' ? self::normalizeLegs($f->return_segments ?? []) : [];
            $f->return_segments = $back ?: null;
            $f->return_depart_at = $back ? $back[0]['depart_at'] : null;
            $f->return_arrive_at = $back ? end($back)['arrive_at'] : null;
        });
    }

    /** Rapikan segmen: kode bandara huruf besar, kota otomatis, urut sesuai jam berangkat. */
    public static function normalizeLegs(array $legs): array
    {
        return collect($legs)
            ->filter(fn ($l) => ! empty($l['origin_code']) && ! empty($l['destination_code']) && ! empty($l['depart_at']) && ! empty($l['arrive_at']))
            ->map(fn ($l) => [
                'flight_number' => strtoupper(trim($l['flight_number'] ?? '')),
                'origin_code' => strtoupper($l['origin_code']),
                'origin_city' => Airports::city($l['origin_code']),
                'destination_code' => strtoupper($l['destination_code']),
                'destination_city' => Airports::city($l['destination_code']),
                'depart_at' => Carbon::parse($l['depart_at'])->format('Y-m-d H:i'),
                'arrive_at' => Carbon::parse($l['arrive_at'])->format('Y-m-d H:i'),
            ])
            ->sortBy('depart_at')->values()->all();
    }

    /** Durasi nyata dalam menit memperhitungkan zona waktu bandara (jam di jadwal = jam lokal). */
    public static function minutesBetween(string $from, ?string $fromCode, string $to, ?string $toCode): int
    {
        $a = Carbon::parse($from);
        $b = Carbon::parse($to);
        $oa = Airports::offset($fromCode);
        $ob = Airports::offset($toCode);
        if ($oa !== null && $ob !== null) {
            $a = $a->copy()->subMinutes((int) round($oa * 60));
            $b = $b->copy()->subMinutes((int) round($ob * 60));
        }

        return max(0, (int) $a->diffInMinutes($b, false));
    }

    public static function hm(int $m): string
    {
        return intdiv($m, 60).'j '.str_pad((string) ($m % 60), 2, '0', STR_PAD_LEFT).'m';
    }

    private static function transitText(array $legs): ?string
    {
        if (count($legs) < 2) return null;

        return collect(range(1, count($legs) - 1))->map(function ($i) use ($legs) {
            $code = $legs[$i - 1]['destination_code'];
            $wait = self::minutesBetween($legs[$i - 1]['arrive_at'], $code, $legs[$i]['depart_at'], $legs[$i]['origin_code']);

            return 'Transit '.Airports::city($code)." ({$code}) ".self::hm($wait);
        })->implode(', ');
    }

    /** Ringkasan satu arah perjalanan untuk ditampilkan: segmen, waktu transit, total durasi. */
    private function direction(array $legs): ?array
    {
        if (! $legs) return null;
        $first = $legs[0];
        $last = end($legs);
        $layovers = [];
        for ($i = 1; $i < count($legs); $i++) {
            $layovers[] = [
                'code' => $legs[$i - 1]['destination_code'],
                'city' => Airports::city($legs[$i - 1]['destination_code']),
                'duration' => self::hm(self::minutesBetween($legs[$i - 1]['arrive_at'], $legs[$i - 1]['destination_code'], $legs[$i]['depart_at'], $legs[$i]['origin_code'])),
            ];
        }

        return [
            'legs' => $legs,
            'layovers' => $layovers,
            'stops' => count($legs) - 1,
            'path' => collect($legs)->pluck('origin_code')->push($last['destination_code'])->values()->all(),
            'depart_at' => $first['depart_at'],
            'arrive_at' => $last['arrive_at'],
            'duration' => self::hm(self::minutesBetween($first['depart_at'], $first['origin_code'], $last['arrive_at'], $last['destination_code'])),
            'next_day' => Carbon::parse($last['arrive_at'])->startOfDay()->diffInDays(Carbon::parse($first['depart_at'])->startOfDay(), true),
        ];
    }

    /** Segmen pergi; data lama tanpa segmen dianggap satu penerbangan langsung. */
    private function outboundLegs(): array
    {
        if ($this->segments) return $this->segments;
        if (! $this->depart_at) return [];

        return [[
            'flight_number' => $this->flight_number, 'origin_code' => $this->origin_code, 'origin_city' => $this->origin_city,
            'destination_code' => $this->destination_code, 'destination_city' => $this->destination_city,
            'depart_at' => $this->depart_at->format('Y-m-d H:i'), 'arrive_at' => $this->arrive_at?->format('Y-m-d H:i'),
        ]];
    }

    public function getItineraryAttribute(): array
    {
        return [
            'outbound' => $this->direction($this->outboundLegs()),
            'inbound' => $this->trip_type === 'pp' ? $this->direction($this->return_segments ?? []) : null,
        ];
    }

    /** Contoh: "KNO → KUL → JED (PP)" */
    public function getRouteLabelAttribute(): string
    {
        $out = $this->direction($this->outboundLegs());
        $path = $out ? implode(' → ', $out['path']) : "{$this->origin_code} → {$this->destination_code}";

        return $path.($this->trip_type === 'pp' ? ' (PP)' : '');
    }

    public function getDurationLabelAttribute(): string
    {
        $out = $this->direction($this->outboundLegs());

        return $out['duration'] ?? '-';
    }

    public function orders() { return $this->hasMany(FlightOrder::class); }
}
