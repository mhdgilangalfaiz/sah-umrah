<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\FlightOrder;
use App\Models\Payment;
use App\Models\VisaApplication;
use App\Services\Payment\PaymentService;
use App\Services\Payment\SimulatorGateway;
use Illuminate\Http\Request;
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
        $payment->load('payable', 'installment', 'receipt');

        return Inertia::render('Payment/Show', [
            'payment' => $payment->only('code', 'amount', 'method', 'method_label', 'va_number', 'qr_string', 'status', 'gateway') + [
                'expires_at' => $payment->expires_at?->toIso8601String(),
                'paid_at' => $payment->paid_at?->toIso8601String(),
                'installment' => $payment->installment?->label,
                'receipt_id' => $payment->receipt?->id,
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
