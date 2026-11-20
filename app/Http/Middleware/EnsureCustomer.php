<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

/**
 * Area pelanggan:
 *  - admin diarahkan ke panel admin
 *  - akun nonaktif dikeluarkan
 *  - akun Google yang belum melengkapi profil diarahkan ke form profil
 *  - parameter "strict": SEMUA pelanggan wajib profil lengkap (dipakai saat checkout)
 */
class EnsureCustomer
{
    public function handle(Request $request, Closure $next, ?string $mode = null)
    {
        $user = $request->user();

        if ($user->isAdmin()) {
            return redirect()->route('admin.dashboard');
        }

        $mustComplete = $mode === 'strict' ? is_null($user->profile_completed_at) : ($user->google_id && is_null($user->profile_completed_at));
        if ($mustComplete) {
            session()->put('url.intended', $request->fullUrl());

            return redirect()->route('profile.complete')->with('error', 'Mohon lengkapi data profil Anda terlebih dahulu.');
        }

        return $next($request);
    }
}
