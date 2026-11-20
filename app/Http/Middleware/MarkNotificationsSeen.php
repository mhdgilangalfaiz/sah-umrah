<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Saat pengguna membuka halaman yang dituju sebuah notifikasi (mis. detail pesanan tiket),
 * notifikasi itu otomatis dianggap sudah dibaca — baik dibuka lewat lonceng maupun lewat menu.
 * Dengan begitu penanda angka di lonceng & menu admin berkurang setelah item benar-benar dilihat.
 */
class MarkNotificationsSeen
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && $request->isMethod('GET') && ! $request->wantsJson()) {
            $path = '/'.ltrim($request->path(), '/');
            $ids = $user->unreadNotifications()->get(['id', 'data'])
                ->filter(fn ($n) => self::pathOf($n->data['url'] ?? null) === $path)
                ->pluck('id');

            if ($ids->isNotEmpty()) {
                $user->unreadNotifications()->whereIn('id', $ids)->update(['read_at' => now()]);
            }
        }

        return $next($request);
    }

    /** "http://sah-umrah.test/admin/pesanan-tiket/SAH-T-1?x=1" → "/admin/pesanan-tiket/SAH-T-1" */
    public static function pathOf(?string $url): ?string
    {
        if (! $url) return null;
        $path = parse_url($url, PHP_URL_PATH);

        return $path === null || $path === false ? null : '/'.trim($path, '/');
    }
}
