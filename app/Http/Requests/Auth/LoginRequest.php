<?php

namespace App\Http\Requests\Auth;

use App\Models\User;
use App\Support\Audit;
use Illuminate\Auth\Events\Lockout;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Login satu pintu untuk pelanggan & admin.
 *  - Pelanggan WAJIB memakai alamat @gmail.com.
 *  - Admin boleh memakai email apa pun (mis. admin@sah.co.id).
 */
class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'email' => ['required', 'string', 'email', 'max:255'],
            'password' => ['required', 'string'],
        ];
    }

    public function messages(): array
    {
        return ['email.required' => 'Email wajib diisi.', 'email.email' => 'Format email tidak valid.', 'password.required' => 'Kata sandi wajib diisi.'];
    }

    public function authenticate(): void
    {
        $this->ensureIsNotRateLimited();

        $email = Str::lower($this->string('email'));
        $user = User::where('email', $email)->first();

        if (! $user?->isAdmin() && ! str_ends_with($email, '@gmail.com')) {
            RateLimiter::hit($this->throttleKey());
            throw ValidationException::withMessages(['email' => 'Akun pelanggan wajib menggunakan alamat email @gmail.com.']);
        }

        if ($user && ! $user->is_active) {
            throw ValidationException::withMessages(['email' => 'Akun Anda dinonaktifkan. Silakan hubungi kantor kami.']);
        }

        if (! Auth::attempt(['email' => $email, 'password' => $this->string('password'), 'is_active' => true], $this->boolean('remember'))) {
            RateLimiter::hit($this->throttleKey());
            if ($user) {
                Audit::log('auth.login_gagal', 'Percobaan login gagal untuk '.$email, $user, [], [], $user);
            }

            throw ValidationException::withMessages(['email' => 'Email atau kata sandi salah.']);
        }

        RateLimiter::clear($this->throttleKey());
    }

    public function ensureIsNotRateLimited(): void
    {
        if (! RateLimiter::tooManyAttempts($this->throttleKey(), 5)) {
            return;
        }

        event(new Lockout($this));
        $seconds = RateLimiter::availableIn($this->throttleKey());

        throw ValidationException::withMessages([
            'email' => "Terlalu banyak percobaan masuk. Coba lagi dalam {$seconds} detik.",
        ]);
    }

    public function throttleKey(): string
    {
        return Str::transliterate(Str::lower($this->string('email')).'|'.$this->ip());
    }
}
