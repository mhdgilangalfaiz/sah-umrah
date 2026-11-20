<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class SupportTicket extends Model
{
    public const STATUSES = [
        'bot' => 'Dilayani Asisten Otomatis',
        'menunggu_admin' => 'Menunggu Admin',
        'ditangani' => 'Ditangani Admin',
        'selesai' => 'Selesai',
    ];

    protected $fillable = [
        'code', 'user_id', 'guest_token', 'subject', 'category', 'status', 'assigned_to', 'escalated_at', 'closed_at', 'last_message_at',
    ];

    protected $attributes = ['status' => 'bot', 'category' => 'umum'];

    protected function casts(): array
    {
        return ['escalated_at' => 'datetime', 'closed_at' => 'datetime', 'last_message_at' => 'datetime'];
    }

    protected static function booted(): void
    {
        static::creating(function (SupportTicket $t) {
            $t->code ??= 'TKT-'.now()->format('ymd').'-'.strtoupper(Str::random(5));
            $t->last_message_at ??= now();
        });
    }

    public function user() { return $this->belongsTo(User::class); }
    public function assignee() { return $this->belongsTo(User::class, 'assigned_to'); }
    public function messages() { return $this->hasMany(TicketMessage::class)->orderBy('id'); }
    public function latestMessage() { return $this->hasOne(TicketMessage::class)->latestOfMany(); }

    public function getRouteKeyName(): string { return 'code'; }
}
