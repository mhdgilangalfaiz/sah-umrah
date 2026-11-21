<?php

namespace App\Http\Middleware;

use App\Models\Document;
use App\Models\Refund;
use App\Models\Setting;
use App\Models\SupportTicket;
use App\Models\VisaApplication;
use Illuminate\Http\Request;
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
                    'avatar' => $user->avatar,
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
            'unreadNotifications' => fn () => $user ? $user->unreadNotifications()->count() : 0,
            // Admin: jumlah notifikasi belum dibaca per halaman tujuan → dipetakan ke menu di sidebar
            'unreadByPath' => fn () => $user?->isAdmin()
                ? $user->unreadNotifications()->get(['data'])
                    ->map(fn ($n) => MarkNotificationsSeen::pathOf($n->data['url'] ?? null))
                    ->filter()->countBy()->all()
                : null,
            'adminBadges' => fn () => $user?->isAdmin() ? [
                'support' => SupportTicket::where('status', 'menunggu_admin')->count(),
                'documents' => Document::where('status', 'menunggu')->count(),
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
            ],
            'paymentMode' => config('payment.gateway'),
        ];
    }
}
