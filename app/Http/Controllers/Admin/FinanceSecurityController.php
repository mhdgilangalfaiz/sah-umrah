<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\SecurityAlert;
use App\Security\Finance\BankAccountGuard;
use App\Security\Finance\CompanyBankAccount;
use Illuminate\Http\Request;
use Inertia\Inertia;

/** Panel admin untuk rekening perusahaan — semua perubahan lewat BankAccountGuard (wajib persetujuan pemilik via email) */
class FinanceSecurityController extends Controller
{
    public function index()
    {
        return Inertia::render('Admin/FinanceSecurity', [
            'accounts' => CompanyBankAccount::with('requester:id,name')->latest()->get()->map(fn ($a) => [
                'id' => $a->id, 'bank_name' => $a->bank_name, 'masked_number' => $a->masked_number, 'account_holder' => $a->account_holder,
                'purpose' => $a->purpose, 'status' => $a->status, 'intact' => BankAccountGuard::isIntact($a),
                'requester' => $a->requester?->name, 'requested_ip' => $a->requested_ip,
                'created_at' => $a->created_at->format('d/m/Y H:i'), 'approved_at' => $a->approved_at?->format('d/m/Y H:i'),
                'blocked_reason' => $a->blocked_reason, 'approval_expires_at' => $a->approval_expires_at?->format('d/m/Y H:i'),
            ]),
            'alerts' => SecurityAlert::latest()->take(30)->get(),
            'ownerEmail' => preg_replace('/(?<=.).(?=[^@]*?@)/', '*', (string) config('finance.owner_email')),
        ]);
    }

    public function store(Request $request, BankAccountGuard $guard)
    {
        $data = $request->validate([
            'bank_name' => 'required|string|max:60',
            'account_number' => 'required|string|max:30|regex:/^[0-9\- ]{6,30}$/',
            'account_holder' => 'required|string|max:120',
            'purpose' => 'required|in:settlement,refund',
            'password' => 'required|current_password',
        ], ['password.current_password' => 'Kata sandi Anda salah.']);

        $guard->requestChange($data, $request->user());

        return back()->with('success', 'Permintaan dikirim. Rekening TIDAK aktif sampai pemilik menyetujui melalui email.');
    }
}
