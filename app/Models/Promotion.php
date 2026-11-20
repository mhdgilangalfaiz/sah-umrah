<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Promotion extends Model
{
    protected $fillable = ['title', 'message', 'link', 'recipients', 'sent_by', 'sent_at'];

    protected function casts(): array
    {
        return ['sent_at' => 'datetime'];
    }

    public function sender() { return $this->belongsTo(User::class, 'sent_by'); }
}
