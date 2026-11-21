<?php

namespace Tests\Feature;

use App\Models\Gallery;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/** Galeri foto & video: penamaan file mengikuti judul, validasi jenis file, rename & hapus file. */
class GalleryTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        $this->admin = User::factory()->admin()->create();
    }

    public function test_single_photo_is_named_date_and_title_without_number(): void
    {
        $this->travelTo('2026-11-20 10:00');
        $this->actingAs($this->admin)->post(route('admin.galeri.store'), [
            'type' => 'foto', 'title' => 'Kota Malam', 'category' => 'umum',
            'photos' => [UploadedFile::fake()->image('IMG_9999.jpg')],
        ])->assertSessionHasNoErrors();
        Storage::disk('public')->assertExists('galeri/foto/20-11-26-kota-malam.jpg');

        // Judul sama di hari yang sama → diberi nomor, file pertama tidak tertimpa
        $this->post(route('admin.galeri.store'), [
            'type' => 'foto', 'title' => 'Kota Malam', 'category' => 'umum',
            'photos' => [UploadedFile::fake()->image('lain.jpg')],
        ]);
        Storage::disk('public')->assertExists(['galeri/foto/20-11-26-kota-malam.jpg', 'galeri/foto/20-11-26-kota-malam-2.jpg']);

        // Hari lain → tanpa nomor lagi
        $this->travelTo('2026-11-21 08:00');
        $this->post(route('admin.galeri.store'), [
            'type' => 'foto', 'title' => 'Kota Malam', 'category' => 'umum',
            'photos' => [UploadedFile::fake()->image('besok.jpg')],
        ]);
        Storage::disk('public')->assertExists('galeri/foto/21-11-26-kota-malam.jpg');
    }

    public function test_multiple_photos_are_numbered_and_numbering_continues(): void
    {
        $this->travelTo('2026-11-20 10:00');
        $this->actingAs($this->admin)->post(route('admin.galeri.store'), [
            'type' => 'foto', 'title' => 'Mekah', 'category' => 'makkah',
            'photos' => [UploadedFile::fake()->image('IMG_001.jpg'), UploadedFile::fake()->image('IMG_002.png')],
        ])->assertSessionHasNoErrors();

        Storage::disk('public')->assertExists(['galeri/foto/20-11-26-mekah-1.jpg', 'galeri/foto/20-11-26-mekah-2.png']);
        $this->assertSame(2, Gallery::where('type', 'foto')->where('title', 'Mekah')->count());

        $this->post(route('admin.galeri.store'), [
            'type' => 'foto', 'title' => 'Mekah', 'category' => 'makkah',
            'photos' => [UploadedFile::fake()->image('x.jpg')],
        ])->assertSessionHasNoErrors();
        Storage::disk('public')->assertExists('galeri/foto/20-11-26-mekah-3.jpg');
    }

    public function test_video_is_stored_in_video_folder(): void
    {
        $this->travelTo('2026-11-20 10:00');
        $this->actingAs($this->admin)->post(route('admin.galeri.store'), [
            'type' => 'video', 'title' => 'Manasik Akbar', 'category' => 'manasik',
            'video' => UploadedFile::fake()->create('rekaman.mp4', 500, 'video/mp4'),
        ])->assertSessionHasNoErrors();

        Storage::disk('public')->assertExists('galeri/video/20-11-26-manasik-akbar.mp4');
        $this->assertSame('video', Gallery::first()->type);
    }

    public function test_type_restricts_file_kind(): void
    {
        $this->actingAs($this->admin);
        $this->post(route('admin.galeri.store'), [
            'type' => 'foto', 'title' => 'Salah', 'category' => 'umum',
            'photos' => [UploadedFile::fake()->create('film.mp4', 100, 'video/mp4')],
        ])->assertSessionHasErrors('photos.0');

        $this->post(route('admin.galeri.store'), [
            'type' => 'video', 'title' => 'Salah', 'category' => 'umum',
            'video' => UploadedFile::fake()->image('foto.jpg'),
        ])->assertSessionHasErrors('video');

        $this->assertSame(0, Gallery::count());
    }

    public function test_title_change_renames_file_keeping_upload_date_and_delete_removes_it(): void
    {
        $this->travelTo('2026-11-20 10:00');
        $this->actingAs($this->admin)->post(route('admin.galeri.store'), [
            'type' => 'foto', 'title' => 'Mekah', 'category' => 'makkah',
            'photos' => [UploadedFile::fake()->image('a.jpg')],
        ]);
        $item = Gallery::first();

        $this->travelTo('2026-11-25 10:00'); // diubah beberapa hari kemudian → tanggal masuk tetap 20-11-26
        $this->post(route('admin.galeri.update', $item), ['title' => 'Masjidil Haram', 'category' => 'makkah'])->assertSessionHasNoErrors();
        $item->refresh();
        $this->assertSame('galeri/foto/20-11-26-masjidil-haram.jpg', $item->image);
        Storage::disk('public')->assertMissing('galeri/foto/20-11-26-mekah.jpg');

        $this->delete(route('admin.galeri.destroy', $item));
        Storage::disk('public')->assertMissing('galeri/foto/20-11-26-masjidil-haram.jpg');
        $this->assertSame(0, Gallery::count());
    }

    public function test_admin_page_and_home_receive_gallery_types(): void
    {
        Gallery::create(['title' => 'Mekah', 'type' => 'foto', 'image' => 'galeri/foto/mekah-1.jpg', 'category' => 'makkah']);
        Gallery::create(['title' => 'Manasik', 'type' => 'video', 'image' => 'galeri/video/manasik-1.mp4', 'category' => 'manasik']);

        $this->actingAs($this->admin)->get(route('admin.galeri.index', ['jenis' => 'video']))->assertOk()
            ->assertInertia(fn ($p) => $p->component('Admin/Gallery')->where('filter', 'video')->has('items.data', 1)->has('limits.file'));

        $this->get('/')->assertOk()
            // Landing hanya menampilkan foto
            ->assertInertia(fn ($p) => $p->component('landing')->has('galleries', 1)->where('galleries.0.title', 'Mekah'));
    }

    public function test_super_admin_cannot_manage_gallery(): void
    {
        $this->actingAs(User::factory()->admin('super_admin', true)->create())
            ->get(route('admin.galeri.index'))->assertForbidden();
    }
}
