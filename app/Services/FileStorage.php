<?php

namespace App\Services;

use App\Models\Document;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Penyimpanan file privat + aturan penamaan:
 *  - File milik pelanggan  → "{jenis}_{nama}.ext"   mis. berkas_jaya.pdf, foto_profil_jaya.jpg
 *  - File dari admin       → "{dd-mm-yy}-{jenis}.ext" mis. 02-03-26-bukti-bayar.jpg (tanpa kata "admin")
 * Konten dokumen sensitif dienkripsi (AES-256 via APP_KEY) sebelum disimpan, diunduh hanya lewat signed URL.
 */
class FileStorage
{
    public static function disk(): string
    {
        return config('filesystems.private_disk', 'local');
    }

    public static function nameFor(User $actor, string $label, string $ext, ?User $owner = null): string
    {
        $label = Str::slug($label, $actor->isAdmin() ? '-' : '_');
        $ext = strtolower($ext);
        if ($actor->isAdmin()) {
            return now()->format('d-m-y').'-'.$label.'.'.$ext;
        }
        $owner ??= $actor;

        return $label.'_'.$owner->fileSlug().'.'.$ext;
    }

    /** Pastikan nama unik di folder: berkas_jaya.pdf → berkas_jaya_2.pdf */
    private static function uniquePath(string $disk, string $dir, string $name): string
    {
        $base = pathinfo($name, PATHINFO_FILENAME);
        $ext = pathinfo($name, PATHINFO_EXTENSION);
        $path = "$dir/$name";
        $i = 2;
        while (Storage::disk($disk)->exists($path)) {
            $path = "$dir/{$base}_{$i}.{$ext}";
            $i++;
        }

        return $path;
    }

    /** Simpan dokumen privat (terenkripsi) dan buat record Document */
    public static function storeDocument(UploadedFile $file, User $owner, string $type, array $attrs = [], ?User $actor = null): Document
    {
        $actor ??= auth()->user() ?? $owner;
        $disk = self::disk();
        $ext = $file->getClientOriginalExtension() ?: $file->extension();
        $label = match ($type) {
            'berkas_visa' => 'berkas_visa',
            'foto' => 'foto',
            default => $type,
        };
        $name = self::nameFor($actor, $label, $ext, $owner);
        $path = self::uniquePath($disk, 'documents/'.$owner->id, $name);

        Storage::disk($disk)->put($path, Crypt::encrypt(file_get_contents($file->getRealPath()), false));

        return Document::create(array_merge([
            'user_id' => $owner->id,
            'type' => $type,
            'original_name' => substr($file->getClientOriginalName(), 0, 200),
            'file_name' => basename($path),
            'disk' => $disk,
            'path' => $path,
            'mime' => $file->getMimeType(),
            'size' => $file->getSize(),
            'is_encrypted' => true,
            'status' => $actor->isAdmin() ? 'diverifikasi' : 'menunggu',
            'uploaded_by' => $actor->id,
        ], $attrs));
    }

    /** Simpan file privat biasa (bukti refund, bukti transfer) — terenkripsi, mengembalikan path */
    public static function storePrivate(UploadedFile $file, string $folder, string $label, ?User $actor = null, ?User $owner = null): string
    {
        $actor ??= auth()->user();
        $disk = self::disk();
        $name = self::nameFor($actor, $label, $file->getClientOriginalExtension() ?: 'bin', $owner);
        $path = self::uniquePath($disk, $folder, $name);
        Storage::disk($disk)->put($path, Crypt::encrypt(file_get_contents($file->getRealPath()), false));

        return $path;
    }

    public static function readPrivate(string $path, bool $encrypted = true, ?string $disk = null): string
    {
        $raw = Storage::disk($disk ?? self::disk())->get($path);

        return $encrypted ? Crypt::decrypt($raw, false) : $raw;
    }

    /** Media publik (foto paket, galeri, blog) — tidak dienkripsi */
    public static function storePublic(UploadedFile $file, string $folder, string $label): string
    {
        $name = now()->format('d-m-y').'-'.Str::slug($label).'-'.Str::lower(Str::random(4)).'.'.strtolower($file->getClientOriginalExtension());

        return $file->storeAs($folder, $name, 'public');
    }
}
