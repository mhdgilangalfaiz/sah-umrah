<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class SecurityHeaders
{
    public function handle(Request $request, Closure $next)
    {
        // Akun yang dinonaktifkan (mis. dari BankAccountGuard) langsung dikeluarkan
        if (($u = $request->user()) && ! $u->is_active) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();

            return redirect()->route('login')->withErrors(['email' => 'Akun Anda dinonaktifkan.']);
        }

        $response = $next($request);

        $response->headers->set('X-Frame-Options', 'SAMEORIGIN');
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->headers->set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
        if (app()->isProduction()) {
            $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        }

        return $response;
    }
}
