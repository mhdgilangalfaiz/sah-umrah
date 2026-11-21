<?php

namespace App\Support;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Halaman Login & Registrasi memakai satu komponen React (Auth/AuthScreen, mode login|register).
 * Setelah login/daftar berhasil lewat Inertia, server TIDAK langsung redirect: halaman dirender ulang
 * dengan prop "redirectTo" agar animasi pesawat terbang sempat tampil, lalu klien pindah sendiri.
 */
class AuthScreen
{
    public static function render(string $mode, array $extra = []): Response
    {
        return Inertia::render('Auth/AuthScreen', [
            'mode' => $mode,
            'status' => session('status'),
            'canResetPassword' => Route::has('password.request'),
            'captchaEnabled' => Captcha::enabled(),
            'slides' => [
                [
                    'title' => ['Mulai Perjalanan', 'Ibadah Anda', 'Bersama SAH'],
                    'subtitle' => 'Layanan umrah terpercaya, aman, dan profesional.',
                    'image' => '/images/landing/hero-kaabah.webp',
                ],
                [
                    'title' => ['Wujudkan Umrah', 'Impian Keluarga', 'Bersama SAH'],
                    'subtitle' => 'Pembimbing berpengalaman, hotel dekat Masjidil Haram, pembayaran aman.',
                    'image' => '/images/landing/galeri-1.webp',
                ],
            ],
            ...$extra,
        ]);
    }

    /** Respons sukses: Inertia → render dengan redirectTo; request biasa → redirect seperti biasa. */
    public static function success(Request $request, string $mode, string $to)
    {
        if ($request->header('X-Inertia')) {
            return self::render($mode, ['redirectTo' => $to]);
        }

        return redirect($to);
    }
}
