<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->web(append: [
            \App\Http\Middleware\SecurityHeaders::class,
            \App\Http\Middleware\MarkNotificationsSeen::class,
            \App\Http\Middleware\HandleInertiaRequests::class,
            \Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets::class,
        ]);

        $middleware->alias([
            'admin' => \App\Http\Middleware\EnsureAdmin::class,
            'customer' => \App\Http\Middleware\EnsureCustomer::class,
        ]);

        // Sudah login lalu membuka /login atau /register → langsung ke dashboard sesuai peran
        $middleware->redirectUsersTo(fn (\Illuminate\Http\Request $r) => $r->user()?->isAdmin() ? route('admin.dashboard') : route('dashboard'));

        // Webhook dari payment gateway tidak membawa token CSRF (diverifikasi via signature)
        $middleware->validateCsrfTokens(except: ['webhooks/*']);

        // Proxy (load balancer / Cloudflare) agar HTTPS & IP terbaca benar
        $middleware->trustProxies(at: '*');
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // Penolakan aturan bisnis (abort 422) saat mengirim form lewat Inertia → kembali ke halaman
        // dengan pesan merah, bukan halaman error. Contoh: "Masih ada pengajuan yang sedang ditinjau".
        $exceptions->render(function (\Symfony\Component\HttpKernel\Exception\HttpException $e, \Illuminate\Http\Request $request) {
            if ($e->getStatusCode() === 422 && $request->header('X-Inertia') && ! $request->isMethod('GET')) {
                return back()->with('error', $e->getMessage() ?: 'Permintaan tidak dapat diproses.');
            }

            return null;
        });
    })->create();
