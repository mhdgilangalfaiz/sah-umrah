<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Sederhanakan peran menjadi 3: customer (user), admin, super_admin.
 *  - finance / operasional / cs  → admin
 *  - super_admin yang bukan admin utama → admin (super_admin kini hanya untuk pemilik: lihat laporan & buat akun admin)
 *  - admin utama (is_primary_admin) tetap super_admin
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('users')->whereIn('role', ['finance', 'operasional', 'cs'])->update(['role' => 'admin']);
        DB::table('users')->where('role', 'super_admin')->where('is_primary_admin', false)->update(['role' => 'admin']);
    }

    public function down(): void
    {
        // Pemetaan lama (finance/operasional/cs) tidak dapat dipulihkan dengan pasti; admin dikembalikan ke operasional.
        DB::table('users')->where('role', 'admin')->update(['role' => 'operasional']);
    }
};
