<?php

namespace App\Http\Controllers;

use App\Support\Audit;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Foto profil pengguna. Unggahan dipotong persegi di tengah, diperkecil ke 400×400, disimpan WebP
 * di disk public (avatars/). Foto lama hasil unggahan dihapus; URL foto Google tidak disentuh.
 */
class ProfilePhotoController extends Controller
{
    private const SIZE = 400;

    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'photo' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120', 'dimensions:min_width=100,min_height=100'],
        ], [
            'photo.required' => 'Pilih foto terlebih dahulu.',
            'photo.image' => 'File harus berupa gambar.',
            'photo.mimes' => 'Format foto harus JPG, PNG, atau WebP.',
            'photo.max' => 'Ukuran foto maksimal 5 MB.',
            'photo.dimensions' => 'Foto minimal 100×100 piksel.',
        ]);

        $src = @imagecreatefromstring((string) file_get_contents($request->file('photo')->getRealPath()));
        if (! $src) {
            throw ValidationException::withMessages(['photo' => 'Foto tidak dapat dibaca. Coba file lain.']);
        }

        // potong persegi di tengah lalu perkecil
        $w = imagesx($src); $h = imagesy($src); $side = min($w, $h);
        $out = imagecreatetruecolor(self::SIZE, self::SIZE);
        imagecopyresampled($out, $src, 0, 0, (int) (($w - $side) / 2), (int) (($h - $side) / 2), self::SIZE, self::SIZE, $side, $side);
        ob_start();
        imagewebp($out, null, 85);
        $binary = (string) ob_get_clean();

        $user = $request->user();
        $path = 'avatars/'.$user->id.'-'.Str::random(10).'.webp';
        Storage::disk('public')->put($path, $binary);
        $this->deleteUploaded($user->avatar);
        $user->forceFill(['avatar' => $path])->save();
        Audit::log('akun.foto_ubah', 'Mengganti foto profil', $user);

        return back()->with('success', 'Foto profil diperbarui.');
    }

    public function destroy(Request $request): RedirectResponse
    {
        $user = $request->user();
        $this->deleteUploaded($user->avatar);
        $user->forceFill(['avatar' => null])->save();

        return back()->with('success', 'Foto profil dihapus.');
    }

    private function deleteUploaded(?string $avatar): void
    {
        if ($avatar && ! Str::startsWith($avatar, ['http://', 'https://'])) {
            Storage::disk('public')->delete($avatar);
        }
    }
}
