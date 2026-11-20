<?php

namespace App\Console\Commands;

use App\Security\Finance\BankAccountGuard;
use Illuminate\Console\Command;

class VerifyFinanceIntegrity extends Command
{
    protected $signature = 'finance:verify-integrity';
    protected $description = 'Periksa segel HMAC rekening perusahaan & blokir permintaan perubahan yang kedaluwarsa';

    public function handle(BankAccountGuard $guard): int
    {
        $r = $guard->verifyAll();
        $this->info("Pelanggaran integritas: {$r['violations']} | Permintaan kedaluwarsa diblokir: {$r['expired']}");

        return $r['violations'] > 0 ? self::FAILURE : self::SUCCESS;
    }
}
