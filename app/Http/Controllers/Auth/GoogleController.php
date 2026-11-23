<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Notifications\SystemNotification;
use App\Support\Audit;
use App\Support\AuthScreen;
use Illuminate\Support\Facades\Auth;
use Laravel\Socialite\Facades\Socialite;

/**
 * Login Google: pilih akun Google → langsung masuk.
 * Akun baru WAJIB melengkapi data profil terlebih dahulu (middleware profile.complete).
 */
class GoogleController extends Controller
{
    public function redirect()
    {
        abort_unless(config('services.google.client_id'), 404);

        return $this->driver()->with(['prompt' => 'select_account'])->redirect();
    }

    /**
     * Alamat callback mengikuti alamat situs yang sedang dibuka, mis.
     *  - uji lokal  : http://localhost:8000/auth/google/callback (Google menolak domain .test)
     *  - hosting    : https://domain-anda.com/auth/google/callback
     * Kedua alamat harus didaftarkan di Google Cloud Console → Authorized redirect URIs.
     */
    private function driver()
    {
        return Socialite::driver('google')->redirectUrl(url('/auth/google/callback'));
    }

    public function callback()
    {
        abort_unless(config('services.google.client_id'), 404);

        try {
            $g = $this->driver()->user();
        } catch (\Throwable) {
            return redirect()->route('login')->withErrors(['email' => 'Login Google dibatalkan atau gagal. Silakan coba lagi.']);
        }

        $email = strtolower($g->getEmail());
        // Pesan disamakan: tidak memberi tahu aturan domain atau bahwa email tsb milik admin
        $denied = 'Akun Google ini tidak dapat digunakan untuk masuk.';
        if (! str_ends_with($email, '@gmail.com')) {
            return redirect()->route('login')->withErrors(['email' => $denied]);
        }

        $user = User::where('google_id', $g->getId())->orWhere('email', $email)->first();

        if ($user?->isAdmin()) {
            return redirect()->route('login')->withErrors(['email' => $denied]);
        }
        if ($user && ! $user->is_active) {
            return redirect()->route('login')->withErrors(['email' => 'Akun Anda dinonaktifkan.']);
        }

        $isNew = ! $user;
        if ($isNew) {
            $user = User::create([
                'name' => $g->getName() ?: explode('@', $email)[0],
                'email' => $email,
                'google_id' => $g->getId(),
                'avatar' => $g->getAvatar(),
                'email_verified_at' => now(), // email Google sudah terverifikasi
            ]);
            $user->notify(new SystemNotification('akun', 'Registrasi Berhasil',
                'Selamat datang! Kode pelanggan Anda: '.$user->customer_code.'. Mohon lengkapi data profil Anda.', route('profile.complete'), 'Lengkapi Profil', false));
        } else {
            $user->forceFill(['google_id' => $user->google_id ?: $g->getId(), 'email_verified_at' => $user->email_verified_at ?? now()])->save();
        }

        Auth::login($user, true);
        request()->session()->regenerate();
        $user->forceFill(['last_login_at' => now(), 'last_login_ip' => request()->ip()])->save();
        Audit::log($isNew ? 'auth.registrasi_google' : 'auth.login_google', ($isNew ? 'Registrasi' : 'Login').' via Google', $user);

        // Tujuan akhir disimpan sekali pakai; halaman animasi pesawat yang akan mengarahkan ke sana
        $to = $user->profile_completed_at ? redirect()->intended(route('dashboard'))->getTargetUrl() : route('profile.complete');
        session()->flash('google_redirect', $to);

        return redirect()->route('auth.google.welcome');
    }

    /**
     * Halaman login tampil sebentar lalu pesawat terbang (sama seperti login dengan email & sandi),
     * kemudian klien pindah ke tujuan. Dibuka ulang (refresh) tanpa data → langsung ke dashboard.
     */
    public function welcome()
    {
        $to = session('google_redirect');
        if (! $to) {
            return redirect()->route('dashboard');
        }

        return AuthScreen::render('login', ['autoFly' => $to, 'status' => 'Berhasil masuk dengan Google. Mengantar Anda ke dashboard…']);
    }
}
