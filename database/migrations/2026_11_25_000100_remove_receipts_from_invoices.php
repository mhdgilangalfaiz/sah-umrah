<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Kwitansi tidak dipakai lagi: setiap pembayaran cukup tercatat di "Riwayat Pembayaran" pada invoice.
 * Data pembayaran tetap utuh di tabel payments, jadi kwitansi lama aman dihapus agar tidak menumpuk.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('invoices')->where('type', 'kwitansi')->delete();
    }

    public function down(): void
    {
        // tidak dapat dipulihkan (kwitansi dapat diganti riwayat pembayaran di invoice)
    }
};
