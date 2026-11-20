<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PaymentInstallment extends Model
{
    protected $fillable = ['booking_id', 'sequence', 'label', 'amount', 'paid_amount', 'due_date', 'status', 'last_reminded_at', 'reminder_count'];

    protected function casts(): array
    {
        return ['due_date' => 'date:Y-m-d', 'last_reminded_at' => 'datetime', 'amount' => 'integer', 'paid_amount' => 'integer'];
    }

    public function booking() { return $this->belongsTo(Booking::class); }
    public function payments() { return $this->hasMany(Payment::class); }
}
