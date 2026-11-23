<?php

namespace Tests\Feature;

use App\Models\Setting;
use App\Models\User;
use App\Services\FileStorage;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class GalleryAudioAndCompressionTest extends TestCase
{
    use RefreshDatabase;

    public function test_gallery_audio_upload_replace_link_and_remove(): void
    {
        Storage::fake('public');
        $admin = User::factory()->admin()->create();

        $this->get('/')->assertInertia(fn (Assert $p) => $p->where('galleryAudio', null));

        $this->actingAs($admin)->post(route('admin.galeri.audio.update'), [
            'audio' => UploadedFile::fake()->create('talbiyah.mp3', 300, 'audio/mpeg'), 'title' => 'Talbiyah',
        ])->assertSessionHasNoErrors();
        $file = Setting::get('gallery_audio');
        Storage::disk('public')->assertExists($file);
        $this->get('/')->assertInertia(fn (Assert $p) => $p->where('galleryAudio.title', 'Talbiyah')->where('galleryAudio.url', asset('storage/'.$file)));

        // ganti ke link → file lama terhapus
        $this->actingAs($admin)->post(route('admin.galeri.audio.update'), ['url' => 'https://cdn.example.com/suasana.mp3'])->assertSessionHasNoErrors();
        Storage::disk('public')->assertMissing($file);
        $this->assertSame('https://cdn.example.com/suasana.mp3', Setting::get('gallery_audio'));

        // link YouTube & bukan audio ditolak
        $this->actingAs($admin)->post(route('admin.galeri.audio.update'), ['url' => 'https://youtu.be/abc'])->assertSessionHasErrors('url');
        $this->actingAs($admin)->post(route('admin.galeri.audio.update'), ['audio' => UploadedFile::fake()->create('x.pdf', 10, 'application/pdf')])->assertSessionHasErrors('audio');

        $this->actingAs($admin)->delete(route('admin.galeri.audio.destroy'))->assertRedirect();
        $this->get('/')->assertInertia(fn (Assert $p) => $p->where('galleryAudio', null));
    }

    public function test_large_photos_are_resized_on_upload(): void
    {
        Storage::fake('public');
        $path = FileStorage::storePublic(UploadedFile::fake()->image('besar.jpg', 4000, 3000), 'media', 'foto besar');
        [$w, $h] = getimagesizefromstring(Storage::disk('public')->get($path));
        $this->assertSame([1920, 1440], [$w, $h]);

        // foto kecil tidak diperbesar
        $small = FileStorage::storePublic(UploadedFile::fake()->image('kecil.png', 300, 200), 'media', 'foto kecil');
        $this->assertSame([300, 200], array_slice(getimagesizefromstring(Storage::disk('public')->get($small)), 0, 2));
    }
}
