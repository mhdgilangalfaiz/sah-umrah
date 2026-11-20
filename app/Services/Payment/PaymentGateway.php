<?php

namespace App\Services\Payment;

use App\Models\Payment;
use Illuminate\Http\Request;

/**
 * Abstraksi payment gateway. Implementasi: XenditGateway (sandbox/produksi), SimulatorGateway (lokal).
 * Untuk mengganti ke Midtrans/Duitku cukup buat kelas baru yang mengimplementasikan interface ini.
 */
interface PaymentGateway
{
    public function name(): string;

    /** Membuat VA / QRIS di gateway. Mengembalikan data untuk disimpan di Payment. */
    public function createCharge(Payment $payment, string $customerName): ChargeResult;

    /** Membatalkan/menonaktifkan VA/QR (best effort) */
    public function cancelCharge(Payment $payment): void;

    /**
     * Verifikasi signature + normalisasi payload webhook.
     *
     * @throws InvalidSignatureException
     */
    public function parseWebhook(Request $request): ?WebhookData;
}
