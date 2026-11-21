<?php

namespace Tests\Feature;

use App\Models\User;
use App\Support\LandingContent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class LandingContentTest extends TestCase
{
    use RefreshDatabase;

    private function payload(array $override = []): array
    {
        $data = array_replace_recursive(LandingContent::defaults(), $override);
        // daftar (list) diganti utuh, bukan digabung per indeks
        foreach (['hero.points', 'about.mission'] as $k) {
            if (data_get($override, $k) !== null) {
                data_set($data, $k, data_get($override, $k));
            }
        }

        return $data;
    }

    public function test_home_uses_default_content(): void
    {
        $this->get('/')->assertInertia(fn (Assert $p) => $p
            ->component('landing')
            ->where('content.hero.title', 'Melayani Perjalanan Ibadah Umrah Anda')
            ->where('content.hero.image', '/images/landing/hero-kaabah.webp')
            ->has('services', 3)
            ->where('rating.count', 0)
            ->has('galleries', 7)); // foto bawaan saat galeri kosong
    }

    public function test_landing_sends_package_and_testimonial_data(): void
    {
        $pkg = \App\Models\Package::create([
            'name' => 'Umrah Hemat 12 Hari', 'slug' => 'umrah-hemat-12', 'type' => 'hemat', 'duration_days' => 12, 'airline' => 'Saudia',
            'hotel_makkah' => 'Hotel Makkah', 'hotel_madinah' => 'Hotel Madinah', 'price_quad' => 28250000, 'price_triple' => 29000000, 'price_double' => 30000000,
            'min_deposit' => 5000000, 'facilities' => ['Makan 3x sehari', 'Visa umrah', 'Muthawwif'], 'is_featured' => true, 'is_active' => true,
        ]);
        \App\Models\Testimonial::create(['name' => 'Siti', 'content' => 'Pelayanan sangat baik.', 'rating' => 5, 'departure_month' => '2026-03', 'package_name' => $pkg->name, 'is_active' => true]);
        \App\Models\Testimonial::create(['name' => 'Budi', 'content' => 'Alhamdulillah lancar.', 'rating' => 4, 'is_active' => true]);
        \App\Models\Testimonial::create(['name' => 'Tersembunyi', 'content' => 'Belum disetujui.', 'rating' => 1, 'is_active' => false]);

        $this->get('/')->assertInertia(fn (Assert $p) => $p
            ->where('packages.0.name', 'Umrah Hemat 12 Hari')
            ->where('packages.0.is_best_seller', true)
            ->where('packages.0.meal', 'Makan 3x sehari')
            ->where('packages.0.facilities', ['Visa umrah', 'Muthawwif'])
            ->where('packages.0.airline_logo', null)
            ->has('testimonials', 2)
            ->where('rating.count', 2)
            ->where('rating.average', 4.5));
    }

    public function test_visitor_can_submit_review_pending_approval(): void
    {
        $this->post(route('testimonials.store'), [
            'name' => 'Ahmad', 'city' => 'Medan', 'rating' => 5, 'departure_month' => '2025-10',
            'package_name' => 'Umrah Reguler', 'content' => 'Pembimbing sabar dan hotel dekat Masjidil Haram.',
        ])->assertSessionHasNoErrors()->assertRedirect();

        $t = \App\Models\Testimonial::sole();
        $this->assertFalse($t->is_active);
        $this->assertSame('2025-10-01', $t->departure_month->toDateString());

        // bot yang mengisi kolom jebakan tidak disimpan
        $this->post(route('testimonials.store'), ['name' => 'Bot', 'rating' => 5, 'content' => str_repeat('spam ', 10), 'website' => 'http://spam.test']);
        $this->assertSame(1, \App\Models\Testimonial::count());
    }

    public function test_admin_can_update_text_and_images(): void
    {
        Storage::fake('public');
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)->post(route('admin.landing.update'), $this->payload([
            'hero' => ['title' => 'Umrah Nyaman Bersama Kami', 'points' => ['Resmi', '', 'Amanah']],
            'about' => ['mission' => ['Misi satu', 'Misi dua']],
            'services' => [1 => ['title' => 'Tiket Pesawat']],
            'packages' => ['count' => 5],
            'files' => [
                'hero' => UploadedFile::fake()->image('hero.jpg', 1600, 900),
                'services' => [2 => UploadedFile::fake()->image('visa.png', 200, 200)],
            ],
        ]))->assertSessionHasNoErrors()->assertRedirect();

        $raw = LandingContent::raw();
        $this->assertSame('Umrah Nyaman Bersama Kami', $raw['hero']['title']);
        $this->assertSame(['Resmi', 'Amanah'], $raw['hero']['points']);
        $this->assertSame(['Misi satu', 'Misi dua'], $raw['about']['mission']);
        $this->assertSame('Tiket Pesawat', $raw['services'][1]['title']);
        $this->assertSame(5, $raw['packages']['count']);
        Storage::disk('public')->assertExists($raw['hero']['image']);
        Storage::disk('public')->assertExists($raw['services'][2]['image']);

        $this->get('/')->assertInertia(fn (Assert $p) => $p
            ->where('content.hero.title', 'Umrah Nyaman Bersama Kami')
            ->where('content.hero.image', Storage::disk('public')->url($raw['hero']['image'])));

        // Kembalikan gambar hero ke bawaan → file unggahan dihapus
        $old = $raw['hero']['image'];
        $this->actingAs($admin)->post(route('admin.landing.update'), $this->payload(['reset' => ['hero.image']]))->assertSessionHasNoErrors();
        $this->assertSame('/images/landing/hero-kaabah.webp', LandingContent::raw()['hero']['image']);
        Storage::disk('public')->assertMissing($old);
    }

    public function test_super_admin_cannot_edit(): void
    {
        $super = User::factory()->admin('super_admin', true)->create();
        $this->actingAs($super)->get(route('admin.landing.edit'))->assertForbidden();
    }
}
