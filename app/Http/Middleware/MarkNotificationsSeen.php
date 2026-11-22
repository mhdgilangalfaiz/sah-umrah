<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Notifikasi dianggap dibaca hanya saat item yang dituju benar-benar dibuka:
 *  - detail pesanan/visa/tiket → path detail, mis. /admin/pesanan-tiket/SAH-T-1
 *  - item tanpa halaman detail (pembayaran, refund, dokumen) → halaman daftar yang difilter ke item itu,
 *    mis. /admin/pembayaran?q=PAY-123. Membuka menu daftarnya saja (tanpa ?q=) TIDAK menghapus notifikasi.
 * Lonceng & badge menu sidebar memakai sumber yang sama, sehingga keduanya selalu berkurang bersamaan.
 */
class MarkNotificationsSeen
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && $request->isMethod('GET') && ! $request->wantsJson()) {
            $here = self::target('/'.ltrim($request->path(), '/').(($q = $request->query('q')) && is_string($q) ? '?q='.$q : ''));
            $ids = $user->unreadNotifications()->get(['id', 'data'])
                ->filter(fn ($n) => ($t = self::target($n->data['url'] ?? null)) !== null && $t === $here)
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

    /** Identitas item tujuan: path + parameter q (bila ada), mis. "/admin/pembayaran?q=PAY-1" */
    public static function target(?string $url): ?string
    {
        $path = self::pathOf($url);
        if ($path === null) return null;
        parse_str((string) parse_url($url, PHP_URL_QUERY), $query);
        $q = isset($query['q']) && is_string($query['q']) && $query['q'] !== '' ? strtolower($query['q']) : null;

        return $q ? "$path?q=$q" : $path;
    }
}
