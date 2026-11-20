<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AuditLogController extends Controller
{
    public function index(Request $request)
    {
        return Inertia::render('Admin/AuditLogs', [
            'logs' => AuditLog::query()
                ->when($request->q, fn ($q, $s) => $q->where(fn ($w) => $w->where('description', 'like', "%$s%")->orWhere('user_name', 'like', "%$s%")))
                ->when($request->action, fn ($q, $a) => $q->where('action', 'like', $a.'%'))
                ->when($request->role, fn ($q, $r) => $r === 'pelanggan' ? $q->where('role', 'customer') : ($r === 'admin' ? $q->whereNotIn('role', ['customer', 'system']) : $q->where('role', $r)))
                ->when($request->dari, fn ($q, $d) => $q->whereDate('created_at', '>=', $d))
                ->when($request->sampai, fn ($q, $d) => $q->whereDate('created_at', '<=', $d))
                ->latest('id')->paginate(40)->withQueryString()
                ->through(fn ($l) => [
                    'id' => $l->id, 'user_name' => $l->user_name, 'role' => $l->role, 'action' => $l->action, 'description' => $l->description,
                    'old_values' => $l->old_values, 'new_values' => $l->new_values, 'ip' => $l->ip,
                    'subject' => $l->auditable_type ? class_basename($l->auditable_type).' #'.$l->auditable_id : null,
                    'created_at' => $l->created_at->format('d/m/Y H:i:s'),
                ]),
            'filters' => $request->only('q', 'action', 'role', 'dari', 'sampai'),
            'actionGroups' => ['auth', 'pembayaran', 'pesanan', 'paket', 'penerbangan', 'visa', 'dokumen', 'refund', 'keuangan', 'admin', 'bantuan', 'konten', 'laporan'],
        ]);
    }
}
