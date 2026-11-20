<?php

namespace App\Security\Finance;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;

/**
 * Rekening bank perusahaan (rekening settlement gateway & sumber refund).
 * Setiap baris disegel dengan HMAC (integrity_hash). Bila seseorang mengubah data langsung di database
 * tanpa melalui BankAccountGuard, segel tidak cocok → rekening otomatis diblokir + alarm keamanan.
 */
class CompanyBankAccount extends Model
{
    protected $table = 'company_bank_accounts';

    protected $fillable = [
        'bank_name', 'account_number', 'account_holder', 'purpose', 'status', 'integrity_hash',
        'approval_token_hash', 'approval_expires_at', 'requested_by', 'requested_ip', 'approved_at', 'blocked_at', 'blocked_reason',
    ];

    protected $hidden = ['account_number', 'integrity_hash', 'approval_token_hash'];

    protected $appends = ['masked_number'];

    protected function casts(): array
    {
        return [
            'account_number' => 'encrypted',
            'approval_expires_at' => 'datetime',
            'approved_at' => 'datetime',
            'blocked_at' => 'datetime',
        ];
    }

    public function getMaskedNumberAttribute(): string
    {
        $n = (string) $this->account_number;

        return str_repeat('•', max(strlen($n) - 4, 0)).substr($n, -4);
    }

    public function requester() { return $this->belongsTo(User::class, 'requested_by'); }
}
