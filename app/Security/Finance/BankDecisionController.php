<?php

namespace App\Security\Finance;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

/**
 * Halaman keputusan pemilik (dibuka dari email, bertanda tangan & berbatas waktu).
 * GET menampilkan konfirmasi; POST mengeksekusi — mencegah eksekusi tak sengaja oleh pemindai link email.
 */
class BankDecisionController extends Controller
{
    public function show(Request $request, CompanyBankAccount $account)
    {
        return view('finance.decision', [
            'account' => $account,
            'decision' => $request->query('decision'),
            'action' => $request->fullUrl(),
            'result' => null,
        ]);
    }

    public function store(Request $request, CompanyBankAccount $account, BankAccountGuard $guard)
    {
        $decision = $request->query('decision') === 'approve' ? 'approve' : 'cancel';

        try {
            $result = $guard->decide($account, (string) $request->query('token'), $decision);
        } catch (\RuntimeException $e) {
            $result = $e->getMessage();
        }

        return view('finance.decision', ['account' => $account->fresh(), 'decision' => $decision, 'action' => null, 'result' => $result]);
    }
}
