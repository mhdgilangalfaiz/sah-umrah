<?php

namespace App\Support;

use Illuminate\Support\Str;

/**
 * Captcha gambar sederhana tanpa layanan pihak ketiga.
 * Kode disimpan (di-hash) di session dan hanya berlaku sekali pakai.
 * Gambar berupa PNG berderau (bukan teks/SVG) agar tidak mudah dibaca bot.
 */
class Captcha
{
    private const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // tanpa 0/O, 1/I yang membingungkan

    private const LENGTH = 5;

    public static function enabled(): bool
    {
        return (bool) config('auth.login.captcha', true);
    }

    private static function key(string $name): string
    {
        return 'captcha.'.$name;
    }

    private static function hash(string $code): string
    {
        return hash_hmac('sha256', Str::upper(trim($code)), (string) config('app.key'));
    }

    /** Buat kode baru, simpan di session, kembalikan PNG */
    public static function image(string $name = 'login'): string
    {
        $code = '';
        for ($i = 0; $i < self::LENGTH; $i++) {
            $code .= self::CHARS[random_int(0, strlen(self::CHARS) - 1)];
        }
        session()->put(self::key($name), self::hash($code));

        return self::render($code);
    }

    /** Cocokkan isian pengguna. Kode langsung hangus setelah dicek (benar atau salah). */
    public static function check(?string $input, string $name = 'login'): bool
    {
        $expected = session()->pull(self::key($name));

        return $expected && $input && hash_equals($expected, self::hash($input));
    }

    /** Hanya untuk test otomatis */
    public static function fake(string $code, string $name = 'login'): array
    {
        return [self::key($name) => self::hash($code)];
    }

    private static function render(string $code): string
    {
        $w = 180;
        $h = 56;
        $img = imagecreatetruecolor($w, $h);
        imagefill($img, 0, 0, imagecolorallocate($img, 241, 248, 236));

        // derau latar: titik & garis
        for ($i = 0; $i < 260; $i++) {
            $c = imagecolorallocate($img, random_int(150, 220), random_int(160, 220), random_int(150, 210));
            imagesetpixel($img, random_int(0, $w - 1), random_int(0, $h - 1), $c);
        }
        for ($i = 0; $i < 5; $i++) {
            $c = imagecolorallocate($img, random_int(120, 190), random_int(140, 200), random_int(120, 180));
            imageline($img, random_int(0, $w), random_int(0, $h), random_int(0, $w), random_int(0, $h), $c);
        }

        // setiap huruf: digambar hitam di atas putih, diperbesar & diputar acak,
        // lalu hanya piksel hurufnya yang disalin ke gambar utama (latar tidak ikut)
        $x = 10;
        foreach (str_split($code) as $ch) {
            $glyph = imagecreatetruecolor(10, 16);
            imagefill($glyph, 0, 0, imagecolorallocate($glyph, 255, 255, 255));
            imagechar($glyph, 5, 1, 0, $ch, imagecolorallocate($glyph, 0, 0, 0));

            $size = random_int(24, 30);
            $big = imagecreatetruecolor($size, (int) ($size * 1.5));
            $white = imagecolorallocate($big, 255, 255, 255);
            imagefill($big, 0, 0, $white);
            imagecopyresized($big, $glyph, 0, 0, 0, 0, $size, (int) ($size * 1.5), 10, 16);
            $rot = imagerotate($big, random_int(-22, 22), $white);

            $ink = imagecolorallocate($img, random_int(0, 40), random_int(60, 110), random_int(20, 60));
            $rw = imagesx($rot);
            $rh = imagesy($rot);
            $y = random_int(0, max(0, $h - $rh));
            for ($ix = 0; $ix < $rw; $ix++) {
                for ($iy = 0; $iy < $rh; $iy++) {
                    $rgb = imagecolorat($rot, $ix, $iy);
                    if ((($rgb >> 16) & 0xFF) < 128 && $x + $ix < $w && $y + $iy < $h) {
                        imagesetpixel($img, $x + $ix, $y + $iy, $ink);
                    }
                }
            }
            $x += $size + random_int(0, 4);
        }

        // garis pengganggu di atas huruf
        for ($i = 0; $i < 2; $i++) {
            $c = imagecolorallocate($img, random_int(20, 80), random_int(80, 120), random_int(40, 80));
            imagesetthickness($img, 2);
            imageline($img, 0, random_int(10, $h - 10), $w, random_int(10, $h - 10), $c);
        }

        ob_start();
        imagepng($img);

        return (string) ob_get_clean();
    }
}
