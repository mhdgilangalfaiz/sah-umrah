<?php

namespace App\Services\Payment;

use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * Gateway simulasi untuk pengembangan lokal (tanpa kunci API).
 * Menghasilkan nomor VA / QR palsu, dan webhook ditandatangani HMAC-SHA256 (header X-Simulator-Signature)
 * sehingga alur verifikasi signature + idempotensi tetap teruji persis seperti produksi.
 */
class SimulatorGateway implements PaymentGateway
{
    private const PREFIX = ['va_mandiri' => '89608', 'va_bsi' => '90012', 'va_muamalat' => '78901'];

    public function name(): string
    {
        return 'simulator';
    }

    public function createCharge(Payment $payment, string $customerName): ChargeResult
    {
        if ($payment->method === 'qris') {
            $qr = '00020101021226640017ID.CO.SIMULATOR'.strtoupper(Str::random(24)).'5303360540'.$payment->amount.'5802ID6304'.strtoupper(Str::random(4));

            return new ChargeResult('sim_qr_'.Str::random(12), null, $qr, ['simulated' => true]);
        }
        $va = self::PREFIX[$payment->method].str_pad((string) random_int(0, 99999999999), 11, '0', STR_PAD_LEFT);

        return new ChargeResult('sim_va_'.Str::random(12), $va, null, ['simulated' => true]);
    }

    public function cancelCharge(Payment $payment): void {}

    public static function sign(string $body): string
    {
        return hash_hmac('sha256', $body, (string) config('payment.simulator.secret'));
    }

    /** Payload webhook simulasi — dipakai tombol "Simulasikan Pembayaran" & pengujian */
    public static function payloadFor(Payment $payment, string $status = 'PAID'): array
    {
        return [
            'event_id' => 'sim_evt_'.Str::random(16),
            'external_id' => $payment->code,
            'amount' => (int) $payment->amount,
            'status' => $status,
            'paid_at' => now()->toIso8601String(),
        ];
    }

    public function parseWebhook(Request $request): ?WebhookData
    {
        $sig = (string) $request->header('X-Simulator-Signature');
        if (! hash_equals(self::sign($request->getContent()), $sig)) {
            throw new InvalidSignatureException('Signature simulator tidak valid');
        }
        $p = $request->json()->all();
        $status = match ($p['status'] ?? '') {
            'PAID' => 'paid',
            'EXPIRED' => 'expired',
            'FAILED' => 'failed',
            default => 'ignored',
        };

        return new WebhookData((string) ($p['event_id'] ?? ''), (string) ($p['external_id'] ?? ''), $status,
            (int) ($p['amount'] ?? 0), 'simulator.'.strtolower($p['status'] ?? ''), $p);
    }
}
