<?php

namespace App\Services;

use Carbon\CarbonInterface;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Penyimpanan file galeri dengan nama "{tgl-bln-thn}-{judul}":
 *   1 foto "Kota Malam" tgl 20-11-26   → galeri/foto/20-11-26-kota-malam.jpg
 *   2 foto "Mekah" sekaligus           → 20-11-26-mekah-1.jpg, 20-11-26-mekah-2.jpg
 *   nama sudah dipakai di hari itu     → nomor melanjutkan (-2, -3, …), file lama tidak tertimpa
 *   video                              → galeri/video/20-11-26-manasik.mp4
 * Tanggal = kapan file masuk; saat judul diubah, tanggal awal dipertahankan.
 */
class GalleryMedia
{
    public const DISK = 'public';

    public static function folder(string $type): string
    {
        return $type === 'video' ? 'galeri/video' : 'galeri/foto';
    }

    /** "20-11-26-kota-malam" */
    public static function baseName(string $title, ?CarbonInterface $date = null): string
    {
        return ($date ?? now())->format('d-m-y').'-'.(Str::slug($title) ?: 'galeri');
    }

    /**
     * Nomor terbesar yang sudah dipakai untuk base di folder.
     * "base.jpg" (tanpa nomor) dihitung sebagai 1. Mengembalikan 0 bila belum ada sama sekali.
     */
    public static function usedNumber(string $folder, string $base): int
    {
        $max = 0;
        foreach (Storage::disk(self::DISK)->files($folder) as $file) {
            if (preg_match('/^'.preg_quote($base, '/').'(?:-(\d+))?\.[a-z0-9]+$/i', basename($file), $m)) {
                $max = max($max, isset($m[1]) ? (int) $m[1] : 1);
            }
        }

        return $max;
    }

    public static function extension(UploadedFile $file, string $type): string
    {
        $ext = strtolower($file->extension() ?: $file->getClientOriginalExtension());
        if ($type === 'foto') {
            return $ext === 'jpeg' ? 'jpg' : $ext;
        }

        return match ($ext) { 'qt', 'mov' => 'mov', default => $ext ?: 'mp4' };
    }

    /**
     * Nama file berikutnya yang tersedia.
     * $numbered = true untuk unggahan banyak foto sekaligus (selalu bernomor -1, -2, …).
     */
    public static function nextName(string $folder, string $base, string $ext, bool $numbered = false): string
    {
        $used = self::usedNumber($folder, $base);
        if (! $numbered && $used === 0) {
            return "$base.$ext";
        }

        return $base.'-'.($used + 1).".$ext";
    }

    public static function store(UploadedFile $file, string $type, string $title, bool $numbered = false, ?CarbonInterface $date = null): string
    {
        $folder = self::folder($type);
        $name = self::nextName($folder, self::baseName($title, $date), self::extension($file, $type), $numbered);

        return $file->storeAs($folder, $name, self::DISK);
    }

    /** Judul berubah → ganti nama file agar tetap "{tanggal masuk}-{judul baru}". Mengembalikan path baru. */
    public static function renameForTitle(string $path, string $type, string $title, CarbonInterface $date, bool $numbered = false): string
    {
        $base = self::baseName($title, $date);
        $folder = self::folder($type);
        if (dirname($path) === $folder && preg_match('/^'.preg_quote($base, '/').'(-\d+)?\./i', basename($path))) {
            return $path; // sudah sesuai
        }
        $disk = Storage::disk(self::DISK);
        if (! $disk->exists($path)) {
            return $path;
        }
        $new = $folder.'/'.self::nextName($folder, $base, strtolower(pathinfo($path, PATHINFO_EXTENSION)), $numbered);
        $disk->move($path, $new);

        return $new;
    }

    public static function delete(?string $path): void
    {
        if ($path && ! str_starts_with($path, 'http')) {
            Storage::disk(self::DISK)->delete($path);
        }
    }

    /** Batas upload server (byte) — dikirim ke halaman admin agar ukuran bisa dicek sebelum mengunggah */
    public static function limits(): array
    {
        $toBytes = function (string $v): int {
            $v = trim($v);
            $n = (int) $v;

            return match (strtolower(substr($v, -1))) {
                'g' => $n * 1024 ** 3, 'm' => $n * 1024 ** 2, 'k' => $n * 1024, default => $n,
            };
        };

        return [
            'file' => $toBytes((string) ini_get('upload_max_filesize')),
            'post' => $toBytes((string) ini_get('post_max_size')),
            'files' => (int) ini_get('max_file_uploads') ?: 20,
        ];
    }
}
