<?php

namespace Database\Seeders;

use App\Models\Flight;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

/**
 * CONTOH seat penerbangan (data demo). Di produksi, seat diinput & diperbarui manual
 * oleh admin setiap hari sesuai alokasi dari mitra. Jam = jam lokal tiap bandara.
 */
class FlightSeeder extends Seeder
{
    private const REFUND = 'Refund mengikuti ketentuan maskapai: potongan 25% bila diajukan ≥ 14 hari sebelum keberangkatan; kurang dari itu tidak dapat direfund.';
    private const RESCHEDULE = 'Reschedule maksimal 1x, paling lambat 7 hari sebelum keberangkatan, dikenakan biaya + selisih harga sesuai ketersediaan kursi.';

    public function run(): void
    {
        // [maskapai, kode, jenis, segmen berangkat, segmen kembali, harga, alokasi, bagasi]
        // segmen: [no, asal, tujuan, offsetHari, jamBerangkat, offsetHariTiba, jamTiba]
        $offers = [
            ['Batik Air Malaysia', 'OD', 'pp',
                [['OD 361', 'KNO', 'KUL', 0, '08:10', 0, '10:20'], ['OD 3', 'KUL', 'JED', 0, '13:30', 0, '17:25']],
                [['OD 4', 'JED', 'KUL', 12, '19:15', 13, '09:05'], ['OD 360', 'KUL', 'KNO', 13, '11:30', 13, '11:45']],
                14750000, 45, 30],
            ['Batik Air Malaysia', 'OD', 'oneway',
                [['OD 361', 'KNO', 'KUL', 0, '08:10', 0, '10:20'], ['OD 3', 'KUL', 'JED', 0, '13:30', 0, '17:25']],
                null, 8650000, 20, 30],
            ['Garuda Indonesia', 'GA', 'pp',
                [['GA 980', 'CGK', 'MED', 0, '11:15', 0, '17:30']],
                [['GA 981', 'JED', 'CGK', 11, '19:20', 12, '09:10']],
                17900000, 30, 46],
            ['Saudia', 'SV', 'oneway',
                [['SV 817', 'CGK', 'JED', 0, '17:45', 0, '23:30']],
                null, 9250000, 25, 46],
            ['Emirates', 'EK', 'oneway',
                [['EK 359', 'CGK', 'DXB', 0, '00:40', 0, '05:45'], ['EK 803', 'DXB', 'JED', 0, '09:35', 0, '11:45']],
                null, 10400000, 15, 30],
        ];

        $starts = [9, 16, 23, 30, 44];
        foreach ($starts as $n => $days) {
            foreach ($offers as $k => [$airline, $code, $type, $out, $back, $price, $total, $bag]) {
                $base = now()->addDays($days)->startOfDay();
                $legs = fn ($segs) => array_map(fn ($s) => [
                    'flight_number' => $s[0], 'origin_code' => $s[1], 'destination_code' => $s[2],
                    'depart_at' => $base->copy()->addDays($s[3])->setTimeFromTimeString($s[4])->format('Y-m-d H:i'),
                    'arrive_at' => $base->copy()->addDays($s[5])->setTimeFromTimeString($s[6])->format('Y-m-d H:i'),
                ], $segs);
                $left = max(0, $total - (($n * 7 + $k * 5) % ($total + 3))); // variasi sisa seat, ada yang hampir habis/habis

                Flight::create([
                    'airline' => $airline, 'airline_code' => $code, 'trip_type' => $type,
                    'segments' => $legs($out), 'return_segments' => $back ? $legs($back) : null,
                    'cabin_class' => 'ekonomi', 'price' => $price + ($n % 3) * 250000,
                    'baggage_kg' => $bag, 'cabin_baggage_kg' => 7,
                    'seats_total' => $total, 'seats_available' => $left, 'seats_updated_at' => Carbon::today()->setTime(8, 15),
                    'refund_policy' => self::REFUND, 'reschedule_policy' => self::RESCHEDULE, 'is_active' => true,
                ]);
            }
        }
    }
}
