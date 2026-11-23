<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** Tombol Google aktif hanya bila kunci diisi; alamat callback mengikuti alamat situs yang dibuka. */
class GoogleLoginTest extends TestCase
{
    use RefreshDatabase;

    public function test_button_disabled_without_keys(): void
    {
        config(['services.google.client_id' => null, 'services.google.client_secret' => null]);
        $this->get('/login')->assertInertia(fn ($p) => $p->where('googleLogin', false));
        $this->get('/auth/google')->assertNotFound();
    }

    public function test_redirects_to_google_with_callback_of_current_host(): void
    {
        config(['services.google.client_id' => 'abc.apps.googleusercontent.com', 'services.google.client_secret' => 'rahasia']);
        $this->get('/login')->assertInertia(fn ($p) => $p->where('googleLogin', true));

        $location = $this->get('http://localhost:8000/auth/google')->assertRedirect()->headers->get('Location');
        $this->assertStringStartsWith('https://accounts.google.com/', $location);
        $this->assertStringContainsString('redirect_uri='.urlencode('http://localhost:8000/auth/google/callback'), $location);
    }

    public function test_callback_shows_plane_animation_before_dashboard(): void
    {
        config(['services.google.client_id' => 'abc', 'services.google.client_secret' => 'rahasia']);
        $google = (new \Laravel\Socialite\Two\User)->map(['id' => 'g-1', 'name' => 'Boy', 'email' => 'boy.uji@gmail.com', 'avatar' => null]);
        $provider = \Mockery::mock(\Laravel\Socialite\Two\GoogleProvider::class);
        $provider->shouldReceive('redirectUrl')->andReturnSelf();
        $provider->shouldReceive('user')->andReturn($google);
        \Laravel\Socialite\Facades\Socialite::shouldReceive('driver')->with('google')->andReturn($provider);

        // kembali dari Google → ke halaman animasi, bukan langsung dashboard
        $this->get('/auth/google/callback')->assertRedirect(route('auth.google.welcome'));
        $this->assertAuthenticated();

        // halaman login tampil dengan perintah terbang ke tujuan (akun baru → lengkapi profil)
        $this->get(route('auth.google.welcome'))->assertInertia(fn ($p) => $p->component('Auth/AuthScreen')->where('autoFly', route('profile.complete')));

        // dibuka ulang (refresh) → langsung ke dashboard
        $this->get(route('auth.google.welcome'))->assertRedirect(route('dashboard'));
    }
}
