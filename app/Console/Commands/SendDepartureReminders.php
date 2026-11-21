<?php

namespace App\Console\Commands;

use App\Models\Booking;
use App\Models\ReminderLog;
use App\Notifications\SystemNotification;
use App\Support\AdminNotifier;
use Illuminate\Console\Command;
use Illuminate\Database\QueryException;

/** Pengingat keberangkatan H-30, H-7, H-1 ke jamaah + ringkasan ke admin */
class SendDepartureReminders extends Command
{
    protected $signature = 'reminders:departures';
    protected $description = 'Kirim pengingat keberangkatan H-30, H-7, H-1';

    private const MESSAGES = [
        30 => 'Keberangkatan Anda tinggal 30 hari lagi. Pastikan seluruh dokumen (paspor, foto, KK/buku nikah) sudah diunggah dan diverifikasi, serta tagihan telah lunas.',
        7 => 'Keberangkatan Anda tinggal 7 hari lagi. Mohon hadir pada jadwal manasik, siapkan perlengkapan ibadah dan pastikan kondisi kesehatan prima.',
        1 => 'InsyaAllah besok Anda berangkat. Mohon tiba di titik kumpul bandara sesuai jadwal yang diinformasikan petugas. Semoga menjadi umrah yang mabrur. 🤲',
    ];

    public function handle(): int
    {
        $summary = [];

        foreach (self::MESSAGES as $days => $message) {
            $date = today()->addDays($days)->toDateString();
            $bookings = Booking::with('user', 'departure.package')->whereIn('status', ['cicilan_berjalan', 'lunas'])
                ->whereHas('departure', fn ($q) => $q->whereDate('departure_date', $date))->get();

            foreach ($bookings as $b) {
                try {
                    ReminderLog::create(['remindable_type' => $b->getMorphClass(), 'remindable_id' => $b->id, 'type' => 'berangkat_h'.$days, 'channel' => 'email', 'sent_on' => today()]);
                } catch (QueryException) {
                    continue;
                }
                $extra = $b->outstandingAmount() > 0 ? ' PERHATIAN: masih ada sisa tagihan Rp'.number_format($b->outstandingAmount(), 0, ',', '.').'.' : '';
                $b->user->notify(new SystemNotification('keberangkatan', "Pengingat Keberangkatan H-{$days} — {$b->departure->package->name}",
                    $message.' Tanggal berangkat: '.$b->departure->departure_date->translatedFormat('l, d F Y').'.'.$extra,
                    $b->customerUrl(), 'Lihat Pesanan', true, true, $days === 1 ? 'danger' : ($days === 7 ? 'warning' : 'info')));
            }
            if ($bookings->isNotEmpty()) {
                $summary[] = "H-{$days}: ".$bookings->sum('pax_count').' jamaah';
            }
        }

        if ($summary) {
            AdminNotifier::notify('keberangkatan', 'Keberangkatan mendekat', implode(' | ', $summary), route('admin.departures.index'), false, 'warning');
        }
        $this->info($summary ? implode(' | ', $summary) : 'Tidak ada keberangkatan H-30/H-7/H-1.');

        return self::SUCCESS;
    }
}
