<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Models\WebhookEvent;
use App\Services\Payment\PaymentService;
use App\Support\Audit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Inertia\Inertia;

/** Monitoring pembayaran + rekonsiliasi dengan data gateway */
class PaymentController extends Controller
{
    public function index(Request $request)
    {
        return Inertia::render('Admin/Payments/Index', [
            'payments' => Payment::with('user:id,name,customer_code', 'payable')
                ->when($request->status, fn ($q, $s) => $q->where('status', $s))
                ->when($request->method, fn ($q, $m) => $q->where('method', $m))
                ->when($request->q, fn ($q, $s) => $q->where(fn ($w) => $w->where('code', 'like', "%$s%")->orWhere('va_number', 'like', "%$s%")))
                ->when($request->dari, fn ($q, $d) => $q->whereDate('created_at', '>=', $d))
                ->when($request->sampai, fn ($q, $d) => $q->whereDate('created_at', '<=', $d))
                ->latest()->paginate(25)->withQueryString()
                ->through(fn ($p) => [
                    'code' => $p->code, 'user' => $p->user->name, 'customer_code' => $p->user->customer_code,
                    'order' => $p->payable?->code, 'amount' => $p->amount, 'method_label' => $p->method_label, 'va_number' => $p->va_number,
                    'gateway' => $p->gateway, 'status' => $p->status, 'created_at' => $p->created_at->format('d/m/Y H:i'),
                    'paid_at' => $p->paid_at?->format('d/m/Y H:i'), 'expires_at' => $p->expires_at?->format('d/m/Y H:i'),
                    'proof_url' => $p->proof_url, 'needs_proof' => $p->needs_proof, 'proof_note' => $p->proof_note,
                ]),
            'filters' => $request->only('status', 'method', 'q', 'dari', 'sampai'),
            'methods' => Payment::METHODS,
            'summary' => [
                'paid_today' => (int) Payment::where('status', 'dibayar')->whereDate('paid_at', today())->sum('amount'),
                'pending' => Payment::where('status', 'menunggu_pembayaran')->where('expires_at', '>', now())->count(),
                'pending_amount' => (int) Payment::where('status', 'menunggu_pembayaran')->where('expires_at', '>', now())->sum('amount'),
            ],
        ]);
    }

    /**
     * Rekonsiliasi:
     *  - pembayaran "dibayar" tanpa webhook tercatat
     *  - webhook bermasalah (signature invalid, nominal tidak cocok, payment tidak ditemukan)
     *  - total per hari: sistem vs webhook
     */
    public function reconcile(Request $request)
    {
        $from = $request->date('dari') ?? now()->subDays(30);
        $to = ($request->date('sampai') ?? now())->endOfDay();

        $webhookPaid = WebhookEvent::whereIn('result', ['dibayar'])->whereBetween('created_at', [$from, $to])->get();
        $webhookCodes = $webhookPaid->map(fn ($e) => $e->payload['external_id'] ?? $e->payload['data']['reference_id'] ?? null)->filter()->all();

        $paid = Payment::where('status', 'dibayar')->whereBetween('paid_at', [$from, $to])->get();

        return Inertia::render('Admin/Payments/Reconcile', [
            'period' => ['dari' => $from->format('Y-m-d'), 'sampai' => $to->format('Y-m-d')],
            'totals' => [
                'system' => (int) $paid->sum('amount'),
                'system_count' => $paid->count(),
                'webhook_count' => $webhookPaid->count(),
            ],
            'missingWebhook' => $paid->reject(fn ($p) => in_array($p->code, $webhookCodes, true))->values()
                ->map(fn ($p) => ['code' => $p->code, 'amount' => $p->amount, 'paid_at' => $p->paid_at->format('d/m/Y H:i'), 'gateway' => $p->gateway]),
            'problems' => WebhookEvent::whereNotIn('result', ['dibayar', 'duplikat', 'sudah_dibayar', 'diabaikan'])
                ->orWhere('signature_valid', false)->latest()->take(50)->get()
                ->map(fn ($e) => ['id' => $e->id, 'gateway' => $e->gateway, 'event_type' => $e->event_type, 'result' => $e->result, 'signature_valid' => $e->signature_valid, 'created_at' => $e->created_at->format('d/m/Y H:i')]),
            'daily' => Payment::where('status', 'dibayar')->whereBetween('paid_at', [$from, $to])
                ->selectRaw('DATE(paid_at) as tanggal, COUNT(*) as jumlah, SUM(amount) as total')->groupBy(DB::raw('DATE(paid_at)'))->orderBy('tanggal')->toBase()->get(),
            'stalePending' => Payment::where('status', 'menunggu_pembayaran')->where('expires_at', '>', now())->where('created_at', '<', now()->subHours(2))->take(30)->get(['code', 'amount', 'method', 'gateway', 'created_at']),
        ]);
    }

    /** Cek status langsung ke gateway (Xendit) untuk transaksi pending — jika ternyata sudah dibayar, sinkronkan */
    public function check(Payment $payment, PaymentService $service)
    {
        if ($payment->gateway !== 'xendit' || $payment->status !== 'menunggu_pembayaran') {
            return back()->with('error', 'Cek gateway hanya untuk transaksi Xendit yang masih menunggu.');
        }
        $key = config('payment.xendit.secret_key');
        $http = Http::withBasicAuth($key, '')->baseUrl(config('payment.xendit.base_url'))->acceptJson();

        if ($payment->method !== 'qris') {
            // VA: Xendit tidak menyediakan pencarian pembayaran per external_id → tampilkan status VA saja.
            // Sinkron otomatis hanya lewat webhook resmi agar tidak pernah menandai lunas tanpa bukti pembayaran.
            $res = $http->get("/callback_virtual_accounts/{$payment->gateway_id}");
            $status = $res->json('status', 'tidak diketahui');
            Audit::log('pembayaran.cek_gateway', "Cek gateway {$payment->code}: status VA {$status}", $payment);

            return back()->with('success', "Status VA di Xendit: {$status}. Bila pelanggan sudah membayar, kirim ulang webhook dari dashboard Xendit (Callback → Resend).");
        }

        $res = $http->withHeaders(['api-version' => '2022-07-31'])->get("/qr_codes/{$payment->gateway_id}/payments");
        $paid = collect($res->json('data', []))->contains(fn ($p) => ($p['status'] ?? '') === 'SUCCEEDED' && (int) ($p['amount'] ?? 0) === (int) $payment->amount);

        if ($paid) {
            DB::transaction(fn () => $service->markPaid(Payment::lockForUpdate()->find($payment->id)));
            Audit::log('pembayaran.rekonsiliasi', "Sinkron manual dari gateway: {$payment->code} ditandai DIBAYAR", $payment);

            return back()->with('success', 'Gateway mengonfirmasi pembayaran. Status diperbarui.');
        }
        Audit::log('pembayaran.cek_gateway', "Cek gateway {$payment->code}: belum dibayar", $payment);

        return back()->with('success', 'Gateway: transaksi belum dibayar.');
    }
}
