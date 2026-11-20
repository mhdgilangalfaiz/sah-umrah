<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WebhookEvent extends Model
{
    protected $fillable = ['gateway', 'event_id', 'event_type', 'signature_valid', 'payload', 'result', 'processed_at'];

    protected function casts(): array
    {
        return ['payload' => 'array', 'signature_valid' => 'boolean', 'processed_at' => 'datetime'];
    }
}
