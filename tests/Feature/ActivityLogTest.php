<?php

namespace Tests\Feature;

use App\Models\User;
use App\Support\Audit;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ActivityLogTest extends TestCase
{
    use RefreshDatabase;

    public function test_super_admin_sees_admin_logins_only(): void
    {
        $super = User::factory()->admin('super_admin', true)->create();
        $admin = User::factory()->admin()->create(['name' => 'Admin Kantor']);
        $customer = User::factory()->create();

        // login admin tercatat lewat alur login sebenarnya
        $this->post('/login', ['email' => $admin->email, 'password' => 'password'])->assertRedirect();
        auth()->logout();
        Audit::log('auth.login', 'Login berhasil', $customer, [], [], $customer); // login jamaah: tidak ditampilkan
        Audit::log('auth.login_gagal', 'Percobaan login gagal', $admin, [], [], $admin);

        $this->actingAs($super)->get(route('admin.activity.index'))->assertOk()
            ->assertInertia(fn (Assert $p) => $p->component('Admin/ActivityLogs')
                ->has('logs.data', 2)
                ->where('logs.data.0.action', 'auth.login_gagal')
                ->where('logs.data.1.name', 'Admin Kantor')
                ->where('summary.login.today', 1)->where('summary.failed.today', 1)->has('summary.login.series', 7)
                ->where('stats.0.count', 1)->where('stats.2.count', 1));

        // ekspor CSV berisi aktivitas admin, bukan jamaah
        $csv = $this->actingAs($super)->get(route('admin.activity.export'))->assertOk()->streamedContent();
        $this->assertStringContainsString('Admin Kantor', $csv);
        $this->assertStringNotContainsString($customer->email, $csv);

        // filter aktivitas
        $this->actingAs($super)->get(route('admin.activity.index', ['aksi' => 'auth.login']))
            ->assertInertia(fn (Assert $p) => $p->has('logs.data', 1));
    }

    public function test_login_ignores_intended_page_the_account_cannot_open(): void
    {
        $admin = User::factory()->admin()->create();
        $super = User::factory()->admin('super_admin', true)->create();

        // sesi habis di halaman khusus Super Admin, lalu yang login Admin → dashboard, bukan 403
        $this->get('/admin/log-aktivitas')->assertRedirect('/login');
        $this->post('/login', ['email' => $admin->email, 'password' => 'password'])->assertRedirect('/admin');
        auth()->logout();

        // Super Admin tetap diantar ke halaman tujuannya
        $this->get('/admin/log-aktivitas');
        $this->post('/login', ['email' => $super->email, 'password' => 'password'])->assertRedirect(url('/admin/log-aktivitas'));
    }

    public function test_admin_and_customer_cannot_open_activity_log(): void
    {
        $this->actingAs(User::factory()->admin()->create())->get(route('admin.activity.index'))->assertForbidden();
        $this->actingAs(User::factory()->create())->get(route('admin.activity.index'))->assertForbidden();
    }
}
