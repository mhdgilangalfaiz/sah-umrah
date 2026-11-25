<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\FlightOrder;
use App\Models\Payment;
use App\Models\VisaApplication;
use App\Services\FileStorage;
use App\Services\Payment\PaymentService;
use App\Services\Payment\SimulatorGateway;
use App\Support\AdminNotifier;
use App\Support\Audit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class PaymentController extends Controller
{
    public function __construct(private PaymentService $payments) {}

    public function store(Request $request)
    {
        $data = $request->validate([
            'payable_type' => ['required', Rule::in(['booking', 'flight', 'visa'])],
            'code' => 'required|string|max:40',
            'method' => ['required', Rule::in(config('payment.methods'))],
            'amount' => 'nullable|integer|min:10000',
            'idempotency_key' => 'required|uuid',
        ], ['method.required' => 'Pilih metode pembayaran.']);

        $model = match ($data['payable_type']) {
            'booking' => Booking::class,
            'flight' => FlightOrder::class,
            'visa' => VisaApplication::class,
        };
        $payable = $model::where('code', $data['code'])->where('user_id', $request->user()->id)->firstOrFail();

        $payment = $this->payments->create($payable, $request->user(), $data['method'], $data['amount'] ?? null, $data['idempotency_key']);

        return redirect()->route('payments.show', $payment);
    }

    public function show(Payment $payment)
    {
        $this->ensureOwner($payment);
        $payment->load('payable', 'installment');

        return Inertia::render('Payment/Show', [
            'payment' => $payment->only('code', 'amount', 'method', 'method_label', 'va_number', 'qr_string', 'status', 'gateway') + [
                'expires_at' => $payment->expires_at?->toIso8601String(),
                'paid_at' => $payment->paid_at?->toIso8601String(),
                'installment' => $payment->installment?->label,
                'invoice_id' => $payment->payable?->invoices()->where('type', 'invoice')->active()->value('id'),
                'proof_url' => $payment->proof_url,
                'proof_name' => $payment->proof_name,
                'proof_note' => $payment->proof_note,
                'proof_uploaded_at' => $payment->proof_uploaded_at?->format('d/m/Y H:i'),
            ],
            'order' => [
                'code' => $payment->payable->code,
                'label' => $payment->payable->payableLabel(),
                'url' => $payment->payable->customerUrl(),
                'outstanding' => $payment->payable->outstandingAmount(),
            ],
            'canSimulate' => $payment->gateway === 'simulator',
        ]);
    }

    public function status(Payment $payment)
    {
        $this->ensureOwner($payment);
        if ($payment->status === 'menunggu_pembayaran' && $payment->expires_at?->isPast()) {
            $payment->update(['status' => 'kedaluwarsa']);
        }

        return response()->json(['status' => $payment->status]);
    }

    public function cancel(Payment $payment)
    {
        $this->ensureOwner($payment);
        $this->payments->cancel($payment, 'Dibatalkan pelanggan');

        return redirect($payment->payable->customerUrl())->with('success', 'Transaksi dibatalkan. Anda dapat membuat pembayaran baru.');
    }

    /**
     * Unggah bukti pembayaran (resi/struk/tangkapan layar/catatan) setelah pembayaran berhasil — arsip perusahaan.
     * Boleh diganti; file lama dihapus.
     */
    public function uploadProof(Request $request, Payment $payment)
    {
        $this->ensureOwner($payment);
        abort_unless($payment->status === 'dibayar', 422, 'Bukti hanya dapat diunggah untuk pembayaran yang sudah berhasil.');
        $data = $request->validate([
            'file' => 'required|file|max:5120|mimes:jpg,jpeg,png,webp,pdf',
            'note' => 'nullable|string|max:500',
        ], [], ['file' => 'bukti pembayaran', 'note' => 'catatan']);

        $old = $payment->proof_path;
        $owner = $payment->user;
        $path = FileStorage::storePrivate($request->file('file'), 'payment-proofs/'.$owner->id, 'bukti-bayar-'.$payment->code, $request->user(), $owner);
        $payment->update([
            'proof_path' => $path,
            'proof_name' => substr($request->file('file')->getClientOriginalName(), 0, 200),
            'proof_note' => $data['note'] ?? null,
            'proof_uploaded_at' => now(),
        ]);
        if ($old && $old !== $path) Storage::disk(FileStorage::disk())->delete($old);

        Audit::log('pembayaran.bukti', "Bukti pembayaran {$payment->code} diunggah", $payment);
        AdminNotifier::notify('pembayaran', 'Bukti bayar diunggah '.$payment->code,
            $owner->name.' — Rp'.number_format($payment->amount, 0, ',', '.').' ('.$payment->payable?->code.')', route('admin.payments.index', ['q' => $payment->code]));

        return back()->with('success', 'Bukti pembayaran tersimpan. Terima kasih.');
    }

    /** Lihat bukti pembayaran (pemilik atau admin) */
    public function proof(Payment $payment)
    {
        $this->ensureOwner($payment);
        abort_unless($payment->proof_path, 404);
        $ext = strtolower(pathinfo($payment->proof_path, PATHINFO_EXTENSION));

        return response(FileStorage::readPrivate($payment->proof_path), 200, [
            'Content-Type' => match ($ext) { 'pdf' => 'application/pdf', 'png' => 'image/png', 'webp' => 'image/webp', default => 'image/jpeg' },
            'Content-Disposition' => 'inline; filename="'.basename($payment->proof_path).'"',
            'Cache-Control' => 'private, no-store',
        ]);
    }

    /** HANYA mode simulator: memicu webhook bertanda tangan seolah-olah dari gateway */
    public function simulate(Request $request, Payment $payment)
    {
        $this->ensureOwner($payment);
        abort_unless($payment->gateway === 'simulator' && config('payment.gateway') === 'simulator', 404);

        $body = json_encode(SimulatorGateway::payloadFor($payment, $request->input('status', 'PAID')));
        $webhook = Request::create(route('webhooks.payment', 'simulator'), 'POST', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_X_SIMULATOR_SIGNATURE' => SimulatorGateway::sign($body),
        ], $body);

        $result = $this->payments->handleWebhook('simulator', $webhook);

        return back()->with('success', 'Simulasi webhook terkirim: '.$result);
    }
}
