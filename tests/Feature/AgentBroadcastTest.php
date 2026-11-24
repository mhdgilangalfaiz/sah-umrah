<?php

namespace Tests\Feature;

use App\Models\AgentBroadcast;
use App\Models\Package;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/** Penanda agen (tersembunyi dari pengguna) & siaran WhatsApp serentak ke semua agen. */
class AgentBroadcastTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
        config(['services.whatsapp.broadcast_delay' => 0]);
    }

    private function admin(): User
    {
        return User::where('role', User::ROLE_ADMIN)->where('is_active', true)->first();
    }

    public function test_mark_agent_is_invisible_to_the_customer(): void
    {
        $u = User::where('email', 'jaya.demo@gmail.com')->first();
        $this->actingAs($this->admin())->post(route('admin.agents.mark', $u))->assertSessionHasNoErrors();
        $this->assertTrue($u->fresh()->is_agent);

        // pengguna tidak menerima penanda agen di halaman mana pun
        $this->assertArrayNotHasKey('is_agent', $u->fresh()->toArray());
        $res = $this->actingAs($u->fresh())->get('/dashboard');
        $this->assertStringNotContainsString('is_agent', $res->getContent());
        $this->assertStringNotContainsString('agent', json_encode($res->viewData('page')['props']['auth']));

        // admin tidak bisa ditandai, super admin tidak bisa mengakses menu
        $this->actingAs($this->admin())->post(route('admin.agents.mark', $this->admin()))->assertStatus(422);
        $this->actingAs(User::where('role', User::ROLE_SUPER_ADMIN)->first())->get(route('admin.agents.index'))->assertForbidden();
    }

    public function test_broadcast_package_to_all_agents_via_whatsapp(): void
    {
        config(['services.whatsapp.token' => 'token-uji']);
        Http::fake(['api.fonnte.com/*' => Http::response(['status' => true])]);

        $a1 = User::factory()->create(['name' => 'Agen Satu', 'phone' => '081200000001']);
        $a2 = User::factory()->create(['name' => 'Agen Dua', 'phone' => '081200000002']);
        $noPhone = User::factory()->create(['name' => 'Agen Tanpa HP', 'phone' => null]);
        User::factory()->create(['phone' => '081299999999']); // bukan agen → tidak dikirimi
        foreach ([$a1, $a2, $noPhone] as $a) $a->forceFill(['is_agent' => true])->save();

        $pkg = Package::where('is_active', true)->first();
        $admin = $this->admin();
        $this->actingAs($admin)->get(route('admin.agents.index'))->assertInertia(fn ($p) => $p->component('Admin/Agents')->has('agents', 3)->has('options.paket'));

        // draf pesan otomatis dari paket terpilih
        $draft = $this->postJson(route('admin.agents.preview'), ['item_type' => 'paket', 'item_id' => $pkg->id])->assertOk()->json();
        $this->assertStringContainsString(mb_strtoupper($pkg->name), $draft['message']);
        $this->assertStringContainsString('{nama}', $draft['message']);

        $this->post(route('admin.agents.send'), ['item_type' => 'paket', 'item_id' => $pkg->id] + $draft)->assertSessionHasNoErrors();

        $b = AgentBroadcast::sole();
        $this->assertSame(3, $b->recipients);
        $this->assertSame(['Agen Dua' => 'terkirim', 'Agen Satu' => 'terkirim', 'Agen Tanpa HP' => 'gagal'],
            $b->recipientsList()->orderBy('name')->pluck('status', 'name')->all());

        // tepat 2 WA terkirim, nama agen sudah diganti
        Http::assertSentCount(2);
        Http::assertSent(fn ($r) => $r['target'] === '6281200000001' && str_contains($r['message'], "Assalamu'alaikum Agen Satu"));
        Http::assertNotSent(fn ($r) => $r['target'] === '6281299999999');

        $this->getJson(route('admin.agents.status', $b))->assertOk()->assertJsonCount(3);
    }

    public function test_simulation_when_whatsapp_token_empty_and_requires_agents(): void
    {
        config(['services.whatsapp.token' => null]);
        $admin = $this->admin();
        $this->actingAs($admin)->post(route('admin.agents.send'), ['item_type' => 'bebas', 'title' => 'Info', 'message' => 'Assalamualaikum {nama}, info terbaru'])
            ->assertSessionHasErrors('message'); // belum ada agen

        $a = User::factory()->create(['phone' => '081200000003']);
        $a->forceFill(['is_agent' => true])->save();
        $this->post(route('admin.agents.send'), ['item_type' => 'bebas', 'title' => 'Info', 'message' => 'Assalamualaikum {nama}, info terbaru'])->assertSessionHasNoErrors();
        $this->assertSame('simulasi', AgentBroadcast::sole()->recipientsList()->first()->status);
    }
}
