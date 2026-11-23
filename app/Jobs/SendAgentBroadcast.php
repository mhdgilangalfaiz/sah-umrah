<?php

namespace App\Jobs;

use App\Models\AgentBroadcast;
use App\Services\WhatsAppService;
use App\Support\AgentMessage;
use Illuminate\Foundation\Bus\Dispatchable;

/**
 * Kirim siaran ke semua penerima yang masih "antri", satu per satu dengan jeda
 * (mengurangi risiko nomor WA diblokir karena mengirim terlalu cepat).
 * Dijalankan setelah respons dikirim ke browser → tidak perlu queue worker.
 */
class SendAgentBroadcast
{
    use Dispatchable;

    public function __construct(public int $broadcastId) {}

    public function handle(WhatsAppService $wa): void
    {
        $broadcast = AgentBroadcast::find($this->broadcastId);
        if (! $broadcast) return;

        @set_time_limit(0);
        $simulate = ! config('services.whatsapp.token');
        $delay = (float) config('services.whatsapp.broadcast_delay', 2);
        $first = true;

        foreach ($broadcast->recipientsList()->where('status', 'antri')->get() as $r) {
            if (! $r->phone) {
                $r->update(['status' => 'gagal', 'error' => 'Nomor WhatsApp belum diisi']);

                continue;
            }
            if (! $first && $delay > 0 && ! $simulate) usleep((int) ($delay * 1_000_000));
            $first = false;

            $ok = $wa->send($r->phone, AgentMessage::personalize($broadcast->message, $r->name));
            $r->update([
                'status' => $ok ? ($simulate ? 'simulasi' : 'terkirim') : 'gagal',
                'error' => $ok ? null : 'Ditolak penyedia WhatsApp',
                'sent_at' => $ok ? now() : null,
            ]);
        }
    }
}
