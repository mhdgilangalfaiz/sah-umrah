<?php

namespace Tests\Feature;

use App\Http\Requests\Auth\LoginRequest;
use App\Models\User;
use App\Support\Captcha;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** Captcha, pesan gagal yang seragam, dan kunci bertingkat 5 → 10 menit. */
class LoginSecurityTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['auth.login.captcha' => true, 'auth.login.free_attempts' => 1, 'auth.login.lockout_minutes' => 5]);
    }

    private function login(array $data, string $captcha = 'ABCDE')
    {
        return $this->withSession(Captcha::fake('ABCDE'))->post('/login', $data + ['captcha' => $captcha]);
    }

    public function test_captcha_image_and_wrong_captcha(): void
    {
        $this->get(route('captcha.login'))->assertOk()->assertHeader('content-type', 'image/png');

        $u = User::factory()->create(['email' => 'budi@gmail.com']);
        $this->login(['email' => $u->email, 'password' => 'password'], 'ZZZZZ')->assertSessionHasErrors('captcha');
        $this->assertGuest();

        $this->login(['email' => $u->email, 'password' => 'password'])->assertRedirect('/dashboard');
        $this->assertAuthenticatedAs($u);
    }

    public function test_failure_message_is_identical_and_does_not_mention_gmail(): void
    {
        User::factory()->admin('finance')->create(['email' => 'finance@sah.co.id']);
        $cases = [
            ['email' => 'orang@yahoo.com', 'password' => 'x'],          // pelanggan non-gmail
            ['email' => 'finance@sah.co.id', 'password' => 'salah'],     // admin, sandi salah
            ['email' => 'tidakada@gmail.com', 'password' => 'x'],        // email tidak terdaftar
        ];
        foreach ($cases as $data) {
            $this->login($data)->assertSessionHasErrors(['email' => LoginRequest::FAILED.' Demi keamanan, coba lagi dalam 5 menit.']);
        }
    }

    public function test_lockout_escalates_and_resets_after_success(): void
    {
        $u = User::factory()->create(['email' => 'budi@gmail.com']);

        // gagal 1x → kunci 5 menit, sandi benar pun ditolak selama terkunci
        $this->login(['email' => $u->email, 'password' => 'salah'])->assertSessionHasErrors(['lockout' => '300']);
        $this->login(['email' => $u->email, 'password' => 'password'])->assertSessionHasErrors('email');
        $this->assertGuest();

        // setelah 5 menit boleh mencoba; salah lagi → 10 menit
        $this->travel(301)->seconds();
        $this->login(['email' => $u->email, 'password' => 'salah'])->assertSessionHasErrors(['lockout' => '600']);

        $this->travel(601)->seconds();
        $this->login(['email' => $u->email, 'password' => 'password'])->assertRedirect('/dashboard');
        auth()->logout();

        // hitungan direset: gagal berikutnya kembali 5 menit
        $this->login(['email' => $u->email, 'password' => 'salah'])->assertSessionHasErrors(['lockout' => '300']);
    }
}
