<?php

namespace App\Http\Middleware;

use App\Models\Document;
use App\Models\Refund;
use App\Models\Setting;
use App\Models\SupportTicket;
use App\Models\VisaApplication;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    public function share(Request $request): array
    {
        $user = $request->user();
        $settings = Setting::allCached();

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $user ? [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'phone' => $user->phone,
                    // foto unggahan (path di disk public) atau URL foto Google
                    'avatar' => $user->avatar
                        ? (str_starts_with($user->avatar, 'http') ? $user->avatar : Storage::disk('public')->url($user->avatar))
                        : null,
                    'role' => $user->role,
                    'role_label' => $user->roleLabel(),
                    'is_admin' => $user->isAdmin(),
                    'customer_code' => $user->customer_code,
                    'email_verified' => (bool) $user->email_verified_at,
                    'profile_completed' => (bool) $user->profile_completed_at,
                ] : null,
            ],
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
            ],
            // Tombol "Masuk dengan Google" aktif otomatis bila GOOGLE_CLIENT_ID & SECRET sudah diisi di .env
            'googleLogin' => (bool) (config('services.google.client_id') && config('services.google.client_secret')),
            'unreadNotifications' => fn () => $user ? $user->unreadNotifications()->count() : 0,
            // Admin: jumlah notifikasi belum dibaca per halaman tujuan → dipetakan ke menu di sidebar
            'unreadByPath' => fn () => $user?->isAdmin()
                ? $user->unreadNotifications()->get(['data'])
                    ->map(fn ($n) => MarkNotificationsSeen::pathOf($n->data['url'] ?? null))
                    ->filter()->countBy()->all()
                : null,
            // Admin: item yang punya notifikasi belum dibaca → baris di daftar diberi penanda "Baru"
            'unreadTargets' => fn () => $user?->isAdmin()
                ? $user->unreadNotifications()->get(['data'])
                    ->map(fn ($n) => MarkNotificationsSeen::target($n->data['url'] ?? null))
                    ->filter()->unique()->values()->all()
                : [],
            'adminBadges' => fn () => $user?->isAdmin() ? [
                'support' => SupportTicket::where('status', 'menunggu_admin')->count(),
                'documents' => Document::where('status', 'menunggu')->whereIn('type', Document::JAMAAH_TYPES)->count(),
                'refunds' => Refund::where('status', 'diajukan')->count(),
                'visa' => VisaApplication::whereIn('status', ['menunggu_invoice', 'menunggu_dokumen'])->count(),
            ] : null,
            'company' => [
                'name' => $settings['company_name'],
                'tagline' => $settings['company_tagline'],
                'address' => $settings['company_address'],
                'phone' => $settings['company_phone'],
                'email' => $settings['company_email'],
                'license' => $settings['license_ppiu'],
                'hours' => $settings['office_hours'],
                'whatsapp' => $settings['company_whatsapp'],
                'socials' => collect(['instagram' => 'Instagram', 'facebook' => 'Facebook', 'youtube' => 'YouTube', 'tiktok' => 'TikTok'])
                    ->map(fn ($label, $key) => ['key' => $key, 'label' => $label, 'url' => ($settings["social_{$key}"] ?? '') ?: null])
                    ->values()->all(),
            ],
            'paymentMode' => config('payment.gateway'),
        ];
    }
}
