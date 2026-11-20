<?php

namespace App\Contracts;

use App\Models\Payment;

/**
 * Kontrak untuk semua yang dapat dibayar lewat gateway: Booking (umrah), FlightOrder, VisaApplication.
 */
interface Payable
{
    /** Sisa tagihan yang belum dibayar */
    public function outstandingAmount(): int;

    /** Nominal minimum untuk pembayaran berikutnya (mis. deposit awal umrah) */
    public function minimumPayment(): int;

    /** Apakah pelanggan boleh memilih nominal sendiri (cicilan fleksibel) */
    public function allowsCustomAmount(): bool;

    /** Apakah saat ini boleh membuat transaksi pembayaran baru */
    public function canBePaid(): bool;

    /** Batas waktu VA/QRIS untuk pembayaran ini */
    public function paymentExpiry(): \Carbon\CarbonInterface;

    /** Dipanggil (di dalam transaksi DB) setelah pembayaran dinyatakan sukses oleh webhook */
    public function applyPayment(Payment $payment): void;

    public function payableLabel(): string;

    public function customerUrl(): string;
}
