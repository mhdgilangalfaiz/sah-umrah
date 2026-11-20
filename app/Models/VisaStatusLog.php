<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VisaStatusLog extends Model
{
    protected $fillable = ['visa_application_id', 'from_status', 'to_status', 'note', 'changed_by'];

    public function changer() { return $this->belongsTo(User::class, 'changed_by'); }
}
