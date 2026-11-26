<?php

namespace App\Services\Payment;

use App\Contracts\Payable;
use App\Models\Payment;
use App\Models\Refund;
use App\Models\User;
use App\Models\WebhookEvent;
use App\Notifications\SystemNotification;
use App\Services\InvoiceService;
use App\Support\Audit;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Alur: buat order → generate transaksi (VA/QRIS) → pelanggan bayar → webhook → status otomatis diperbarui.
 */
class PaymentService
{
    public function __construct(private InvoiceService $invoices) {}

    public static function gateway(?string $name = null): PaymentGateway
    {
        return match ($name ?? config('payment.gateway')) {
            'xendit' => app(XenditGateway::class),
            default => app(SimulatorGateway::class),
        };
    }

    /**
     * Membuat transaksi pembayaran untuk sebuah pesanan.
     *
     * Idempotensi:
     *  - idempotency_key dari form (UUID per klik) → submit ganda mengembalikan transaksi yang sama.
     *  - hanya SATU transaksi aktif per pesanan; transaksi lama dengan nominal/metode sama dipakai ulang.
     */
    public function create(Model&Payable $payable, User $user, string $method, ?int $amount, ?string $idempotencyKey = null): Payment
    {
        if (! in_array($method, config('payment.methods'), true)) {
            throw ValidationException::withMessages(['method' => 'Metode pembayaran tidak tersedia.']);
        }

        $key = $idempotencyKey ? 'client:'.substr($idempotencyKey, 0, 64) : null;
        if ($key && ($existing = Payment::where('idempotency_key', $key)->first())) {
            return $existing;
        }

        return DB::transaction(function () use ($payable, $user, $method, $amount, $key) {
            // Kunci baris pesanan → cegah dua transaksi dibuat bersamaan
            $payable = $payable->newQuery()->lockForUpdate()->findOrFail($payable->getKey());

            if (! $payable->canBePaid()) {
                throw ValidationException::withMessages(['amount' => 'Pesanan ini tidak dapat dibayar saat ini.']);
            }

            $outstanding = $payable->outstandingAmount();
            $min = $payable->minimumPayment();
            $amount = $payable->allowsCustomAmount() ? (int) ($amount ?: $min) : $outstanding;

            if ($amount < $min || $amount > $outstanding) {
                throw ValidationException::withMessages([
                    'amount' => 'Nominal harus antara Rp'.number_format($min, 0, ',', '.').' dan Rp'.number_format($outstanding, 0, ',', '.').'.',
                ]);
            }

            $active = $payable->payments()->where('status', 'menunggu_pembayaran')->where('expires_at', '>', now())->get();
            foreach ($active as $p) {
                if ($p->method === $method && (int) $p->amount === $amount) {
                    return $p; // pakai ulang VA yang masih aktif
                }
            }
            // Nominal/metode berubah → nonaktifkan VA lama agar tidak terjadi pembayaran ganda
            foreach ($active as $p) {
                $this->cancel($p, 'Diganti transaksi baru');
            }

            $gateway = self::gateway();
            $payment = new Payment([
                'code' => 'PAY-'.now()->format('ymdHis').'-'.strtoupper(Str::random(5)),
                'user_id' => $user->id,
                'payable_type' => $payable->getMorphClass(),
                'payable_id' => $payable->getKey(),
                'amount' => $amount,
                'method' => $method,
                'gateway' => $gateway->name(),
                'status' => 'menunggu_pembayaran',
                'idempotency_key' => $key ?? 'auto:'.Str::uuid(),
                'expires_at' => $payable->paymentExpiry(),
            ]);
            if ($payable instanceof \App\Models\Booking) {
                $payment->payment_installment_id = $payable->installments()->where('status', '!=', 'lunas')->value('id');
            }

            $charge = $gateway->createCharge($payment, $user->name);
            $payment->fill([
                'gateway_id' => $charge->gatewayId,
                'va_number' => $charge->vaNumber,
                'qr_string' => $charge->qrString,
                'gateway_response' => $charge->raw,
            ])->save();

            Audit::log('pembayaran.dibuat', "Membuat transaksi {$payment->code} ({$payment->method_label}) Rp".number_format($amount, 0, ',', '.')." untuk {$payable->code}", $payment);

            $user->notify(new SystemNotification(
                'pembayaran', 'Instruksi Pembayaran '.$payable->code,
                "Silakan bayar Rp".number_format($amount, 0, ',', '.')." melalui {$payment->method_label}".
                ($payment->va_number ? " nomor VA {$payment->va_number}" : '').' sebelum '.$payment->expires_at->translatedFormat('d M Y H:i').' WIB.',
                route('payments.show', $payment), 'Lihat Instruksi'
            ));

            return $payment;
        });
    }

    public function cancel(Payment $payment, string $reason = 'Dibatalkan'): void
    {
        if ($payment->status !== 'menunggu_pembayaran') return;
        self::gateway($payment->gateway)->cancelCharge($payment);
        $payment->update(['status' => 'gagal', 'gateway_response' => array_merge($payment->gateway_response ?? [], ['cancel_reason' => $reason])]);
    }

