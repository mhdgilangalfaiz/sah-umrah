<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Pengirim WhatsApp otomatis (satu arah): pengingat pembayaran, keberangkatan, dan siaran ke agen.
 * Default provider: Fonnte (https://fonnte.com). Jika WHATSAPP_TOKEN kosong, pesan hanya dicatat ke log (simulasi).
 *
 * Catatan Fonnte: HTTP 200 belum tentu terkirim — status sebenarnya ada di JSON {"status": true|false, "reason": "..."}.
 */
class WhatsAppService
{
    public function send(string $phone, string $message): bool
    {
        return $this->sendDetailed($phone, $message)['ok'];
    }

    /** @return array{ok: bool, simulated: bool, reason: ?string} */
    public function sendDetailed(string $phone, string $message): array
    {
        $phone = $this->normalize($phone);
        $token = config('services.whatsapp.token');

        if (! $token) {
            Log::channel(config('logging.default'))->info("[WA-SIMULASI] ke $phone: $message");

            return ['ok' => true, 'simulated' => true, 'reason' => null];
        }

        try {
            $res = Http::withHeaders(['Authorization' => $token])->asForm()->timeout(20)
                ->post(config('services.whatsapp.endpoint'), ['target' => $phone, 'message' => $message, 'countryCode' => '62']);
            $body = $res->json() ?? [];
            $ok = $res->successful() && ($body['status'] ?? false) === true;
            $reason = $ok ? null : (string) ($body['reason'] ?? $body['detail'] ?? 'HTTP '.$res->status());
            if (! $ok) Log::warning("WhatsApp gagal ke $phone: $reason");

            return ['ok' => $ok, 'simulated' => false, 'reason' => $reason ? mb_substr($reason, 0, 250) : null];
        } catch (\Throwable $e) {
            Log::warning('WhatsApp gagal: '.$e->getMessage());

            return ['ok' => false, 'simulated' => false, 'reason' => 'Tidak dapat terhubung ke Fonnte: '.mb_substr($e->getMessage(), 0, 200)];
        }
    }

    public function normalize(string $phone): string
    {
        $p = preg_replace('/\D/', '', $phone);
        if (str_starts_with($p, '0')) $p = '62'.substr($p, 1);

        return $p;
    }
}
