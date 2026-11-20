<?php

use Illuminate\Support\Facades\Schedule;

/*
| Penjadwalan (jalankan `php artisan schedule:work` saat lokal,
| atau cron `* * * * * php /path/artisan schedule:run` di server).
*/
Schedule::command('orders:expire')->everyFiveMinutes()->withoutOverlapping();
Schedule::command('reminders:installments')->dailyAt('08:00')->timezone('Asia/Jakarta');
Schedule::command('reminders:departures')->dailyAt('07:00')->timezone('Asia/Jakarta');
Schedule::command('finance:verify-integrity')->everyFifteenMinutes();
Schedule::command('queue:prune-failed --hours=168')->daily();
