<?php

namespace App\Services\Payment;

use App\Contracts\Payable;
use App\Models\Payment;
use App\Models\User;
use App\Notifications\SystemNotification;
use App\Services\FileStorage;
use App\Support\AdminNotifier;
use App\Support\Audit;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Pembayaran tunai di kantor:
 * 1. Jamaah membayar tunai di kantor dan menerima kwitansi kantor.
 * 2. Jamaah mengunggah kwitansi tsb + nominal & tanggal bayar → transaksi "Menunggu Verifikasi".
 * 3. Admin memverifikasi → transaksi dibayar, sisa tagihan berkurang & tercatat di riwayat pembayaran invoice.
 *    Admin menolak (dengan alasan) → jamaah diberi tahu dan dapat mengunggah ulang.
 */
class CashPaymentService
{
    public const METHOD = 'tunai';
    public const GATEWAY = 'manual';

    public function __construct(private PaymentService $payments) {}

    public function submit(Model&Payable $payable, User $user, int $amount, Carbon $paidAt, UploadedFile $receipt, ?string $note): Payment
    {
        $payment = DB::transaction(function () use ($payable, $user, $amount, $paidAt, $receipt, $note) {
            $payable = $payable->newQuery()->lockForUpdate()->findOrFail($payable->getKey());
            $pending = (int) $payable->payments()->where('status', 'menunggu_verifikasi')->sum('amount');
            $room = $payable->outstandingAmount() - $pending;
            if ($amount > $room) {
                throw ValidationException::withMessages(['amount' => $room > 0
                    ? 'Nominal melebihi sisa tagihan yang belum diverifikasi (maks. Rp'.number_format($room, 0, ',', '.').').'
                    : 'Sisa tagihan sudah tertutup oleh pembayaran yang menunggu verifikasi.']);
            }

            $payment = Payment::create([
                'code' => 'PAY-'.now()->format('ymdHis').'-'.strtoupper(Str::random(5)),
                'user_id' => $user->id,
                'payable_type' => $payable->getMorphClass(), 'payable_id' => $payable->getKey(),
                'amount' => $amount, 'method' => self::METHOD, 'gateway' => self::GATEWAY,
                'status' => 'menunggu_verifikasi', 'idempotency_key' => 'cash:'.Str::uuid(),
                'paid_at' => $paidAt,
                'proof_path' => FileStorage::storePrivate($receipt, 'payment-proofs/'.$payable->user_id, 'kwitansi-tunai-'.$payable->code, $user, $payable->user),
                'proof_name' => substr($receipt->getClientOriginalName(), 0, 200),
                'proof_note' => $note,
                'proof_uploaded_at' => now(),
            ]);
            Audit::log('pembayaran.tunai_diajukan', "Pembayaran tunai {$payment->code} Rp".number_format($amount, 0, ',', '.')." untuk {$payable->code} menunggu verifikasi", $payment);

            return $payment;
        });

        AdminNotifier::notify('pembayaran', 'Verifikasi pembayaran tunai '.$payable->code,
            $user->name.' — Rp'.number_format($amount, 0, ',', '.').' (kwitansi kantor)', route('admin.bookings.show', $payable->code));

        return $payment;
    }

    /** Admin memverifikasi kwitansi → pembayaran sah, sisa tagihan berkurang */
    public function approve(Payment $payment, User $admin): void
    {
        DB::transaction(function () use ($payment, $admin) {
            $payment = Payment::lockForUpdate()->findOrFail($payment->id);
            if ($payment->status !== 'menunggu_verifikasi') {
                throw ValidationException::withMessages(['payment' => 'Pembayaran ini sudah diproses.']);
            }
            $payable = $payment->payable()->lockForUpdate()->first();
            if ((int) $payment->amount > $payable->outstandingAmount()) {
                throw ValidationException::withMessages(['payment' => 'Nominal melebihi sisa tagihan saat ini (Rp'.number_format($payable->outstandingAmount(), 0, ',', '.').'). Tolak dan minta jamaah mengunggah ulang dengan nominal yang benar.']);
            }
            $payment->update(['reviewed_by' => $admin->id, 'reviewed_at' => now()]);
            $this->payments->markPaid($payment, $payment->paid_at);
            Audit::log('pembayaran.tunai_diverifikasi', "Pembayaran tunai {$payment->code} diverifikasi", $payment);
        });
    }

    public function reject(Payment $payment, User $admin, string $note): void
    {
        abort_unless($payment->status === 'menunggu_verifikasi', 422, 'Pembayaran ini sudah diproses.');
        $payment->update(['status' => 'ditolak', 'review_note' => $note, 'reviewed_by' => $admin->id, 'reviewed_at' => now()]);
        Audit::log('pembayaran.tunai_ditolak', "Pembayaran tunai {$payment->code} ditolak: {$note}", $payment);

        $payable = $payment->payable;
        $payment->user->notify(new SystemNotification('pembayaran', 'Kwitansi Ditolak — '.$payable->code,
            'Bukti pembayaran tunai Rp'.number_format($payment->amount, 0, ',', '.').' belum dapat kami verifikasi: '.$note.' Silakan unggah ulang kwitansi yang benar.',
            $payable->customerUrl(), 'Unggah Ulang', true, false, 'warning'));
    }
}
