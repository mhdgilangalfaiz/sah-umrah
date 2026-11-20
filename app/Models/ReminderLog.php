<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReminderLog extends Model
{
    protected $fillable = ['remindable_type', 'remindable_id', 'type', 'channel', 'sent_on'];

    protected function casts(): array
    {
        return ['sent_on' => 'date'];
    }

    public function remindable() { return $this->morphTo(); }
}
