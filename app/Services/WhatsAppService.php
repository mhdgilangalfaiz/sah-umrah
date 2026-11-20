<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Pengirim WhatsApp otomatis (satu arah) untuk pengingat pembayaran & keberangkatan.
 * Default provider: Fonnte (https://fonnte.com). Jika WHATSAPP_TOKEN kosong, pesan hanya dicatat ke log.
 */
class WhatsAppService
{
    public function send(string $phone, string $message): bool
    {
        $phone = $this->normalize($phone);
        $token = config('services.whatsapp.token');

        if (! $token) {
            Log::channel(config('logging.default'))->info("[WA-SIMULASI] ke $phone: $message");

            return true;
        }

        try {
            $res = Http::withHeaders(['Authorization' => $token])->asForm()->timeout(15)
                ->post(config('services.whatsapp.endpoint'), ['target' => $phone, 'message' => $message, 'countryCode' => '62']);

            return $res->successful();
        } catch (\Throwable $e) {
            Log::warning('WhatsApp gagal: '.$e->getMessage());

            return false;
        }
    }

    public function normalize(string $phone): string
    {
        $p = preg_replace('/\D/', '', $phone);
        if (str_starts_with($p, '0')) $p = '62'.substr($p, 1);

        return $p;
    }
}
