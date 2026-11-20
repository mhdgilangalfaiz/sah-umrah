<?php

namespace App\Security\Finance;

use App\Models\SecurityAlert;
use App\Models\User;
use App\Support\AdminNotifier;
use App\Support\Audit;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * PENJAGA PERUBAHAN DATA KEUANGAN / REKENING BANK
 *
 * Prinsip "default tolak":
 *  1. Perubahan rekening dari panel admin TIDAK langsung berlaku. Rekening baru berstatus `pending_verification`.
 *  2. Email peringatan dikirim ke FINANCE_OWNER_EMAIL (diatur di .env — tidak bisa diubah dari web,
 *     sehingga peretas yang menguasai panel admin tidak bisa mengalihkan email ini).
 *  3. Pemilik memilih:
 *       - "Setujui"  → rekening baru aktif, rekening lama berstatus `replaced`.
 *       - "Batalkan & Blokir" → rekening baru langsung DIBLOKIR & dimatikan; akun admin pengaju dinonaktifkan
 *         (kecuali admin utama) dan semua sesinya diputus.
 *  4. Tidak ada respons dalam FINANCE_APPROVAL_HOURS jam → otomatis diblokir (finance:verify-integrity).
 *  5. Setiap baris disegel HMAC dengan FINANCE_INTEGRITY_KEY; perubahan langsung di DB terdeteksi & diblokir.
 */
class BankAccountGuard
{
    public static function seal(CompanyBankAccount $a): string
    {
        $key = (string) config('finance.integrity_key');
        if ($key === '') {
            throw new RuntimeException('FINANCE_INTEGRITY_KEY belum diatur di .env');
        }

        return hash_hmac('sha256', implode('|', [
            $a->id ?? 'new', $a->bank_name, $a->account_number, $a->account_holder, $a->purpose, $a->status,
        ]), $key);
    }

    public static function isIntact(CompanyBankAccount $a): bool
    {
        try {
            return hash_equals(self::seal($a), (string) $a->integrity_hash);
        } catch (\Throwable) {
            return false;
        }
    }

    private function persist(CompanyBankAccount $a): void
    {
        if (! $a->exists) {
            $a->integrity_hash = 'pending';
            $a->saveQuietly();
        }
        $a->integrity_hash = self::seal($a);
        $a->saveQuietly();
    }

    /** Rekening aktif yang VALID untuk suatu tujuan (null jika tidak ada / segel rusak) */
    public function active(string $purpose = 'settlement'): ?CompanyBankAccount
    {
        $a = CompanyBankAccount::where('purpose', $purpose)->where('status', 'active')->latest('approved_at')->first();
        if ($a && ! self::isIntact($a)) {
            $this->block($a, 'Segel integritas tidak cocok (indikasi perubahan langsung di database)');

            return null;
        }

        return $a;
    }

    /** Admin mengajukan rekening baru/perubahan → menunggu persetujuan pemilik via email */
    public function requestChange(array $data, User $by): CompanyBankAccount
    {
        $token = Str::random(64);

        $account = DB::transaction(function () use ($data, $by, $token) {
            $a = new CompanyBankAccount([
                'bank_name' => $data['bank_name'],
                'account_number' => preg_replace('/\D/', '', $data['account_number']),
                'account_holder' => $data['account_holder'],
                'purpose' => $data['purpose'] ?? 'settlement',
                'status' => 'pending_verification',
                'approval_token_hash' => hash('sha256', $token),
                'approval_expires_at' => now()->addHours((int) config('finance.approval_hours', 24)),
                'requested_by' => $by->id,
                'requested_ip' => request()?->ip(),
            ]);
            $this->persist($a);

            return $a;
        });

        $approve = URL::temporarySignedRoute('finance.bank.decision', $account->approval_expires_at, ['account' => $account->id, 'token' => $token, 'decision' => 'approve']);
        $cancel = URL::temporarySignedRoute('finance.bank.decision', $account->approval_expires_at, ['account' => $account->id, 'token' => $token, 'decision' => 'cancel']);

        Notification::route('mail', config('finance.owner_email'))
            ->notify(new BankChangeRequestedNotification($account, $by, $approve, $cancel));

        $this->alert('bank_change_requested', "Permintaan perubahan rekening {$account->bank_name} ••{$account->masked_number} oleh {$by->name}", [
            'account_id' => $account->id, 'by' => $by->id, 'ip' => request()?->ip(),
        ]);
        Audit::log('keuangan.rekening_diajukan', "Mengajukan rekening {$account->bank_name} {$account->masked_number} (menunggu persetujuan pemilik via email)", $account, [], [
            'bank_name' => $account->bank_name, 'account_holder' => $account->account_holder, 'purpose' => $account->purpose,
        ], $by);

        return $account;
    }

