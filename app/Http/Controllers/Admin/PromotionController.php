<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Promotion;
use App\Models\User;
use App\Notifications\SystemNotification;
use App\Support\Audit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Notification;
use Inertia\Inertia;

/** Broadcast promo terbaru ke seluruh pelanggan (in-app + email via queue) */
class PromotionController extends Controller
{
    public function index()
    {
        return Inertia::render('Admin/Promotions', [
            'promotions' => Promotion::with('sender:id,name')->latest()->paginate(20),
            'customerCount' => User::customers()->where('is_active', true)->count(),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'title' => 'required|string|max:150',
            'message' => 'required|string|max:2000',
            'link' => 'nullable|string|max:300',
            'send_email' => 'boolean',
        ]);
        $link = $data['link'] ?? null;
        if ($link && ! str_starts_with($link, config('app.url'))) {
            $link = url(ltrim($link, '/'));
        }

        $count = 0;
        User::customers()->where('is_active', true)->chunkById(200, function ($users) use ($data, $link, &$count) {
            Notification::send($users, new SystemNotification('promo', $data['title'], $data['message'], $link, 'Lihat Promo', (bool) ($data['send_email'] ?? false)));
            $count += $users->count();
        });

        $promo = Promotion::create([...$data, 'link' => $link, 'recipients' => $count, 'sent_by' => $request->user()->id, 'sent_at' => now()]);
        Audit::log('konten.promo_kirim', "Mengirim promo \"{$promo->title}\" ke {$count} pelanggan", $promo);

        return back()->with('success', "Promo terkirim ke {$count} pelanggan.");
    }
}
