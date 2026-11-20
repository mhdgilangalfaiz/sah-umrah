<?php

namespace App\Http\Controllers;

use App\Services\Payment\InvalidSignatureException;
use App\Services\Payment\PaymentService;
use Illuminate\Http\Request;

/**
 * Endpoint webhook payment gateway: POST /webhooks/payment/{gateway}
 * - 401 jika signature/callback token tidak valid
 * - 200 untuk semua hasil lain (termasuk duplikat) agar gateway tidak mengirim ulang tanpa henti
 */
class WebhookController extends Controller
{
    public function __invoke(Request $request, string $gateway, PaymentService $payments)
    {
        if ($gateway === 'simulator' && config('payment.gateway') !== 'simulator' && ! app()->environment('local', 'testing')) {
            abort(404);
        }

        try {
            $result = $payments->handleWebhook($gateway, $request);
        } catch (InvalidSignatureException) {
            return response()->json(['ok' => false, 'message' => 'invalid signature'], 401);
        }

        return response()->json(['ok' => true, 'result' => $result]);
    }
}
