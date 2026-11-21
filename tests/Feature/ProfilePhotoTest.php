<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ProfilePhotoTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_upload_replace_and_remove_profile_photo(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();

        $this->actingAs($user)->post(route('profile.photo.update'), ['photo' => UploadedFile::fake()->image('saya.jpg', 800, 600)])
            ->assertSessionHasNoErrors()->assertRedirect();
        $first = $user->fresh()->avatar;
        $this->assertStringStartsWith('avatars/', $first);
        Storage::disk('public')->assertExists($first);
        // dipotong persegi 400×400
        [$w, $h] = getimagesizefromstring(Storage::disk('public')->get($first));
        $this->assertSame([400, 400], [$w, $h]);

        // ganti: file lama dihapus
        $this->actingAs($user)->post(route('profile.photo.update'), ['photo' => UploadedFile::fake()->image('baru.png', 300, 300)]);
        Storage::disk('public')->assertMissing($first);

        // URL foto dikirim ke halaman
        $this->actingAs($user)->get('/profile')->assertInertia(fn ($p) => $p->where('auth.user.avatar', Storage::disk('public')->url($user->fresh()->avatar)));

        $this->actingAs($user)->delete(route('profile.photo.destroy'))->assertRedirect();
        $this->assertNull($user->fresh()->avatar);
    }

    public function test_photo_must_be_an_image(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)->post(route('profile.photo.update'), ['photo' => UploadedFile::fake()->create('cv.pdf', 100, 'application/pdf')])
            ->assertSessionHasErrors('photo');
        $this->assertNull($user->fresh()->avatar);
    }
}
