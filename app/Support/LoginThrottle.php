<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

/**
 * Pembatasan percobaan login bertingkat (anti brute force):
 *   salah ke-1 → dikunci 5 menit, salah lagi → 10 menit, lalu 15 menit, dst.
 * (angka dari config auth.login). Kunci per email + IP; hitungan direset setelah login berhasil
 * atau 24 jam tanpa percobaan gagal.
 */
class LoginThrottle
{
    public function __construct(private string $email, private string $ip) {}

    private function key(): string
    {
        return 'login-throttle:'.sha1(Str::lower(trim($this->email)).'|'.$this->ip);
    }

    /** Sisa detik terkunci (0 = boleh mencoba) */
    public function lockedFor(): int
    {
        $until = (int) Cache::get($this->key().':until', 0);

        return max(0, $until - now()->getTimestamp());
    }

    /** Catat kegagalan, kembalikan lama kunci baru (detik; 0 bila belum dikunci) */
    public function fail(): int
    {
        $strikes = (int) Cache::get($this->key().':strikes', 0) + 1;
        Cache::put($this->key().':strikes', $strikes, now()->addDay());

        $free = max(1, (int) config('auth.login.free_attempts', 1));
        if ($strikes < $free) {
            return 0;
        }

        $seconds = ($strikes - $free + 1) * max(1, (int) config('auth.login.lockout_minutes', 5)) * 60;
        Cache::put($this->key().':until', now()->getTimestamp() + $seconds, now()->addSeconds($seconds));

        return $seconds;
    }

    public function clear(): void
    {
        Cache::forget($this->key().':strikes');
        Cache::forget($this->key().':until');
    }

    /** "5 menit", "4 menit 12 detik", "40 detik" */
    public static function human(int $seconds): string
    {
        $m = intdiv($seconds, 60);
        $s = $seconds % 60;

        return trim(($m ? "$m menit " : '').($s ? "$s detik" : ''));
    }
}
