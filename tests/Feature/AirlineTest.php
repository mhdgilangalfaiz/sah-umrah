<?php

namespace Tests\Feature;

use App\Models\Airline;
use App\Models\Package;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class AirlineTest extends TestCase
{
    use RefreshDatabase;

    private function package(string $airline): Package
    {
        return Package::create(['name' => 'Paket Uji', 'slug' => 'paket-uji-'.uniqid(), 'type' => 'reguler', 'duration_days' => 9, 'airline' => $airline,
            'price_quad' => 1, 'price_triple' => 1, 'price_double' => 1, 'min_deposit' => 1, 'is_active' => true]);
    }

    public function test_airline_logo_flows_to_package_cards_and_rename_updates_packages(): void
    {
        Storage::fake('public');
        $admin = User::factory()->admin()->create();
        $pkg = $this->package('Batik Air Malaysia');

        // nama maskapai di paket otomatis masuk daftar Maskapai (belum ada logo)
        $airline = Airline::where('name', 'Batik Air Malaysia')->sole();
        $this->assertNull($pkg->fresh()->airline_logo);

        // admin unggah logo lewat menu Maskapai
        $this->actingAs($admin)->post(route('admin.crud.update', ['maskapai', $airline->id]), [
            'name' => 'Batik Air Malaysia', 'logo' => UploadedFile::fake()->image('batik.png', 300, 100),
        ])->assertSessionHasNoErrors();
        $logo = $airline->fresh()->logo;
        Storage::disk('public')->assertExists($logo);

        $this->get('/')->assertInertia(fn (Assert $p) => $p->where('packages.0.airline_logo', Package::mediaUrl($logo)));

        // ganti nama → paket ikut diperbarui, logo tetap tersambung
        $this->actingAs($admin)->post(route('admin.crud.update', ['maskapai', $airline->id]), ['name' => 'Batik Air'])->assertSessionHasNoErrors();
        $this->assertSame('Batik Air', $pkg->fresh()->airline);
        $this->assertNotNull($pkg->fresh()->airline_logo);

        // nama ganda ditolak
        $this->actingAs($admin)->post(route('admin.crud.store', 'maskapai'), ['name' => 'Batik Air'])->assertSessionHasErrors('name');
    }
}
