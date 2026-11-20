<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TicketMessage extends Model
{
    protected $fillable = ['support_ticket_id', 'sender_type', 'sender_id', 'message', 'options', 'read_at'];

    protected function casts(): array
    {
        return ['options' => 'array', 'read_at' => 'datetime'];
    }

    public function ticket() { return $this->belongsTo(SupportTicket::class, 'support_ticket_id'); }
    public function sender() { return $this->belongsTo(User::class, 'sender_id'); }
}
