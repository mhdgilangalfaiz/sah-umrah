<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Log aktivitas masuk/keluar akun Admin & Super Admin (khusus Super Admin).
 * Sumber: audit_logs yang dicatat saat login, logout, dan percobaan login gagal.
 */
class ActivityLogController extends Controller
{
    public const ACTIONS = [
        'auth.login' => 'Login',
        'auth.logout' => 'Logout',
        'auth.login_gagal' => 'Login gagal',
    ];

    private const PER_PAGE = [10, 25, 50];

    private function base(): Builder
    {
        return AuditLog::whereIn('action', array_keys(self::ACTIONS))->whereIn('role', User::ADMIN_ROLES);
    }

    private function filtered(Request $request): Builder
    {
        return $this->base()
            ->when($request->q, fn ($q, $s) => $q->where(fn ($w) => $w->where('user_name', 'like', "%$s%")->orWhere('ip', 'like', "%$s%")
                ->orWhereHas('user', fn ($u) => $u->where('email', 'like', "%$s%"))))
            ->when($request->aksi, fn ($q, $a) => $q->where('action', $a))
            ->when($request->peran, fn ($q, $r) => $q->where('role', $r))
            ->when($request->dari, fn ($q, $d) => $q->whereDate('created_at', '>=', $d))
            ->when($request->sampai, fn ($q, $d) => $q->whereDate('created_at', '<=', $d));
    }

    public function index(Request $request)
    {
        $perPage = in_array($request->integer('per'), self::PER_PAGE, true) ? $request->integer('per') : 10;

        $logs = $this->filtered($request)->with('user:id,name,email,avatar')
            ->latest('created_at')->latest('id')->paginate($perPage)->withQueryString()
            ->through(fn (AuditLog $l) => [
                'id' => $l->id,
                'name' => $l->user?->name ?? $l->user_name,
                'email' => $l->user?->email,
                'role' => $l->role,
                'action' => $l->action,
                'action_label' => self::ACTIONS[$l->action] ?? $l->action,
                'description' => $l->description,
                'ip' => $l->ip,
                'device' => self::device($l->user_agent),
                'browser' => self::browser($l->user_agent),
                'user_agent' => $l->user_agent,
                'at' => $l->created_at?->timezone('Asia/Jakarta')->translatedFormat('d M Y, H:i:s'),
                'ago' => $l->created_at?->locale('id')->diffForHumans(),
            ]);

        return Inertia::render('Admin/ActivityLogs', [
            'logs' => $logs,
            'summary' => $this->summary(),
            'stats' => $this->stats(),
            'accounts' => User::whereIn('role', User::ADMIN_ROLES)->orderByRaw("role = 'super_admin'")->orderBy('name')
                ->get(['id', 'name', 'email', 'role', 'is_active', 'avatar', 'last_login_at', 'last_login_ip'])
                ->map(fn (User $u) => [
                    'id' => $u->id, 'name' => $u->name, 'email' => $u->email, 'role' => $u->role, 'is_active' => $u->is_active,
                    'last_login' => $u->last_login_at?->locale('id')->diffForHumans(), 'last_ip' => $u->last_login_ip,
                ]),
            'filters' => $request->only('q', 'aksi', 'peran', 'dari', 'sampai') + ['per' => $perPage],
        ]);
    }

    /** Angka hari ini, perbandingan dengan kemarin, dan deret 7 hari (untuk grafik mini). */
    private function summary(): array
    {
        $days = collect(range(6, 0))->map(fn ($i) => today()->subDays($i));
        $count = function (Carbon $day, string $metric): int {
            $q = $this->base()->whereDate('created_at', $day);

            return match ($metric) {
                'login' => $q->where('action', 'auth.login')->count(),
                'failed' => $q->where('action', 'auth.login_gagal')->count(),
                'admins' => $q->where('action', 'auth.login')->distinct('user_id')->count('user_id'),
            };
        };

        $out = [];
        foreach (['login', 'failed', 'admins'] as $metric) {
            $series = $days->map(fn ($d) => $count($d, $metric))->all();
            $today = end($series);
            $yesterday = $series[5];
            $out[$metric] = [
                'today' => $today,
                'change' => $yesterday === 0 ? ($today > 0 ? 100 : 0) : (int) round(($today - $yesterday) / $yesterday * 100),
                'series' => $series,
            ];
        }

        return $out;
    }

    /** Jumlah per jenis aktivitas 7 hari terakhir (diagram donut). */
    private function stats(): array
    {
        $counts = $this->base()->where('created_at', '>=', today()->subDays(6))
            ->selectRaw('action, count(*) as n')->groupBy('action')->pluck('n', 'action');

        return collect(self::ACTIONS)->map(fn ($label, $action) => ['action' => $action, 'label' => $label, 'count' => (int) ($counts[$action] ?? 0)])->values()->all();
    }

    /** Ekspor CSV sesuai filter yang sedang aktif. */
    public function export(Request $request): StreamedResponse
    {
        $rows = $this->filtered($request)->with('user:id,email')->latest('created_at')->latest('id')->limit(5000)->get();

        return response()->streamDownload(function () use ($rows) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF"); // agar Excel membaca UTF-8
            fputcsv($out, ['Waktu (WIB)', 'Nama', 'Email', 'Peran', 'Aktivitas', 'IP', 'Perangkat'], ';');
            foreach ($rows as $l) {
                fputcsv($out, [
                    $l->created_at?->timezone('Asia/Jakarta')->format('d/m/Y H:i:s'), $l->user_name, $l->user?->email,
                    $l->role === 'super_admin' ? 'Super Admin' : 'Admin', self::ACTIONS[$l->action] ?? $l->action, $l->ip, self::device($l->user_agent),
                ], ';');
            }
            fclose($out);
        }, 'log-aktivitas-admin-'.now()->format('Y-m-d').'.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    public static function browser(?string $ua): ?string
    {
        if (! $ua) {
            return null;
        }

        return match (true) {
            str_contains($ua, 'Edg/') => 'Edge',
            str_contains($ua, 'OPR/') || str_contains($ua, 'Opera') => 'Opera',
            str_contains($ua, 'Firefox/') => 'Firefox',
            str_contains($ua, 'Chrome/') => 'Chrome',
            str_contains($ua, 'Safari/') => 'Safari',
            default => 'Browser lain',
        };
    }

    /** "Chrome · Windows" dari user agent. */
    public static function device(?string $ua): ?string
    {
        if (! $ua) {
            return null;
        }
        $os = match (true) {
            str_contains($ua, 'Windows') => 'Windows',
            str_contains($ua, 'Android') => 'Android',
            str_contains($ua, 'iPhone') || str_contains($ua, 'iPad') => 'iOS',
            str_contains($ua, 'Mac OS') => 'macOS',
            str_contains($ua, 'Linux') => 'Linux',
            default => null,
        };
        $browser = self::browser($ua);

        return $os ? "$browser · $os" : $browser;
    }
}
