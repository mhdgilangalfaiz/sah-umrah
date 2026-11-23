<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Status kirim siaran per agen: antri → terkirim / simulasi (token WA kosong) / gagal. */
class AgentBroadcastRecipient extends Model
{
    public const STATUSES = ['antri' => 'Dalam antrean', 'terkirim' => 'Terkirim', 'simulasi' => 'Simulasi (WA belum aktif)', 'gagal' => 'Gagal'];

    protected $fillable = ['agent_broadcast_id', 'user_id', 'name', 'phone', 'status', 'error', 'sent_at'];

    protected function casts(): array
    {
        return ['sent_at' => 'datetime'];
    }

    public function broadcast() { return $this->belongsTo(AgentBroadcast::class, 'agent_broadcast_id'); }
    public function user() { return $this->belongsTo(User::class); }
}