    /**
     * Memproses webhook. Mengembalikan string hasil untuk dicatat.
     *
     * @throws InvalidSignatureException
     */
    public function handleWebhook(string $gatewayName, Request $request): string
    {
        $gateway = self::gateway($gatewayName);

        try {
            $data = $gateway->parseWebhook($request);
        } catch (InvalidSignatureException $e) {
            Log::warning("Webhook $gatewayName signature tidak valid", ['ip' => $request->ip()]);
            WebhookEvent::create([
                'gateway' => $gatewayName, 'event_id' => 'invalid_'.Str::uuid(), 'event_type' => 'invalid_signature',
                'signature_valid' => false, 'payload' => $request->all(), 'result' => 'ditolak',
            ]);
            throw $e;
        }

        if (! $data || $data->eventId === '') {
            return 'diabaikan';
        }

        // Idempotensi tingkat event: event_id unik
        try {
            $event = WebhookEvent::create([
                'gateway' => $gatewayName, 'event_id' => $gatewayName.':'.$data->eventId, 'event_type' => $data->eventType,
                'signature_valid' => true, 'payload' => $data->raw,
            ]);
        } catch (QueryException) {
            return 'duplikat'; // sudah pernah diproses
        }

        $result = DB::transaction(function () use ($data) {
            $payment = Payment::where('code', $data->paymentCode)->lockForUpdate()->first();
            if (! $payment) return 'payment_tidak_ditemukan';
            if ($payment->status === 'dibayar') return 'sudah_dibayar'; // idempotensi tingkat transaksi

            if ($data->status === 'expired') {
                $payment->update(['status' => 'kedaluwarsa']);
                return 'kedaluwarsa';
            }
            if ($data->status === 'failed') {
                $payment->update(['status' => 'gagal']);
                return 'gagal';
            }
            if ($data->status !== 'paid') return 'diabaikan';

            if ($data->amount !== (int) $payment->amount) {
                Log::error('Nominal webhook tidak cocok', ['payment' => $payment->code, 'webhook' => $data->amount]);
                return 'nominal_tidak_cocok';
            }

            $this->markPaid($payment);

            return 'dibayar';
        });

        $event->update(['result' => $result, 'processed_at' => now()]);

        return $result;
    }

    /** Tandai lunas + terapkan ke pesanan + perbarui status invoice + notifikasi. Harus dipanggil di dalam transaksi DB. */
    public function markPaid(Payment $payment, ?\Carbon\CarbonInterface $paidAt = null): void
    {
        $payment->update(['status' => 'dibayar', 'paid_at' => $paidAt ?? now()]);

        /** @var Model&Payable $payable */
        $payable = $payment->payable()->lockForUpdate()->first();
        $before = $payable->outstandingAmount();

        if ($before <= 0) {
            // Pembayaran ganda (sudah lunas sebelumnya) → otomatis ajukan refund untuk ditinjau admin
            Refund::create([
                'code' => 'RF-'.now()->format('ymd').'-'.strtoupper(Str::random(4)),
                'user_id' => $payment->user_id,
                'refundable_type' => $payable->getMorphClass(), 'refundable_id' => $payable->getKey(),
                'requested_amount' => $payment->amount,
                'reason' => "Pembayaran ganda terdeteksi otomatis ({$payment->code}).",
                'bank_name' => '-', 'account_number' => '-', 'account_holder' => '-',
            ]);
            Audit::log('pembayaran.ganda', "Pembayaran ganda {$payment->code} pada {$payable->code}, refund otomatis diajukan", $payment, [], [], null);

            return;
        }

        $payable->applyPayment($payment);
        $this->invoices->syncPaidStatus($payable);

        Audit::log('pembayaran.diterima', "Pembayaran {$payment->code} Rp".number_format($payment->amount, 0, ',', '.')." diterima untuk {$payable->code}", $payment, [], ['status' => 'dibayar'], null);

        $remaining = $payable->outstandingAmount();
        $payment->user->notify(new SystemNotification(
            'pembayaran', 'Pembayaran Diterima — '.$payable->code,
            'Terima kasih, pembayaran Rp'.number_format($payment->amount, 0, ',', '.').' via '.$payment->method_label.' telah kami terima dan tercatat di invoice.'.($payment->proof_path ? '' : ' Langkah berikutnya: unggah bukti pembayaran (resi/struk) sebagai arsip.').
            ($remaining > 0 ? ' Sisa tagihan: Rp'.number_format($remaining, 0, ',', '.').'.' : ' Tagihan Anda telah LUNAS.'),
            $payment->proof_path ? $payable->customerUrl() : route('payments.show', $payment->code), $payment->proof_path ? 'Lihat Pesanan' : 'Unggah Bukti Bayar'
        ));

        \App\Support\AdminNotifier::notify('pembayaran', 'Pembayaran masuk '.$payable->code,
            'Rp'.number_format($payment->amount, 0, ',', '.').' via '.$payment->method_label, route('admin.payments.index', ['q' => $payment->code]));
    }

    /** Cron: tandai transaksi yang lewat batas waktu sebagai kedaluwarsa */
    public function expireStale(): int
    {
        return Payment::where('status', 'menunggu_pembayaran')->where('expires_at', '<', now())
            ->update(['status' => 'kedaluwarsa', 'updated_at' => now()]);
    }
}
