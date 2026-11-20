<?php

namespace App\Http\Requests\Auth;

use App\Models\User;
use App\Support\Audit;
use App\Support\Captcha;
use App\Support\LoginThrottle;
use Illuminate\Auth\Events\Lockout;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Login satu pintu untuk pelanggan & admin.
 *  - Wajib captcha (anti bot).
 *  - Setiap gagal → dikunci bertingkat 5, 10, 15 … menit (LoginThrottle).
 *  - Pesan gagal SELALU sama: "Email atau kata sandi salah." — tidak membocorkan apakah email terdaftar,
 *    apakah itu akun admin, atau aturan domain email (pelanggan tetap hanya bisa @gmail.com).
 */
class LoginRequest extends FormRequest
{
    public const FAILED = 'Email atau kata sandi salah.';

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'email' => ['required', 'string', 'email', 'max:255'],
            'password' => ['required', 'string'],
            'captcha' => Captcha::enabled() ? ['required', 'string', 'max:10'] : ['nullable'],
        ];
    }

    public function messages(): array
    {
        return [
            'email.required' => 'Email wajib diisi.', 'email.email' => 'Format email tidak valid.',
            'password.required' => 'Kata sandi wajib diisi.', 'captcha.required' => 'Kode captcha wajib diisi.',
        ];
    }

    public function authenticate(): void
    {
        $email = Str::lower(trim($this->string('email')));
        $throttle = new LoginThrottle($email, (string) $this->ip());

        if ($wait = $throttle->lockedFor()) {
            event(new Lockout($this));
            Captcha::check(null); // hanguskan captcha lama
            $this->fail('Terlalu banyak percobaan masuk yang gagal. Silakan coba lagi dalam '.LoginThrottle::human($wait).'.', $wait);
        }

        if (Captcha::enabled() && ! Captcha::check($this->string('captcha'))) {
            throw ValidationException::withMessages(['captcha' => 'Kode captcha tidak sesuai. Silakan coba lagi.']);
        }

        $user = User::where('email', $email)->first();
        $password = (string) $this->string('password');

        if (Auth::attempt(['email' => $email, 'password' => $password, 'is_active' => true], $this->boolean('remember'))) {
            // Pelanggan hanya boleh memakai @gmail.com — tetap dijawab dengan pesan yang sama
            if ($user && ! $user->isAdmin() && ! str_ends_with($email, '@gmail.com')) {
                Auth::guard('web')->logout();
            } else {
                $throttle->clear();

                return;
            }
        } elseif ($user && ! $user->is_active && Hash::check($password, (string) $user->password)) {
            // sandi benar tapi akun dinonaktifkan: aman untuk diberi tahu
            throw ValidationException::withMessages(['email' => 'Akun Anda dinonaktifkan. Silakan hubungi kantor kami.']);
        }

        $locked = $throttle->fail();
        if ($user) {
            Audit::log('auth.login_gagal', 'Percobaan login gagal untuk '.$email, $user, [], [], $user);
        }

        $this->fail(self::FAILED.($locked ? ' Demi keamanan, coba lagi dalam '.LoginThrottle::human($locked).'.' : ''), $locked);
    }

    private function fail(string $message, int $lockSeconds = 0): never
    {
        $errors = ['email' => $message];
        if ($lockSeconds > 0) {
            $errors['lockout'] = (string) $lockSeconds; // dipakai halaman login untuk hitung mundur
        }

        throw ValidationException::withMessages($errors);
    }
}
