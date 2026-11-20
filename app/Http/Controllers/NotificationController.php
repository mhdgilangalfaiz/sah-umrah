<?php

namespace App\Http\Controllers;

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

        return Inertia::render($user->isAdmin() ? 'Admin/Notifications' : 'Customer/Notifications', [
            'notifications' => $q->paginate(20)->withQueryString()->through(fn ($n) => [
                'id' => $n->id, 'data' => $n->data, 'read_at' => $n->read_at, 'created_at' => $n->created_at->diffForHumans(),
            ]),
            'filter' => $c,
        ]);
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

        // hanya izinkan redirect ke domain sendiri (cegah open redirect)
        if ($url && str_starts_with($url, config('app.url'))) {
            return redirect($url);
        }

        return back();
    }

    public function readAll(Request $request)
    {
        $request->user()->unreadNotifications->markAsRead();

        return back()->with('success', 'Semua notifikasi ditandai telah dibaca.');
    }
}
