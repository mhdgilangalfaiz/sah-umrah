<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Hasil pemeriksaan per file di dalam berkas (mis. isi ZIP berkas visa):
 * [{name: "paspor-budi.jpg", ok: true|false, note: "foto buram"}]
 * Pelanggan melihat persis dokumen mana yang perlu diperbaiki.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->json('review')->nullable()->after('rejection_note');
        });
    }

    public function down(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->dropColumn('review');
        });
    }
};
