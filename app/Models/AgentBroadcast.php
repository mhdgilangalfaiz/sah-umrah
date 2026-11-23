<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Satu kali siaran WhatsApp ke semua agen (paket / tiket / visa / promo / pesan bebas). */
class AgentBroadcast extends Model
{
    public const TYPES = ['paket' => 'Paket Umrah', 'tiket' => 'Tiket Pesawat', 'visa' => 'Layanan Visa', 'promo' => 'Promo', 'bebas' => 'Pesan Bebas'];

    protected $fillable = ['item_type', 'item_id', 'title', 'message', 'recipients', 'sent_by'];

    public function recipientsList() { return $this->hasMany(AgentBroadcastRecipient::class); }
    public function sender() { return $this->belongsTo(User::class, 'sent_by'); }
}
