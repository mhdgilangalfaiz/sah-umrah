<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

/**
 * Role-based access control panel admin.
 * Pemakaian: ->middleware('admin')                    Admin & Super Admin
 *            ->middleware('admin:admin')              hanya Admin (kelola website)
 *            ->middleware('admin:admin,super_admin')  lihat pesanan & laporan
 *            ->middleware('admin:super_admin')        hanya Super Admin (akun admin)
 */
class EnsureAdmin
{
    public function handle(Request $request, Closure $next, string ...$roles)
    {
        $user = $request->user();
        abort_unless($user && $user->isAdmin() && $user->is_active, 403, 'Akses khusus admin.');

        if ($roles && ! $user->hasRole(...$roles)) {
            abort(403, 'Peran Anda ('.$user->roleLabel().') tidak memiliki akses ke menu ini.');
        }

        return $next($request);
    }
}
