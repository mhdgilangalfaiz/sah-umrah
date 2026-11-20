<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

/**
 * Role-based access control panel admin.
 * Pemakaian: ->middleware('admin')                 semua peran admin
 *            ->middleware('admin:finance')         hanya Finance (+ Super Admin)
 *            ->middleware('admin:operasional,cs')  Operasional / CS (+ Super Admin)
 *            ->middleware('admin:primary')         hanya Admin Utama
 */
class EnsureAdmin
{
    public function handle(Request $request, Closure $next, string ...$roles)
    {
        $user = $request->user();
        abort_unless($user && $user->isAdmin() && $user->is_active, 403, 'Akses khusus admin.');

        if (in_array('primary', $roles, true)) {
            abort_unless($user->is_primary_admin, 403, 'Hanya Admin Utama yang dapat mengakses menu ini.');
        } elseif ($roles && ! $user->hasRole(...$roles)) {
            abort(403, 'Peran Anda ('.$user->roleLabel().') tidak memiliki akses ke menu ini.');
        }

        return $next($request);
    }
}
