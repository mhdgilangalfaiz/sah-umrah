<?php

namespace Tests\Feature;

use App\Models\User;
use App\Support\Audit;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class AuditLogAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_super_admin_sees_everything_admin_does_not_see_super_admin(): void
    {
        $super = User::factory()->admin('super_admin', true)->create();
        $admin = User::factory()->admin()->create();
        Audit::log('auth.login', 'Login berhasil', $super, [], [], $super);
        Audit::log('paket.ubah', 'Mengubah paket X', null, [], [], $admin);

        $this->actingAs($super)->get(route('admin.audit.index'))->assertOk()
            ->assertInertia(fn (Assert $p) => $p->component('Admin/AuditLogs')->has('logs.data', 2)->where('isSuper', true));

        $this->actingAs($admin)->get(route('admin.audit.index'))->assertOk()
            ->assertInertia(fn (Assert $p) => $p->has('logs.data', 1)->where('logs.data.0.action', 'paket.ubah')->missing('roles.super_admin'));

        // admin tidak bisa memaksa filter ke Super Admin, ekspor juga tersaring
        $this->actingAs($admin)->get(route('admin.audit.index', ['role' => 'super_admin']))
            ->assertInertia(fn (Assert $p) => $p->has('logs.data', 0));
        $this->assertStringNotContainsString($super->name, $this->actingAs($admin)->get(route('admin.audit.export'))->streamedContent());
    }

    public function test_new_registration_and_failed_admin_login_notify(): void
    {
        $admin = User::factory()->admin()->create();
        $super = User::factory()->admin('super_admin', true)->create();

        $this->post('/register', ['name' => 'Rina', 'email' => 'rina@gmail.com', 'password' => 'Rahasia123', 'password_confirmation' => 'Rahasia123', 'consent' => true]);
        auth()->logout();
        $this->assertStringContainsString('Pendaftar baru', $admin->fresh()->unreadNotifications->first()->data['title']);

        $this->post('/login', ['email' => $admin->email, 'password' => 'salah']);
        $this->assertSame(1, $super->fresh()->unreadNotifications()->where('data->category', 'keamanan')->count());
        $this->assertSame(0, $admin->fresh()->unreadNotifications()->where('data->category', 'keamanan')->count());
    }
}
