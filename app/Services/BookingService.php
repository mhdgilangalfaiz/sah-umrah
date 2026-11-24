<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\BookingChange;
use App\Models\BookingPassenger;
use App\Models\Refund;
use App\Models\PackageDeparture;
use App\Models\User;
use App\Notifications\SystemNotification;
use App\Support\AdminNotifier;
use App\Support\Audit;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
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
                $booking->passengers()->create($p + ['category' => 'dewasa', 'price' => $unit]);
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
        AdminNotifier::notify('pesanan', 'Booking umrah baru '.$booking->code,
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

    /**
     * Pengurangan jamaah: jamaah terpilih dikeluarkan dari pesanan, kursinya dilepas, total & jadwal cicilan dihitung ulang.
     * $refund = dana yang dikembalikan ke pelanggan (mengurangi total dibayar). Sisa dana tetap terhitung untuk jamaah lain.
     */
    public function reducePassengers(Booking $booking, array $passengerIds, int $refund, string $reason, ?User $by = null, ?Refund $refundRecord = null): BookingChange
    {
        return DB::transaction(function () use ($booking, $passengerIds, $refund, $reason, $by, $refundRecord) {
            $booking = Booking::lockForUpdate()->findOrFail($booking->id);
            $removed = $booking->passengers()->whereIn('id', $passengerIds)->get();
            if ($removed->isEmpty() || $removed->count() >= $booking->pax_count) {
                throw ValidationException::withMessages(['passenger_ids' => 'Pilih jamaah yang dikurangi (minimal 1 jamaah tetap tersisa — untuk membatalkan semua, gunakan Batalkan pesanan).']);
            }
            $oldTotal = (int) $booking->total_amount;
            $newTotal = $oldTotal - (int) $removed->sum(fn ($p) => $p->price ?? $booking->unit_price);
            $this->guardRefund($booking, $newTotal, $refund);

            $dep = PackageDeparture::lockForUpdate()->find($booking->package_departure_id);
            if ($booking->seats_confirmed) {
                $dep->booked = max(0, $dep->booked - $removed->count());
            } else {
                $dep->held = max(0, $dep->held - $removed->count());
            }
            $dep->save();

            $names = $removed->pluck('full_name')->implode(', ');
            BookingPassenger::whereIn('id', $removed->pluck('id'))->delete();

            return $this->applyChange($booking, 'pengurangan', "Mengurangi {$removed->count()} jamaah ({$names}). Alasan: {$reason}", $oldTotal, $refund, $by, $refundRecord);
        });
    }

    /**
     * Perubahan jamaah: kategori (dewasa/anak/bayi) & harga per jamaah, mis. 2 dewasa → 1 dewasa + 1 anak.
     * $changes = [passenger_id => ['category' => 'anak', 'price' => 20000000]]
     */
    public function changePassengers(Booking $booking, array $changes, int $refund, string $reason, ?User $by = null): BookingChange
    {
        return DB::transaction(function () use ($booking, $changes, $refund, $reason, $by) {
            $booking = Booking::lockForUpdate()->findOrFail($booking->id);
            $passengers = $booking->passengers()->get()->keyBy('id');
            $oldTotal = (int) $booking->total_amount;
            $lines = [];
            foreach ($changes as $id => $c) {
                $p = $passengers->get((int) $id);
                if (! $p) continue;
                $old = [$p->category ?: 'dewasa', (int) ($p->price ?? $booking->unit_price)];
                $new = [$c['category'], (int) $c['price']];
                if ($old === $new) continue;
                $p->update(['category' => $new[0], 'price' => $new[1]]);
                $lines[] = $p->full_name.': '.BookingPassenger::CATEGORIES[$old[0]].' Rp'.number_format($old[1], 0, ',', '.')
                    .' → '.BookingPassenger::CATEGORIES[$new[0]].' Rp'.number_format($new[1], 0, ',', '.');
            }
            if (! $lines) {
                throw ValidationException::withMessages(['changes' => 'Tidak ada perubahan kategori atau harga jamaah.']);
            }
            $newTotal = (int) $booking->passengers()->get()->sum(fn ($p) => $p->price ?? $booking->unit_price);
            $this->guardRefund($booking, $newTotal, $refund);

            return $this->applyChange($booking, 'perubahan', implode('; ', $lines).'. Alasan: '.$reason, $oldTotal, $refund, $by);
        });
    }

    /** Pengembalian dana saja (mis. bayar ganda): jamaah tetap, total dibayar berkurang, status & cicilan dihitung ulang. */
    public function refundPayment(Booking $booking, int $refund, ?User $by = null, ?Refund $refundRecord = null): BookingChange
    {
        return DB::transaction(function () use ($booking, $refund, $by, $refundRecord) {
            $booking = Booking::lockForUpdate()->findOrFail($booking->id);
            $this->guardRefund($booking, (int) $booking->total_amount, $refund);

            return $this->applyChange($booking, 'refund', 'Pengembalian dana Rp'.number_format($refund, 0, ',', '.').($refundRecord ? ' ('.$refundRecord->code.')' : '').'.',
                (int) $booking->total_amount, $refund, $by, $refundRecord);
        });
    }

    /** Dana dikembalikan tidak boleh melebihi yang sudah dibayar, dan kelebihan bayar wajib dikembalikan */
    private function guardRefund(Booking $booking, int $newTotal, int $refund): void
    {
        $paid = (int) $booking->paid_amount;
        if ($refund < 0 || $refund > $paid) {
            throw ValidationException::withMessages(['refund_amount' => 'Dana dikembalikan maksimal Rp'.number_format($paid, 0, ',', '.').' (total yang sudah dibayar).']);
        }
        if ($paid - $refund > $newTotal) {
            throw ValidationException::withMessages(['refund_amount' => 'Total dibayar melebihi total baru. Kembalikan minimal Rp'.number_format($paid - $newTotal, 0, ',', '.').'.']);
        }
    }

    /** Hitung ulang total, dibayar, status, jadwal cicilan & invoice; catat riwayat + refund (bila ada dana dikembalikan). */
    private function applyChange(Booking $booking, string $type, string $description, int $oldTotal, int $refund, ?User $by, ?Refund $refundRecord = null): BookingChange
    {
        $passengers = $booking->passengers()->get();
        $booking->pax_count = $passengers->count();
        $booking->total_amount = (int) $passengers->sum(fn ($p) => $p->price ?? $booking->unit_price);
        $booking->paid_amount = (int) $booking->paid_amount - $refund;
        $booking->status = $this->statusAfterChange($booking);
        $booking->save();

        $this->rebalanceInstallments($booking);
        $this->invoices->refreshInvoice($booking->load('departure.package'));

        if ($refund > 0 && ! $refundRecord) {
            // Dana dikembalikan atas keputusan admin → tercatat di menu Refund (status disetujui), admin tinggal unggah bukti transfer
            $last = Refund::where('user_id', $booking->user_id)->whereNotNull('bank_name')->latest()->first();
            $refundRecord = Refund::create([
                'code' => 'RF-'.now()->format('ymd').'-'.strtoupper(Str::random(4)),
                'type' => $type, 'user_id' => $booking->user_id,
                'refundable_type' => $booking->getMorphClass(), 'refundable_id' => $booking->id,
                'requested_amount' => $refund, 'approved_amount' => $refund, 'reason' => $description,
                'bank_name' => $last?->bank_name, 'account_number' => $last?->account_number, 'account_holder' => $last?->account_holder,
                'status' => 'disetujui', 'reviewed_by' => $by?->id, 'reviewed_at' => now(),
            ]);
        }

        $change = $booking->changes()->create([
            'type' => $type, 'description' => $description, 'old_total' => $oldTotal, 'new_total' => $booking->total_amount,
            'refund_amount' => $refund, 'refund_id' => $refundRecord?->id, 'changed_by' => $by?->id,
        ]);
        Audit::log('pesanan.'.$type, "Booking {$booking->code}: {$description}", $booking, ['total_amount' => $oldTotal], ['total_amount' => $booking->total_amount], $by);

        $booking->user->notify(new SystemNotification('pesanan', BookingChange::TYPES[$type].' — '.$booking->code,
            $description.' Total baru Rp'.number_format($booking->total_amount, 0, ',', '.').'.'
            .($refund > 0 ? ' Dana Rp'.number_format($refund, 0, ',', '.').' akan dikembalikan ke rekening Anda.' : '')
            .($booking->outstandingAmount() > 0 ? ' Sisa tagihan Rp'.number_format($booking->outstandingAmount(), 0, ',', '.').'.' : ' Tagihan Anda LUNAS.'),
            $booking->customerUrl(), 'Lihat Pesanan'));

        return $change;
    }

    private function statusAfterChange(Booking $booking): string
    {
        if ($booking->outstandingAmount() <= 0) return 'lunas';
        if ((int) $booking->paid_amount > 0 || $booking->seats_confirmed) return 'cicilan_berjalan';

        return 'menunggu_pembayaran';
    }

    /**
     * Sesuaikan jadwal cicilan dengan total baru: pembayaran dialokasikan ulang dari termin pertama,
     * termin yang belum lunas diskalakan agar jumlah semua termin = total pesanan.
     */
    public function rebalanceInstallments(Booking $booking): void
    {
        $total = (int) $booking->total_amount;
        $paid = (int) $booking->paid_amount;
        $list = $booking->installments()->get()->values();

        // termin yang tertutup penuh oleh pembayaran tetap; sisanya diskalakan
        $fixed = 0;
        $k = 0;
        foreach ($list as $i => $inst) {
            if ($fixed + $inst->amount > $paid || $fixed + $inst->amount > $total) break;
            $fixed += $inst->amount;
            $k = $i + 1;
        }
        $rest = $list->slice($k)->values();
        $target = $total - $fixed;   // jumlah yang harus ditanggung termin sisa
        $partial = $paid - $fixed;   // pembayaran yang jatuh ke termin sisa pertama
        $oldSum = (int) $rest->sum('amount');

        if ($target <= 0) {
            $rest->each->delete();
        } elseif ($rest->isEmpty() || $oldSum <= 0) {
            $rest->each->delete();
            $booking->installments()->create(['sequence' => ($list->max('sequence') ?? 0) + 1, 'label' => 'Sisa tagihan', 'amount' => $target,
                'due_date' => ($booking->payment_deadline ?? today())->toDateString()]);
        } else {
            $amounts = [];
            $left = $target;
            foreach ($rest as $j => $inst) {
                $amt = $j === $rest->count() - 1 ? $left : (int) (floor($inst->amount * $target / $oldSum / 1000) * 1000);
                $amounts[$j] = $amt;
                $left -= $amt;
            }
            // termin pertama tidak boleh lebih kecil dari pembayaran yang sudah masuk ke situ
            if ($amounts[0] < $partial) {
                $shift = $partial - $amounts[0];
                $amounts[0] = $partial;
                for ($j = count($amounts) - 1; $j > 0 && $shift > 0; $j--) {
                    $take = min($shift, $amounts[$j]);
                    $amounts[$j] -= $take;
                    $shift -= $take;
                }
            }
            foreach ($rest as $j => $inst) {
                if ($amounts[$j] <= 0) {
                    $inst->delete();

                    continue;
                }
                $inst->amount = $amounts[$j];
                $inst->save();
            }
        }

        // alokasi ulang pembayaran ke termin berurutan
        $remaining = $paid;
        foreach ($booking->installments()->get() as $inst) {
            $alloc = min((int) $inst->amount, max(0, $remaining));
            $inst->paid_amount = $alloc;
            $inst->status = $alloc >= $inst->amount ? 'lunas' : ($alloc > 0 ? 'sebagian' : 'belum_dibayar');
            $inst->save();
            $remaining -= $alloc;
        }
    }

    /**
     * Batalkan seluruh pesanan. $status: 'dibatalkan' (tanpa pengembalian dana) atau 'refund' (dana dikembalikan).
     */
    public function cancel(Booking $booking, string $reason, ?User $by = null, string $status = 'dibatalkan'): void
    {
        DB::transaction(function () use ($booking, $reason, $status) {
            $dep = PackageDeparture::lockForUpdate()->find($booking->package_departure_id);
            if ($booking->seats_confirmed) {
                $dep->booked = max(0, $dep->booked - $booking->pax_count);
            } elseif ($booking->status === 'menunggu_pembayaran') {
                $dep->held = max(0, $dep->held - $booking->pax_count);
            }
            $dep->save();
            $booking->update(['status' => $status, 'cancelled_at' => now(), 'cancel_reason' => $reason, 'hold_expires_at' => null]);
            $booking->invoices()->where('type', 'invoice')->where('status', 'belum_lunas')->update(['status' => 'batal']);
            foreach ($booking->payments()->where('status', 'menunggu_pembayaran')->get() as $p) {
                app(\App\Services\Payment\PaymentService::class)->cancel($p, 'Pesanan dibatalkan');
            }
        });
        Audit::log('pesanan.dibatalkan', "Booking {$booking->code} dibatalkan: $reason", $booking, [], [], $by);
    }
}
