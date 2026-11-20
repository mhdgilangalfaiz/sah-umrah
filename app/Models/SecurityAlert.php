<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SecurityAlert extends Model
{
    protected $fillable = ['type', 'severity', 'message', 'context', 'resolved_at'];

    protected function casts(): array
    {
        return ['context' => 'array', 'resolved_at' => 'datetime'];
    }
}
