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
            ->component('Public/Home')
            ->where('content.hero.title', 'Melayani Perjalanan Ibadah Umrah Anda')
            ->where('content.hero.image', '/images/landing/hero-kaabah.jpg'));
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
        $this->assertSame('/images/landing/hero-kaabah.jpg', LandingContent::raw()['hero']['image']);
        Storage::disk('public')->assertMissing($old);
    }

    public function test_super_admin_cannot_edit(): void
    {
        $super = User::factory()->admin('super_admin', true)->create();
        $this->actingAs($super)->get(route('admin.landing.edit'))->assertForbidden();
    }
}
