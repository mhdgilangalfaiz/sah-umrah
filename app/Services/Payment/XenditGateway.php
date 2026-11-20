<?php

namespace App\Services\Payment;

use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * Integrasi Xendit (mode test/sandbox memakai secret key xnd_development_...).
 *  - Fixed Virtual Account (closed amount, single use): Mandiri, BSI, Muamalat
 *  - QRIS dinamis (QR Codes API v2022-07-31)
 *  - Webhook diverifikasi dengan header x-callback-token
 */
class XenditGateway implements PaymentGateway
{
    public function name(): string
    {
        return 'xendit';
    }

    private function http()
    {
        $key = config('payment.xendit.secret_key');
        if (! $key) {
            throw new RuntimeException('XENDIT_SECRET_KEY belum diatur.');
        }

        return Http::withBasicAuth($key, '')->baseUrl(config('payment.xendit.base_url'))->acceptJson()->timeout(20);
    }

    public function createCharge(Payment $payment, string $customerName): ChargeResult
    {
        if ($payment->method === 'qris') {
            $res = $this->http()->withHeaders(['api-version' => '2022-07-31'])->post('/qr_codes', [
                'reference_id' => $payment->code,
                'type' => 'DYNAMIC',
                'currency' => 'IDR',
                'amount' => (int) $payment->amount,
                'expires_at' => $payment->expires_at->toIso8601String(),
            ]);
            $this->ensureOk($res, 'QRIS');

            return new ChargeResult($res->json('id'), null, $res->json('qr_string'), $res->json());
        }

        $bank = config('payment.bank_codes.'.$payment->method);
        // Xendit hanya menerima huruf & spasi untuk nama VA
        $name = trim(preg_replace('/[^A-Za-z ]/', '', $customerName)) ?: 'Jamaah SAH';

        $res = $this->http()->post('/callback_virtual_accounts', [
            'external_id' => $payment->code,
            'bank_code' => $bank,
            'name' => substr($name, 0, 50),
            'expected_amount' => (int) $payment->amount,
            'is_closed' => true,          // nominal harus tepat
            'is_single_use' => true,      // VA hanya bisa dibayar sekali → cegah pembayaran ganda
            'expiration_date' => $payment->expires_at->toIso8601String(),
        ]);
        $this->ensureOk($res, 'Virtual Account');

        return new ChargeResult($res->json('id'), $res->json('account_number'), null, $res->json());
    }

    public function cancelCharge(Payment $payment): void
    {
        try {
            if ($payment->method !== 'qris' && $payment->gateway_id) {
                // Memajukan expiration_date ke sekarang = menonaktifkan VA
                $this->http()->patch('/callback_virtual_accounts/'.$payment->gateway_id, [
                    'expiration_date' => now()->addMinute()->toIso8601String(),
                ]);
            }
            // QR dinamis otomatis tidak berlaku setelah expires_at
        } catch (\Throwable $e) {
            Log::warning('Xendit cancel gagal: '.$e->getMessage(), ['payment' => $payment->code]);
        }
    }

    public function parseWebhook(Request $request): ?WebhookData
    {
        $expected = (string) config('payment.xendit.callback_token');
        $given = (string) $request->header('x-callback-token');
        if ($expected === '' || ! hash_equals($expected, $given)) {
            throw new InvalidSignatureException('x-callback-token tidak valid');
        }

        $p = $request->all();

        // QRIS: {"event":"qr.payment","data":{"id":"qrpy_...","reference_id":"...","amount":...,"status":"SUCCEEDED"}}
        if (($p['event'] ?? null) === 'qr.payment') {
            $d = $p['data'] ?? [];
            $status = match ($d['status'] ?? '') {
                'SUCCEEDED', 'COMPLETED' => 'paid',
                'FAILED' => 'failed',
                default => 'ignored',
            };

            return new WebhookData((string) ($d['id'] ?? $p['id'] ?? ''), (string) ($d['reference_id'] ?? ''), $status,
                (int) ($d['amount'] ?? 0), 'qr.payment', $p);
        }

        // VA paid callback: {"payment_id":"...","external_id":"PAY-...","amount":...,"callback_virtual_account_id":"..."}
        if (isset($p['payment_id'], $p['external_id'])) {
            return new WebhookData((string) $p['payment_id'], (string) $p['external_id'], 'paid',
                (int) ($p['amount'] ?? 0), 'va.paid', $p);
        }

        // VA created/updated callback (status ACTIVE/INACTIVE) — tidak perlu diproses
        return null;
    }

    private function ensureOk($res, string $what): void
    {
        if ($res->failed()) {
            Log::error("Xendit $what gagal", ['status' => $res->status(), 'body' => $res->json()]);
            throw new RuntimeException("Gagal membuat $what: ".($res->json('message') ?? 'gateway error'));
        }
    }
}
