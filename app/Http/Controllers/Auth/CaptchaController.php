<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Support\Captcha;

/** Gambar captcha halaman login — setiap permintaan membuat kode baru. */
class CaptchaController extends Controller
{
    public function __invoke()
    {
        abort_unless(Captcha::enabled(), 404);

        return response(Captcha::image('login'), 200, [
            'Content-Type' => 'image/png',
            'Cache-Control' => 'no-store, no-cache, must-revalidate, max-age=0',
            'Pragma' => 'no-cache',
        ]);
    }
}
