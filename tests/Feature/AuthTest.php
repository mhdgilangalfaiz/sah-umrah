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
        $admin = User::factory()->admin('finance')->create(['email' => 'finance@sah.co.id']);

        $this->post('/login', ['email' => 'finance@sah.co.id', 'password' => 'password'])->assertRedirect('/admin');
        $this->assertAuthenticatedAs($admin);
        $this->assertTrue(AuditLog::where('action', 'auth.login')->where('user_id', $admin->id)->exists());
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

        $cs = User::factory()->admin('cs')->create();
        $this->actingAs($cs)->get('/admin')->assertOk();
        $this->actingAs($cs)->get('/admin/pembayaran')->assertForbidden();      // khusus finance
        $this->actingAs($cs)->get('/admin/akun-admin')->assertForbidden();      // khusus admin utama
        $this->actingAs($cs)->get('/admin/bantuan')->assertOk();
    }

    public function test_hanya_admin_utama_yang_dapat_menambah_admin(): void
    {
        $primary = User::factory()->admin('super_admin', true)->create();
        $other = User::factory()->admin('super_admin', false)->create();
        $payload = ['name' => 'CS Baru', 'email' => 'cs2@sah.co.id', 'role' => 'cs', 'password' => 'RahasiaKuat123', 'password_confirmation' => 'RahasiaKuat123', 'my_password' => 'password'];

        $this->actingAs($other)->post('/admin/akun-admin', $payload)->assertForbidden();
        $this->actingAs($primary)->post('/admin/akun-admin', $payload)->assertSessionHasNoErrors();

        $new = User::where('email', 'cs2@sah.co.id')->first();
        $this->assertSame('cs', $new->role);
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
