<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Support\Audit;
use App\Support\AuthScreen;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Response;

class AuthenticatedSessionController extends Controller
{
    public function create(): Response
    {
        return AuthScreen::render('login');
    }

    public function store(LoginRequest $request): Response|RedirectResponse
    {
        $request->authenticate();
        $request->session()->regenerate();

        $user = $request->user();
        $user->forceFill(['last_login_at' => now(), 'last_login_ip' => $request->ip()])->save();
        Audit::log('auth.login', 'Login berhasil', $user);

        $default = route($user->isAdmin() ? 'admin.dashboard' : 'dashboard', absolute: false);
        $intended = $request->session()->pull('url.intended');
        $to = url($intended && $this->canOpen($user, $intended) ? $intended : $default);

        return AuthScreen::success($request, 'login', $to);
    }

    /**
     * Halaman yang ingin dibuka sebelum login hanya dipakai bila akun ini berhak membukanya.
     * Contoh: sesi Super Admin habis di /admin/log-aktivitas lalu yang login Admin → ke dashboard, bukan 403.
     */
    private function canOpen($user, string $url): bool
    {
        try {
            $route = app('router')->getRoutes()->match(Request::create($url));
        } catch (\Throwable) {
            return false;
        }
        $middleware = $route->gatherMiddleware();
        $isAdminArea = collect($middleware)->contains(fn ($m) => $m === 'admin' || str_starts_with($m, 'admin:'));

        // admin tidak diarahkan ke area pelanggan, pelanggan tidak ke panel admin
        if ($isAdminArea !== $user->isAdmin() && ($isAdminArea || collect($middleware)->contains(fn ($m) => str_starts_with($m, 'customer')))) {
            return false;
        }
        foreach ($middleware as $m) {
            if (str_starts_with($m, 'admin:') && ! $user->hasRole(...explode(',', substr($m, 6)))) {
                return false;
            }
        }

        return true;
    }

    public function destroy(Request $request): RedirectResponse
    {
        if ($request->user()) {
            Audit::log('auth.logout', 'Logout', $request->user());
        }
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }
}
