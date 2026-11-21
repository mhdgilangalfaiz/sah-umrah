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
        $to = redirect()->intended($default)->getTargetUrl();

        return AuthScreen::success($request, 'login', $to);
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
