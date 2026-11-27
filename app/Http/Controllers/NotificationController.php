<?php

namespace App\Http\Controllers;

use App\Http\Middleware\MarkNotificationsSeen;
use Illuminate\Http\Request;
use Inertia\Inertia;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $q = $user->notifications();
        if ($c = $request->string('kategori')->toString()) {
            $q->where('data', 'like', '%"category":"'.addcslashes($c, '%_').'"%');
        }

        $page = Inertia::render($user->isAdmin() ? 'Admin/Notifications' : 'Customer/Notifications', [
            // read_at diambil SEBELUM ditandai dibaca → notifikasi baru tetap tampil tersorot di daftar
            'notifications' => $q->paginate(20)->withQueryString()->through(fn ($n) => [
                'id' => $n->id, 'data' => $n->data, 'read_at' => $n->read_at, 'created_at' => $n->created_at->diffForHumans(),
            ]),
            'filter' => $c,
        ]);

        // Pelanggan: membuka daftar notifikasi (lewat lonceng) = sudah melihat semuanya → angka di lonceng hilang.
        // Admin tetap per item: notifikasi hilang saat item yang dimaksud dibuka.
        if (! $user->isAdmin()) {
            $user->unreadNotifications()->update(['read_at' => now()]);
        }

        return $page;
    }

    public function latest(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'unread' => $user->unreadNotifications()->count(),
            'items' => $user->notifications()->take(8)->get()->map(fn ($n) => [
                'id' => $n->id, 'data' => $n->data, 'read_at' => $n->read_at, 'created_at' => $n->created_at->diffForHumans(),
            ]),
        ]);
    }

    public function read(Request $request, string $id)
    {
        $n = $request->user()->notifications()->findOrFail($id);
        $n->markAsRead();
        $url = $n->data['url'] ?? null;

        // Hanya path yang dipakai (domain diabaikan) → selalu ke situs sendiri, aman dari open redirect,
        // dan tetap berfungsi bila domain/HTTPS berubah setelah notifikasi dibuat.
        if ($path = MarkNotificationsSeen::pathOf($url)) {
            $query = parse_url($url, PHP_URL_QUERY);

            return redirect($path.($query ? '?'.$query : ''));
        }

        return back();
    }

    public function readAll(Request $request)
    {
        $request->user()->unreadNotifications->markAsRead();

        return back()->with('success', 'Semua notifikasi ditandai telah dibaca.');
    }
}
