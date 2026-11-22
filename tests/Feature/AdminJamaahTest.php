<?php

namespace Tests\Feature;

use App\Models\Jamaah;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminJamaahTest extends TestCase
{
    use RefreshDatabase;

    public function test_jamaah_grouped_per_account_with_passport_status_and_no_nik(): void
    {
        $admin = User::factory()->admin()->create();
        $owner = User::factory()->create(['name' => 'Budi Pemilik']);
        Jamaah::create(['user_id' => $owner->id, 'full_name' => 'Budi Pemilik', 'relation' => 'diri_sendiri', 'gender' => 'L', 'passport_expiry' => today()->addYears(3)->toDateString()]);
        Jamaah::create(['user_id' => $owner->id, 'full_name' => 'Siti Aminah', 'relation' => 'istri', 'gender' => 'P', 'nik' => '1271010101900001',
            'passport_number' => 'A1234567', 'passport_expiry' => today()->addMonths(3)->toDateString()]);
        $other = User::factory()->create(['name' => 'Rina']);
        Jamaah::create(['user_id' => $other->id, 'full_name' => 'Rina', 'relation' => 'diri_sendiri', 'gender' => 'P']);

        $res = $this->actingAs($admin)->get(route('admin.jamaah.index'))->assertOk()
            ->assertInertia(fn ($p) => $p->component('Admin/Jamaah')
                ->has('accounts.data', 2) // satu baris per akun perwakilan
                ->where('summary.accounts', 2)->where('summary.total', 3)->where('summary.segera', 1));
        $this->assertStringNotContainsString('1271010101900001', $res->getContent()); // NIK tidak pernah dikirim
        $this->assertStringNotContainsString('A1234567', $res->getContent());         // paspor tersamar

        // cari nama jamaah → muncul akun pemiliknya; pratinjau nama dimulai dari pemilik akun
        $this->actingAs($admin)->get(route('admin.jamaah.index', ['q' => 'Siti']))
            ->assertInertia(fn ($p) => $p->has('accounts.data', 1)->where('accounts.data.0.name', 'Budi Pemilik')
                ->where('accounts.data.0.jamaah_count', 2)->where('accounts.data.0.names.0', 'Budi Pemilik')->where('accounts.data.0.warnings', 1));

        // filter paspor < 6 bulan → pratinjau hanya jamaah yang cocok
        $this->actingAs($admin)->get(route('admin.jamaah.index', ['paspor' => 'segera']))
            ->assertInertia(fn ($p) => $p->has('accounts.data', 1)->where('accounts.data.0.names', ['Siti Aminah'])->where('accounts.data.0.matched', 1));

        // halaman detail akun: semua jamaah sebagai kartu, NIK tetap tidak dikirim
        $show = $this->actingAs($admin)->get(route('admin.jamaah.show', $owner->customer_code))->assertOk()
            ->assertInertia(fn ($p) => $p->component('Admin/JamaahShow')->where('account.code', $owner->customer_code)
                ->has('jamaah', 2)->where('jamaah.0.is_self', true)->where('jamaah.1.passport_status', 'segera')->where('jamaah.1.has_nik', true));
        $this->assertStringNotContainsString('1271010101900001', $show->getContent());

        // akun admin tidak punya halaman jamaah
        $this->actingAs($admin)->get(route('admin.jamaah.show', $admin->customer_code ?? 'x'))->assertNotFound();
    }

    public function test_only_admin_role_can_open_jamaah_page(): void
    {
        $this->actingAs(User::factory()->create())->get(route('admin.jamaah.index'))->assertForbidden();
        $this->actingAs(User::factory()->admin('super_admin', true)->create())->get(route('admin.jamaah.index'))->assertForbidden();
    }
}
