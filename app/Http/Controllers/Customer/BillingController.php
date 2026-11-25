<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Payment;
use Illuminate\Http\Request;
use Inertia\Inertia;

/** Tagihan & riwayat pembayaran + unduh invoice PDF */
class BillingController extends Controller
{
    public function index(Request $request)
    {
        $uid = $request->user()->id;
        $label = fn ($m) => $m ? ['code' => $m->code, 'url' => $m->customerUrl()] : null;

        return Inertia::render('Customer/Billing', [
            'invoices' => Invoice::with('invoiceable')->where('user_id', $uid)->where('type', 'invoice')->latest('issued_at')->paginate(15, ['*'], 'inv')
                ->through(fn ($i) => [
                    'id' => $i->id, 'number' => $i->number, 'type' => $i->type, 'amount' => $i->amount, 'status' => $i->status,
                    'issued_at' => $i->issued_at->format('d/m/Y'), 'order' => $label($i->invoiceable),
                ]),
            'payments' => Payment::with('payable')->where('user_id', $uid)->latest()->paginate(15, ['*'], 'pay')
                ->through(fn ($p) => [
                    'code' => $p->code, 'amount' => $p->amount, 'method_label' => $p->method_label, 'status' => $p->status,
                    'created_at' => $p->created_at->format('d/m/Y H:i'), 'paid_at' => $p->paid_at?->format('d/m/Y H:i'),
                    'order' => $label($p->payable),
                    'proof_url' => $p->proof_url, 'needs_proof' => $p->needs_proof,
                ]),
        ]);
    }
}
