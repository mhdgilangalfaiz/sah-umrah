<?php

namespace App\Console\Commands;

use App\Models\Booking;
use App\Models\ReminderLog;
use App\Notifications\SystemNotification;
use App\Support\AdminNotifier;
use Illuminate\Console\Command;
use Illuminate\Database\QueryException;

/**
 * Pengingat cicilan:
 *  - H-7, H-3, H-1 sebelum jatuh tempo termin → email + in-app
 *  - Termin lewat jatuh tempo / batas pelunasan (H-30 keberangkatan) terlewati
 *      → email + WhatsApp otomatis SETIAP HARI sampai lunas
 * ReminderLog (unik per hari) mencegah pengiriman ganda bila cron berjalan lebih dari sekali.
 */
class SendInstallmentReminders extends Command
{
    protected $signature = 'reminders:installments';
    protected $description = 'Kirim pengingat cicilan & tagihan terlambat (email + WhatsApp)';

    private function once(Booking $b, string $type, string $channel): bool
    {
        try {
            ReminderLog::create(['remindable_type' => $b->getMorphClass(), 'remindable_id' => $b->id, 'type' => $type, 'channel' => $channel, 'sent_on' => today()]);

            return true;
        } catch (QueryException) {
            return false; // sudah terkirim hari ini
        }
    }

    public function handle(): int
    {
        $sent = 0;
        $overdueCount = 0;

        Booking::with('user', 'installments', 'departure.package')
            ->whereIn('status', ['cicilan_berjalan'])->chunkById(100, function ($bookings) use (&$sent, &$overdueCount) {
                foreach ($bookings as $b) {
                    $outstanding = $b->outstandingAmount();
                    if ($outstanding <= 0) continue;
                    $rp = 'Rp'.number_format($outstanding, 0, ',', '.');

                    // 1) Terlambat: batas pelunasan terlewati atau ada termin lewat jatuh tempo
                    $lateInst = $b->installments->first(fn ($i) => $i->status !== 'lunas' && $i->due_date->lt(today()));
                    if ($b->isOverdue() || $lateInst) {
                        $overdueCount++;
                        if ($lateInst) {
                            $b->installments->where('status', '!=', 'lunas')->filter(fn ($i) => $i->due_date->lt(today()))
                                ->each(fn ($i) => $i->update(['status' => 'terlambat', 'last_reminded_at' => now(), 'reminder_count' => $i->reminder_count + 1]));
                        }
                        if ($this->once($b, 'overdue', 'email')) {
                            $this->once($b, 'overdue', 'whatsapp');
                            $days = (int) abs(today()->diffInDays($b->isOverdue() ? $b->payment_deadline : $lateInst->due_date));
                            $b->user->notify(new SystemNotification('cicilan', '⚠️ Tagihan Terlambat — '.$b->code,
                                "Pembayaran paket {$b->departure->package->name} telah melewati jatuh tempo ({$days} hari). Sisa tagihan {$rp}. ".
                                'Mohon segera lakukan pelunasan melalui sistem agar keberangkatan Anda tidak terganggu. Pengingat ini akan dikirim setiap hari hingga tagihan lunas.',
                                $b->customerUrl(), 'Bayar Sekarang', true, true, 'danger'));
                            $sent++;
                        }
                        continue;
                    }

                    // 2) Pengingat sebelum jatuh tempo termin berikutnya
                    $next = $b->installments->first(fn ($i) => $i->status !== 'lunas');
                    if (! $next) continue;
                    $daysLeft = (int) today()->diffInDays($next->due_date, false);
                    if (in_array($daysLeft, [7, 3, 1], true) && $this->once($b, 'cicilan_h'.$daysLeft, 'email')) {
                        $need = 'Rp'.number_format($next->amount - $next->paid_amount, 0, ',', '.');
                        $b->user->notify(new SystemNotification('cicilan', "Pengingat Cicilan H-{$daysLeft} — {$b->code}",
                            "{$next->label} sebesar {$need} jatuh tempo pada {$next->due_date->translatedFormat('d F Y')}. Total sisa tagihan {$rp}. ".
                            'Anda dapat membayar nominal berapa pun (minimal sesuai ketentuan) melalui VA Mandiri, BSI, Muamalat, atau QRIS.',
                            $b->customerUrl(), 'Bayar Cicilan', true, $daysLeft === 1, 'warning'));
                        $next->update(['last_reminded_at' => now(), 'reminder_count' => $next->reminder_count + 1]);
                        $sent++;
                    }
                }
            });

        if ($overdueCount > 0) {
            AdminNotifier::notify(['finance'], 'cicilan', "{$overdueCount} pesanan umrah terlambat bayar",
                'Pengingat otomatis telah dikirim ke pelanggan hari ini.', route('admin.bookings.index', ['terlambat' => 1]));
        }
        $this->info("Pengingat terkirim: $sent | Terlambat: $overdueCount");

        return self::SUCCESS;
    }
}
