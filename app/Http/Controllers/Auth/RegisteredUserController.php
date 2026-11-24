<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Notifications\SystemNotification;
use App\Support\Audit;
use App\Support\AuthScreen;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rules;
use Inertia\Response;

class RegisteredUserController extends Controller
{
    public function create(): Response
    {
        return AuthScreen::render('register');
    }

    public function store(Request $request): Response|RedirectResponse
    {
        $request->merge(['email' => strtolower(trim((string) $request->email))]);
        $request->validate([
            'name' => 'required|string|max:120',
            'email' => ['required', 'string', 'email', 'max:255', 'unique:'.User::class, 'regex:/@gmail\.com$/i'],
            'password' => ['required', 'confirmed', Rules\Password::min(8)->letters()->numbers()],
            'consent' => ['accepted'],
        ], [
            'email.regex' => 'Pendaftaran wajib menggunakan alamat email @gmail.com.',
            'email.unique' => 'Email ini sudah terdaftar. Silakan masuk.',
            'consent.accepted' => 'Anda harus menyetujui Kebijakan Privasi & pemrosesan data pribadi (UU PDP).',
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => $request->password,
            'pdp_consent_at' => now(),
        ]);

        event(new Registered($user)); // kirim email verifikasi
        Auth::login($user);
        Audit::log('auth.registrasi', 'Registrasi akun baru '.$user->customer_code, $user);
        \App\Support\AdminNotifier::notify('akun', 'Pendaftar baru '.$user->customer_code, "{$user->name} ({$user->email}) membuat akun.", route('admin.users.index', ['q' => $user->customer_code]));

        $user->notify(new SystemNotification('akun', 'Registrasi Berhasil',
            'Selamat datang di PT. Sumatera Andalan Haramain! Kode pelanggan Anda: '.$user->customer_code.'. Silakan verifikasi email Anda untuk mulai melakukan pemesanan.',
            route('dashboard'), 'Buka Dashboard', false, false, 'success'));

        return AuthScreen::success($request, 'register', route('dashboard', absolute: false));
    }
}