    public function decide(CompanyBankAccount $account, string $token, string $decision): string
    {
        if ($account->status !== 'pending_verification') {
            return 'Permintaan ini sudah diproses sebelumnya (status: '.$account->status.').';
        }
        if (! hash_equals((string) $account->approval_token_hash, hash('sha256', $token))) {
            throw new RuntimeException('Token persetujuan tidak valid.');
        }
        if (! self::isIntact($account)) {
            $this->block($account, 'Segel integritas rusak saat persetujuan');

            return 'Data rekening terdeteksi diubah tanpa izin. Rekening telah DIBLOKIR.';
        }

        if ($decision === 'approve') {
            DB::transaction(function () use ($account) {
                CompanyBankAccount::where('purpose', $account->purpose)->where('status', 'active')->get()
                    ->each(function ($old) {
                        $old->status = 'replaced';
                        $this->persist($old);
                    });
                $account->status = 'active';
                $account->approved_at = now();
                $account->approval_token_hash = null;
                $this->persist($account);
            });
            Audit::log('keuangan.rekening_disetujui', "Pemilik menyetujui rekening {$account->bank_name} {$account->masked_number}", $account, [], [], null);
            AdminNotifier::notify(['finance'], 'keamanan', 'Rekening baru disetujui pemilik',
                "{$account->bank_name} {$account->masked_number} kini aktif.", route('admin.finance.bank.index'), false, 'success');

            return 'Rekening baru telah DISETUJUI dan aktif.';
        }

        $this->block($account, 'Dibatalkan oleh pemilik melalui email', true);

        return 'Perubahan DIBATALKAN. Rekening baru telah diblokir dan dimatikan, akun admin pengaju dinonaktifkan.';
    }

    public function block(CompanyBankAccount $account, string $reason, bool $suspendRequester = false): void
    {
        DB::transaction(function () use ($account, $reason, $suspendRequester) {
            $account->status = 'blocked';
            $account->blocked_at = now();
            $account->blocked_reason = $reason;
            $account->approval_token_hash = null;
            $this->persist($account);

            // Nonaktifkan akun pengaju (bukan admin utama) & putus semua sesinya
            $requester = $account->requester;
            if ($suspendRequester && $requester && ! $requester->is_primary_admin) {
                $requester->forceFill(['is_active' => false, 'remember_token' => Str::random(60)])->save();
                DB::table('sessions')->where('user_id', $requester->id)->delete();
            }
        });

        $this->alert('bank_account_blocked', "Rekening {$account->bank_name} {$account->masked_number} DIBLOKIR: $reason", ['account_id' => $account->id]);
        Audit::log('keuangan.rekening_diblokir', "Rekening {$account->bank_name} {$account->masked_number} diblokir: $reason", $account, [], [], null);
        AdminNotifier::notify([], 'keamanan', 'PERINGATAN: rekening diblokir', $reason, route('admin.finance.bank.index'), true, 'danger');
    }

    /** Cron: periksa segel semua rekening + blokir permintaan yang kedaluwarsa */
    public function verifyAll(): array
    {
        $violations = 0;
        $expired = 0;
        foreach (CompanyBankAccount::whereIn('status', ['active', 'pending_verification', 'replaced'])->get() as $a) {
            if (! self::isIntact($a)) {
                $this->block($a, 'Segel integritas tidak cocok (indikasi perubahan langsung di database)');
                $violations++;
                continue;
            }
            if ($a->status === 'pending_verification' && $a->approval_expires_at?->isPast()) {
                $this->block($a, 'Tidak ada persetujuan pemilik dalam batas waktu');
                $expired++;
            }
        }

        return compact('violations', 'expired');
    }

    private function alert(string $type, string $message, array $context = []): void
    {
        SecurityAlert::create(['type' => $type, 'severity' => 'high', 'message' => $message, 'context' => $context]);
    }
}
