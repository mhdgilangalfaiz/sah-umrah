<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;

/**
 * Kompres foto unggahan sebelum disimpan (format & nama file tidak berubah):
 *  - sisi terpanjang diperkecil ke maks $maxSide piksel (foto HP 4000px → 1920px),
 *  - JPEG/WebP disimpan ulang dengan kualitas 82, PNG dengan kompresi maksimal (transparansi tetap),
 *  - bila hasilnya tidak lebih kecil, file asli dipakai.
 * GIF/SVG dan file yang gagal dibaca dibiarkan apa adanya.
 */
class ImageOptimizer
{
    public const MAX_SIDE = 1920;

    private const QUALITY = 82;

    public static function optimize(UploadedFile $file, int $maxSide = self::MAX_SIDE): UploadedFile
    {
        $path = $file->getRealPath();
        $mime = $file->getMimeType();
        if (! $path || ! in_array($mime, ['image/jpeg', 'image/png', 'image/webp'], true) || ! function_exists('imagecreatefromstring')) {
            return $file;
        }

        // Foto HP 12MP butuh ±50 MB RAM saat diolah → naikkan batas memori sementara secukupnya (maks 1 GB)
        $info = @getimagesize($path);
        if (! $info) {
            return $file;
        }
        $need = (int) ($info[0] * $info[1] * 5 * 1.8) + 64 * 1024 * 1024;
        if ($need > 1024 ** 3) {
            return $file; // terlalu besar untuk diolah aman → simpan apa adanya
        }
        self::ensureMemory(memory_get_usage() + $need);

        $src = @imagecreatefromstring((string) file_get_contents($path));
        if (! $src) {
            return $file;
        }

        $w = imagesx($src);
        $h = imagesy($src);
        $scale = min(1, $maxSide / max($w, $h));
        $img = $src;
        if ($scale < 1) {
            $nw = (int) round($w * $scale);
            $nh = (int) round($h * $scale);
            $img = imagecreatetruecolor($nw, $nh);
            imagealphablending($img, false);
            imagesavealpha($img, true);
            imagefill($img, 0, 0, imagecolorallocatealpha($img, 0, 0, 0, 127));
            imagecopyresampled($img, $src, 0, 0, 0, 0, $nw, $nh, $w, $h);
            imagedestroy($src); // lepas memori gambar asli
        } elseif ($mime !== 'image/jpeg') {
            imagealphablending($img, false);
            imagesavealpha($img, true);
        }

        ob_start();
        match ($mime) {
            'image/jpeg' => imagejpeg($img, null, self::QUALITY),
            'image/png' => imagepng($img, null, 9),
            'image/webp' => imagewebp($img, null, self::QUALITY),
        };
        $out = (string) ob_get_clean();

        // diperkecil → selalu pakai hasil; ukuran sama → pakai bila lebih hemat
        if ($out !== '' && ($scale < 1 || strlen($out) < filesize($path))) {
            file_put_contents($path, $out);
            clearstatcache(true, $path);
        }

        imagedestroy($img);

        return $file;
    }

    private static function ensureMemory(int $bytes): void
    {
        $limit = (string) ini_get('memory_limit');
        if ($limit === '-1') {
            return;
        }
        $n = (int) $limit;
        $current = match (strtolower(substr($limit, -1))) { 'g' => $n * 1024 ** 3, 'm' => $n * 1024 ** 2, 'k' => $n * 1024, default => $n };
        if ($bytes > $current) {
            @ini_set('memory_limit', (string) min($bytes, 1024 ** 3));
        }
    }
}
