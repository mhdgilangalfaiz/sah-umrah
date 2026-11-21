<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_registrasi_wajib_gmail_dan_persetujuan_pdp(): void
    {
        $this->post('/register', ['name' => 'Jaya', 'email' => 'jaya@yahoo.com', 'password' => 'Rahasia123', 'password_confirmation' => 'Rahasia123', 'consent' => true])
            ->assertSessionHasErrors('email');
        $this->post('/register', ['name' => 'Jaya', 'email' => 'jaya@gmail.com', 'password' => 'Rahasia123', 'password_confirmation' => 'Rahasia123'])
            ->assertSessionHasErrors('consent');

        $this->post('/register', ['name' => 'Jaya', 'email' => 'jaya@gmail.com', 'password' => 'Rahasia123', 'password_confirmation' => 'Rahasia123', 'consent' => true])
            ->assertRedirect('/dashboard');

        $user = User::where('email', 'jaya@gmail.com')->first();
        $this->assertNotNull($user->customer_code);
        $this->assertStringStartsWith('SAH-', $user->customer_code);
        $this->assertSame('customer', $user->role);
        $this->assertNotNull($user->pdp_consent_at);
        $this->assertDatabaseHas('audit_logs', ['action' => 'auth.registrasi', 'user_id' => $user->id]);
    }

    public function test_admin_boleh_login_tanpa_gmail_dan_diarahkan_ke_panel(): void
    {
        $admin = User::factory()->admin()->create(['email' => 'staf@sah.co.id']);

        $this->post('/login', ['email' => 'staf@sah.co.id', 'password' => 'password'])->assertRedirect('/admin');
        $this->assertAuthenticatedAs($admin);
        $this->assertTrue(AuditLog::where('action', 'auth.login')->where('user_id', $admin->id)->exists());
    }

    public function test_login_dan_daftar_lewat_inertia_mengirim_redirect_to_untuk_animasi(): void
    {
        $inertia = ['X-Inertia' => 'true', 'X-Requested-With' => 'XMLHttpRequest'];
        $admin = User::factory()->admin()->create(['email' => 'staf@sah.co.id']);

        $this->withHeaders($inertia)->post('/login', ['email' => 'staf@sah.co.id', 'password' => 'password'])
            ->assertOk()->assertJsonPath('component', 'Auth/AuthScreen')->assertJsonPath('props.redirectTo', url('/admin'));
        $this->assertAuthenticatedAs($admin);

        auth()->logout();
        $this->withHeaders($inertia)->post('/register', ['name' => 'Jaya', 'email' => 'jaya@gmail.com', 'password' => 'Rahasia123', 'password_confirmation' => 'Rahasia123', 'consent' => true])
            ->assertOk()->assertJsonPath('props.mode', 'register')->assertJsonPath('props.redirectTo', fn ($to) => str_ends_with($to, '/dashboard'));
    }

    public function test_pelanggan_non_gmail_ditolak_dan_akun_nonaktif_tidak_bisa_masuk(): void
    {
        $this->post('/login', ['email' => 'orang@yahoo.com', 'password' => 'password'])->assertSessionHasErrors('email');

        $u = User::factory()->create();
        $u->forceFill(['is_active' => false])->save();
        $this->post('/login', ['email' => $u->email, 'password' => 'password'])->assertSessionHasErrors('email');
        $this->assertGuest();
    }

    public function test_rbac_panel_admin(): void
    {
        $customer = User::factory()->create();
        $this->actingAs($customer)->get('/admin')->assertForbidden();

        // Admin: kelola seluruh website, tetapi tidak bisa membuat akun admin
        $admin = User::factory()->admin()->create();
        foreach (['/admin', '/admin/pembayaran', '/admin/laporan', '/admin/invoice', '/admin/bantuan', '/admin/paket', '/admin/pengaturan', '/admin/kelola/beranda', '/admin/kelola/galeri'] as $url) {
            $this->actingAs($admin)->get($url)->assertOk();
        }
        $this->actingAs($admin)->get('/admin/akun-admin')->assertForbidden();

        // Super Admin: hanya lihat pembelian, laporan & invoice, serta akun admin
        $super = User::factory()->admin('super_admin', true)->create();
        foreach (['/admin', '/admin/pesanan-umrah', '/admin/pesanan-tiket', '/admin/visa', '/admin/pembayaran', '/admin/laporan', '/admin/invoice', '/admin/akun-admin'] as $url) {
            $this->actingAs($super)->get($url)->assertOk();
        }
        foreach (['/admin/paket', '/admin/pengaturan', '/admin/kelola/beranda', '/admin/kelola/galeri', '/admin/kelola/testimoni', '/admin/bantuan', '/admin/refund', '/admin/penerbangan'] as $url) {
            $this->actingAs($super)->get($url)->assertForbidden();
        }
    }

    public function test_hanya_super_admin_yang_dapat_menambah_admin(): void
    {
        $super = User::factory()->admin('super_admin', true)->create();
        $other = User::factory()->admin()->create();
        // "role" dari request diabaikan: akun baru selalu Admin
        $payload = ['name' => 'Admin Baru', 'email' => 'admin2@sah.co.id', 'role' => 'super_admin', 'password' => 'RahasiaKuat123', 'password_confirmation' => 'RahasiaKuat123', 'my_password' => 'password'];

        $this->actingAs($other)->post('/admin/akun-admin', $payload)->assertForbidden();
        $this->actingAs($super)->post('/admin/akun-admin', $payload)->assertSessionHasNoErrors();

        $new = User::where('email', 'admin2@sah.co.id')->first();
        $this->assertSame('admin', $new->role);
        $this->assertFalse($new->is_primary_admin);
        // admin baru tidak dapat menambah admin lagi
        $this->actingAs($new)->post('/admin/akun-admin', array_merge($payload, ['email' => 'x@sah.co.id']))->assertForbidden();
    }

    public function test_akun_google_wajib_melengkapi_profil(): void
    {
        $u = User::factory()->create(['profile_completed_at' => null, 'google_id' => 'g-123']);
        $this->actingAs($u)->get('/dashboard')->assertRedirect('/lengkapi-profil');

        $this->actingAs($u)->post('/lengkapi-profil', [
            'name' => 'Jaya', 'phone' => '081234567890', 'nik' => '1271010101900001', 'birth_place' => 'Medan',
            'birth_date' => '1990-01-01', 'gender' => 'L', 'address' => 'Jl. A', 'city' => 'Medan',
        ])->assertRedirect();
        $this->assertNotNull($u->fresh()->profile_completed_at);
        $this->actingAs($u->fresh())->get('/dashboard')->assertOk();
    }
}
