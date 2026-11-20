<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Refund extends Model
{
    protected $fillable = [
        'code', 'user_id', 'refundable_type', 'refundable_id', 'requested_amount', 'approved_amount', 'reason',
        'bank_name', 'account_number', 'account_holder', 'proof_path', 'status', 'admin_note', 'transfer_proof_path',
        'reviewed_by', 'reviewed_at',
    ];

    protected $hidden = ['account_number'];

    protected $attributes = ['status' => 'diajukan'];

    protected function casts(): array
    {
        return [
            'account_number' => 'encrypted', 'reviewed_at' => 'datetime',
            'requested_amount' => 'integer', 'approved_amount' => 'integer',
        ];
    }

    public function refundable() { return $this->morphTo(); }
    public function user() { return $this->belongsTo(User::class); }
    public function reviewer() { return $this->belongsTo(User::class, 'reviewed_by'); }
}
