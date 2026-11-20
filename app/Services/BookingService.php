<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\PackageDeparture;
use App\Models\User;
use App\Notifications\SystemNotification;
use App\Support\AdminNotifier;
use App\Support\Audit;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class BookingService
{
    public function __construct(private InvoiceService $invoices) {}

    /**
     * Membuat booking umrah: kursi DITAHAN (held) selama SEAT_HOLD_HOURS menunggu deposit/pelunasan.
     * Kursi berubah menjadi terkonfirmasi (booked) ketika pembayaran pertama diterima.
     */
    public function create(User $user, PackageDeparture $departure, string $roomType, array $passengers, string $scheme, ?string $notes = null): Booking
    {
        $pax = count($passengers);

        $booking = DB::transaction(function () use ($user, $departure, $roomType, $passengers, $scheme, $notes, $pax) {
            $dep = PackageDeparture::with('package')->lockForUpdate()->findOrFail($departure->id);

            if ($dep->status !== 'open' || $dep->departure_date->lte(today())) {
                throw ValidationException::withMessages(['departure' => 'Jadwal keberangkatan ini sudah ditutup.']);
            }
            if ($dep->remaining < $pax) {
                throw ValidationException::withMessages(['departure' => "Sisa kuota tidak mencukupi (tersisa {$dep->remaining} kursi)."]);
            }

            $deadline = $dep->paymentDeadline();
            if ($scheme === 'cicilan' && $deadline->lte(today()->addDays(7))) {
                throw ValidationException::withMessages(['scheme' => 'Keberangkatan sudah dekat — paket ini hanya dapat dibayar lunas.']);
            }

            $unit = $dep->package->priceFor($roomType);
            $holdUntil = now()->addHours((int) config('payment.seat_hold_hours', 24));

            $booking = Booking::create([
                'code' => Booking::generateCode('U'),
                'user_id' => $user->id,
                'package_departure_id' => $dep->id,
                'room_type' => $roomType,
                'pax_count' => $pax,
                'unit_price' => $unit,
                'total_amount' => $unit * $pax,
                'payment_scheme' => $scheme,
                'status' => 'menunggu_pembayaran',
                'hold_expires_at' => $holdUntil,
                'payment_deadline' => $scheme === 'cicilan' ? $deadline : $holdUntil->toDateString(),
                'notes' => $notes,
            ]);

            foreach ($passengers as $p) {
                $booking->passengers()->create($p);
            }

            $dep->increment('held', $pax);

            $this->buildSchedule($booking, $holdUntil, $deadline);
            $this->invoices->issueInvoice($booking->load('departure.package'));

            Audit::log('pesanan.umrah_dibuat', "Membuat booking {$booking->code} ({$pax} jamaah, {$scheme})", $booking);

            return $booking;
        });

        $user->notify(new SystemNotification('pesanan', 'Pesanan Dibuat — '.$booking->code,
            'Pesanan paket '.$booking->departure->package->name.' untuk '.$pax.' jamaah berhasil dibuat. Kursi Anda ditahan sampai '.
            $booking->hold_expires_at->translatedFormat('d M Y H:i').' WIB. Segera lakukan pembayaran '.($scheme === 'cicilan' ? 'deposit awal' : 'pelunasan').'.',
            $booking->customerUrl(), 'Bayar Sekarang'));
        AdminNotifier::notify(['operasional', 'finance'], 'pesanan', 'Booking umrah baru '.$booking->code,
            $user->name.' — '.$booking->departure->package->name.' ('.$pax.' pax)', route('admin.bookings.show', $booking));

        return $booking;
    }

    /** Jadwal cicilan: Deposit Awal + termin bulanan merata hingga batas pelunasan (H-30). */
    public function buildSchedule(Booking $booking, Carbon $holdUntil, Carbon $deadline): void
    {
        $total = (int) $booking->total_amount;

        if ($booking->payment_scheme === 'lunas') {
            $booking->installments()->create(['sequence' => 1, 'label' => 'Pelunasan', 'amount' => $total, 'due_date' => $holdUntil->toDateString()]);

            return;
        }

        $deposit = $booking->requiredDeposit();
        $booking->installments()->create(['sequence' => 1, 'label' => 'Deposit Awal', 'amount' => $deposit, 'due_date' => $holdUntil->toDateString()]);

        $rest = $total - $deposit;
        if ($rest <= 0) return;

        $months = (int) floor($holdUntil->copy()->startOfDay()->diffInMonths($deadline));
        $terms = max(1, min((int) config('payment.max_terms', 6), $months));
        $per = (int) (floor($rest / $terms / 1000) * 1000);

        for ($i = 1; $i <= $terms; $i++) {
            $amount = $i === $terms ? $rest - $per * ($terms - 1) : $per;
            $due = $i === $terms ? $deadline->copy() : $deadline->copy()->subMonths($terms - $i);
            $booking->installments()->create([
                'sequence' => $i + 1, 'label' => 'Termin '.$i, 'amount' => $amount, 'due_date' => $due->toDateString(),
            ]);
        }
    }

    /** Lepas kursi yang ditahan untuk booking yang tidak dibayar sampai batas hold */
    public function releaseExpiredHolds(): int
    {
        $count = 0;
        Booking::where('status', 'menunggu_pembayaran')->where('seats_confirmed', false)
            ->where('hold_expires_at', '<', now())->each(function (Booking $b) use (&$count) {
                DB::transaction(function () use ($b) {
                    $dep = PackageDeparture::lockForUpdate()->find($b->package_departure_id);
                    $dep->held = max(0, $dep->held - $b->pax_count);
                    $dep->save();
                    $b->update(['status' => 'kedaluwarsa', 'hold_expires_at' => null]);
                    $b->invoices()->where('status', 'belum_lunas')->update(['status' => 'batal']);
                });
                Audit::log('pesanan.kedaluwarsa', "Booking {$b->code} kedaluwarsa, {$b->pax_count} kursi dilepas", $b, [], [], null);
                $b->user->notify(new SystemNotification('pesanan', 'Pesanan Kedaluwarsa — '.$b->code,
                    'Batas waktu pembayaran deposit telah lewat sehingga kursi dilepas. Silakan buat pesanan baru bila masih berminat.',
                    route('packages.index'), 'Lihat Paket', true, false, 'warning'));
                $count++;
            });

        return $count;
    }

    public function cancel(Booking $booking, string $reason, ?User $by = null): void
    {
        DB::transaction(function () use ($booking, $reason) {
            $dep = PackageDeparture::lockForUpdate()->find($booking->package_departure_id);
            if ($booking->seats_confirmed) {
                $dep->booked = max(0, $dep->booked - $booking->pax_count);
            } elseif ($booking->status === 'menunggu_pembayaran') {
                $dep->held = max(0, $dep->held - $booking->pax_count);
            }
            $dep->save();
            $booking->update(['status' => 'dibatalkan', 'cancelled_at' => now(), 'cancel_reason' => $reason, 'hold_expires_at' => null]);
            foreach ($booking->payments()->where('status', 'menunggu_pembayaran')->get() as $p) {
                app(\App\Services\Payment\PaymentService::class)->cancel($p, 'Pesanan dibatalkan');
            }
        });
        Audit::log('pesanan.dibatalkan', "Booking {$booking->code} dibatalkan: $reason", $booking, [], [], $by);
    }
}
