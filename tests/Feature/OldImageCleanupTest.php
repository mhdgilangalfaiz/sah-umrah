<?php

namespace Tests\Feature;

use App\Models\Package;
use App\Models\Testimonial;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/** Gambar lama yang diganti / dibuang harus ikut terhapus dari penyimpanan. */
class OldImageCleanupTest extends TestCase
{
    use RefreshDatabase;

    public function test_crud_image_replaced_or_deleted_removes_old_file(): void
    {
        Storage::fake('public');
        $admin = User::factory()->admin()->create();
        $base = ['name' => 'Siti', 'content' => 'Pelayanan sangat baik.', 'rating' => 5, 'is_active' => 1];

        $this->actingAs($admin)->post(route('admin.crud.store', 'testimoni'), $base + ['photo' => UploadedFile::fake()->image('a.jpg')]);
        $t = Testimonial::sole();
        $old = $t->photo;
        Storage::disk('public')->assertExists($old);

        // ubah tanpa foto baru → foto tetap
        $this->actingAs($admin)->post(route('admin.crud.update', ['testimoni', $t->id]), $base + ['name' => 'Siti A.']);
        Storage::disk('public')->assertExists($old);

        // ganti foto → foto lama terhapus
        $this->actingAs($admin)->post(route('admin.crud.update', ['testimoni', $t->id]), $base + ['photo' => UploadedFile::fake()->image('b.jpg')]);
        Storage::disk('public')->assertMissing($old);
        $new = $t->fresh()->photo;
        Storage::disk('public')->assertExists($new);

        // hapus data → foto ikut terhapus
        $this->actingAs($admin)->delete(route('admin.crud.destroy', ['testimoni', $t->id]));
        Storage::disk('public')->assertMissing($new);
    }

    public function test_package_cover_and_removed_gallery_files_are_deleted(): void
    {
        Storage::fake('public');
        $admin = User::factory()->admin()->create();
        $package = Package::create([
            'name' => 'Umrah Uji', 'slug' => 'umrah-uji', 'type' => 'hemat', 'duration_days' => 12, 'airline' => 'Saudia',
            'departure_city' => 'Medan', 'hotel_makkah' => 'A', 'hotel_makkah_star' => 5, 'hotel_madinah' => 'B', 'hotel_madinah_star' => 4, 'price_quad' => 1, 'price_triple' => 1, 'price_double' => 1, 'min_deposit' => 1, 'is_active' => true,
        ]);
        $form = fn (array $extra) => array_merge($package->only('name', 'type', 'duration_days', 'airline', 'departure_city', 'hotel_makkah', 'hotel_makkah_star', 'hotel_madinah', 'hotel_madinah_star', 'price_quad', 'price_triple', 'price_double', 'min_deposit'), ['is_active' => 1], $extra);

        $this->actingAs($admin)->put(route('admin.packages.update', $package), $form([
            'cover' => UploadedFile::fake()->image('c1.jpg'),
            'gallery_new' => [UploadedFile::fake()->image('g1.jpg'), UploadedFile::fake()->image('g2.jpg')],
        ]))->assertSessionHasNoErrors();
        $package->refresh();
        [$cover, [$g1, $g2]] = [$package->cover_image, $package->gallery];

        // ganti cover, simpan g2 saja
        $this->actingAs($admin)->put(route('admin.packages.update', $package), $form([
            'cover' => UploadedFile::fake()->image('c2.jpg'), 'gallery_keep' => [$g2],
        ]))->assertSessionHasNoErrors();

        Storage::disk('public')->assertMissing([$cover, $g1]);
        Storage::disk('public')->assertExists([$package->fresh()->cover_image, $g2]);
    }
}
