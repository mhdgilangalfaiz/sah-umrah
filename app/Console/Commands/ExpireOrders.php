<?php

namespace App\Console\Commands;

use App\Models\Flight;
use App\Models\FlightOrder;
use App\Notifications\SystemNotification;
use App\Services\BookingService;
use App\Services\Payment\PaymentService;
use App\Support\Audit;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/** Auto-expire: transaksi VA/QRIS, hold kursi umrah, dan order tiket yang lewat batas bayar */
class ExpireOrders extends Command
{
    protected $signature = 'orders:expire';
    protected $description = 'Kedaluwarsakan pembayaran & pesanan yang melewati batas waktu, lepas kursi yang ditahan';

    public function handle(PaymentService $payments, BookingService $bookings): int
    {
        $p = $payments->expireStale();
        $b = $bookings->releaseExpiredHolds();

        $f = 0;
        FlightOrder::where('status', 'menunggu_pembayaran')->where('expires_at', '<', now())->each(function (FlightOrder $o) use (&$f) {
            DB::transaction(function () use ($o) {
                Flight::whereKey($o->flight_id)->lockForUpdate()->first()?->increment('seats_available', $o->pax_count);
                $o->update(['status' => 'kedaluwarsa']);
                $o->invoices()->where('status', 'belum_lunas')->update(['status' => 'batal']);
            });
            Audit::log('pesanan.kedaluwarsa', "Order tiket {$o->code} kedaluwarsa, kursi dikembalikan", $o, [], [], null);
            $o->user->notify(new SystemNotification('pesanan', 'Pesanan Tiket Kedaluwarsa — '.$o->code,
                'Batas waktu pembayaran telah lewat. Silakan lakukan pencarian ulang.', route('flights.index'), 'Cari Tiket', true, false, 'warning'));
            $f++;
        });

        $this->info("Pembayaran kedaluwarsa: $p | Booking dilepas: $b | Tiket kedaluwarsa: $f");

        return self::SUCCESS;
    }
}
