<?php

namespace Tests\Feature;

use App\Models\Jamaah;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AdminUserCrudTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_create_update_and_delete_customer(): void
    {
        $admin = User::factory()->admin()->create();
        $payload = ['name' => 'Rina', 'email' => 'Rina.Baru@gmail.com', 'phone' => '0811', 'password' => 'Rahasia123', 'password_confirmation' => 'Rahasia123', 'is_active' => true];

        // email non-gmail ditolak (pelanggan non-gmail tidak bisa login)
        $this->actingAs($admin)->post(route('admin.users.store'), ['email' => 'rina@yahoo.com'] + $payload)->assertSessionHasErrors('email');

        $this->actingAs($admin)->post(route('admin.users.store'), $payload)->assertSessionHasNoErrors();
        $u = User::where('email', 'rina.baru@gmail.com')->firstOrFail();
        $this->assertSame('customer', $u->role);
        $this->assertNotNull($u->email_verified_at);
        $this->assertStringStartsWith('SAH-', $u->customer_code);

        // ubah tanpa sandi → sandi lama tetap
        $this->actingAs($admin)->put(route('admin.users.update', $u), ['name' => 'Rina Amelia', 'email' => 'rina.baru@gmail.com', 'phone' => '0812', 'is_active' => false])
            ->assertSessionHasNoErrors();
        $u->refresh();
        $this->assertSame('Rina Amelia', $u->name);
        $this->assertFalse($u->is_active);
        $this->assertTrue(Hash::check('Rahasia123', $u->password));

        // hapus akun tanpa transaksi → jamaahnya ikut terhapus
        Jamaah::create(['user_id' => $u->id, 'full_name' => 'Rina Amelia', 'relation' => 'diri_sendiri']);
        $this->actingAs($admin)->delete(route('admin.users.destroy', $u))->assertSessionHas('success');
        $this->assertModelMissing($u);
        $this->assertSame(0, Jamaah::count());
        $this->assertDatabaseHas('audit_logs', ['action' => 'pengguna.hapus']);
    }

    public function test_admin_accounts_cannot_be_edited_here_and_super_admin_has_no_access(): void
    {
        $admin = User::factory()->admin()->create();
        $other = User::factory()->admin()->create();
        $this->actingAs($admin)->put(route('admin.users.update', $other), ['name' => 'X', 'email' => 'x@gmail.com'])->assertStatus(422);
        $this->actingAs($admin)->delete(route('admin.users.destroy', $other))->assertStatus(422);

        $super = User::factory()->admin('super_admin', true)->create();
        $this->actingAs($super)->post(route('admin.users.store'), [])->assertForbidden();
    }
}
