<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Audit Log: catatan permanen siapa melakukan apa dan kapan (hanya baca).
 *  - Super Admin: melihat semua aktivitas.
 *  - Admin: melihat semua aktivitas KECUALI milik Super Admin.
 */
class AuditLogController extends Controller
{
    /** Kelompok aksi → label filter. */
    public const GROUPS = [
        'auth' => 'Login & akun', 'akun' => 'Profil pengguna', 'pesanan' => 'Pesanan', 'pembayaran' => 'Pembayaran', 'paket' => 'Paket umrah',
        'keberangkatan' => 'Keberangkatan', 'penerbangan' => 'Penerbangan', 'tiket' => 'Tiket', 'visa' => 'Visa', 'dokumen' => 'Dokumen',
        'jamaah' => 'Data jamaah', 'refund' => 'Refund', 'keuangan' => 'Keuangan', 'pengguna' => 'Kelola pengguna', 'admin' => 'Akun admin',
        'bantuan' => 'Pusat bantuan', 'konten' => 'Konten website', 'laporan' => 'Laporan', 'invoice' => 'Invoice',
    ];

    /** Label ramah untuk aksi yang sering muncul (sisanya dibuat dari kodenya). */
    private const LABELS = [
        'auth.login' => 'Login', 'auth.logout' => 'Logout', 'auth.login_gagal' => 'Login gagal', 'auth.registrasi' => 'Registrasi',
        'paket.harga_ubah' => 'Ubah harga paket', 'konten.galeri_audio' => 'Ubah audio galeri', 'konten.beranda_ubah' => 'Ubah konten beranda',
        'konten.pengaturan_ubah' => 'Ubah pengaturan', 'pembayaran.diterima' => 'Pembayaran diterima', 'pesanan.umrah_dibuat' => 'Pesanan umrah baru',
    ];

    public const ROLES = ['admin' => 'Admin', 'super_admin' => 'Super Admin', 'customer' => 'Jamaah', 'system' => 'Sistem'];

    private function query(Request $request): Builder
    {
        $isSuper = $request->user()->role === User::ROLE_SUPER_ADMIN;

        return AuditLog::query()
            // Admin tidak melihat jejak Super Admin
            ->when(! $isSuper, fn ($q) => $q->where(fn ($w) => $w->whereNull('role')->orWhere('role', '!=', User::ROLE_SUPER_ADMIN)))
            ->when($request->q, fn ($q, $s) => $q->where(fn ($w) => $w->where('description', 'like', "%$s%")->orWhere('user_name', 'like', "%$s%")->orWhere('ip', 'like', "%$s%")))
            ->when($request->action, fn ($q, $a) => $q->where('action', 'like', $a.'.%'))
            ->when($request->role, fn ($q, $r) => $q->where('role', $r))
            ->when($request->dari, fn ($q, $d) => $q->whereDate('created_at', '>=', $d))
            ->when($request->sampai, fn ($q, $d) => $q->whereDate('created_at', '<=', $d));
    }

    public function index(Request $request)
    {
        $isSuper = $request->user()->role === User::ROLE_SUPER_ADMIN;
        $perPage = in_array($request->integer('per'), [10, 25, 50], true) ? $request->integer('per') : 25;

        return Inertia::render('Admin/AuditLogs', [
            'logs' => $this->query($request)->latest('id')->paginate($perPage)->withQueryString()
                ->through(fn (AuditLog $l) => [
                    'id' => $l->id, 'user_name' => $l->user_name, 'role' => $l->role,
                    'action' => $l->action, 'action_label' => self::label($l->action), 'group' => Str::before($l->action, '.'),
                    'description' => $l->description, 'old_values' => $l->old_values, 'new_values' => $l->new_values, 'ip' => $l->ip,
                    'device' => ActivityLogController::device($l->user_agent),
                    'subject' => $l->auditable_type ? class_basename($l->auditable_type).' #'.$l->auditable_id : null,
                    'created_at' => $l->created_at?->timezone('Asia/Jakarta')->format('d/m/Y H:i:s'),
                ]),
            'filters' => $request->only('q', 'action', 'role', 'dari', 'sampai') + ['per' => $perPage],
            'groups' => self::GROUPS,
            'roles' => $isSuper ? self::ROLES : array_diff_key(self::ROLES, ['super_admin' => 1]),
            'isSuper' => $isSuper,
        ]);
    }

    public function export(Request $request): StreamedResponse
    {
        $rows = $this->query($request)->latest('id')->limit(5000)->get();

        return response()->streamDownload(function () use ($rows) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, ['Waktu (WIB)', 'Pelaku', 'Peran', 'Aksi', 'Deskripsi', 'Objek', 'IP'], ';');
            foreach ($rows as $l) {
                fputcsv($out, [
                    $l->created_at?->timezone('Asia/Jakarta')->format('d/m/Y H:i:s'), $l->user_name, self::ROLES[$l->role] ?? $l->role,
                    self::label($l->action), $l->description, $l->auditable_type ? class_basename($l->auditable_type).' #'.$l->auditable_id : '', $l->ip,
                ], ';');
            }
            fclose($out);
        }, 'audit-log-'.now()->format('Y-m-d').'.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    /** "konten.galeri_audio" → "Konten galeri audio" bila belum ada label khusus. */
    public static function label(string $action): string
    {
        return self::LABELS[$action] ?? Str::ucfirst(str_replace(['.', '_'], ' ', $action));
    }
}
