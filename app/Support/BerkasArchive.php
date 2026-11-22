<?php

namespace App\Support;

use App\Models\Document;
use App\Services\FileStorage;
use ZipArchive;

/**
 * Membaca isi berkas ZIP (terenkripsi di penyimpanan) tanpa mengekstrak ke disk permanen.
 * Dipakai admin untuk memeriksa dokumen di dalam berkas visa satu per satu.
 * Berkas RAR tidak bisa dibaca PHP → admin mengunduh lalu mengisi daftar pemeriksaan secara manual.
 */
class BerkasArchive
{
    private const MIME = [
        'jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png', 'webp' => 'image/webp', 'gif' => 'image/gif',
        'pdf' => 'application/pdf', 'txt' => 'text/plain',
    ];

    /** @return array<int, array{name: string, size: int, previewable: bool}>|null  null bila bukan ZIP / tidak terbaca */
    public static function entries(Document $doc): ?array
    {
        return self::open($doc, function (ZipArchive $zip) {
            $out = [];
            for ($i = 0; $i < $zip->numFiles; $i++) {
                $stat = $zip->statIndex($i);
                $name = $stat['name'];
                if (str_ends_with($name, '/') || str_starts_with($name, '__MACOSX/') || str_starts_with(basename($name), '.') || basename($name) === 'Thumbs.db') {
                    continue;
                }
                $out[] = ['name' => $name, 'size' => (int) $stat['size'], 'previewable' => isset(self::MIME[self::ext($name)])];
            }
            usort($out, fn ($a, $b) => strnatcasecmp($a['name'], $b['name']));

            return $out;
        });
    }

    /** @return array{0: string, 1: string}|null  [isi file, mime] */
    public static function read(Document $doc, string $name): ?array
    {
        return self::open($doc, function (ZipArchive $zip) use ($name) {
            $content = $zip->getFromName($name);

            return $content === false ? null : [$content, self::MIME[self::ext($name)] ?? 'application/octet-stream'];
        });
    }

    private static function ext(string $name): string
    {
        return strtolower(pathinfo($name, PATHINFO_EXTENSION));
    }

    private static function open(Document $doc, callable $fn): mixed
    {
        if (! $doc->isZip() || ! class_exists(ZipArchive::class)) {
            return null;
        }
        $tmp = tempnam(sys_get_temp_dir(), 'berkas');
        try {
            file_put_contents($tmp, FileStorage::readPrivate($doc->path, $doc->is_encrypted, $doc->disk));
            $zip = new ZipArchive;
            if ($zip->open($tmp) !== true) {
                return null;
            }
            try {
                return $fn($zip);
            } finally {
                $zip->close();
            }
        } catch (\Throwable) {
            return null;
        } finally {
            @unlink($tmp);
        }
    }
}
