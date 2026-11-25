<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Bukti pembayaran (resi/struk/catatan) yang diunggah pelanggan setelah membayar — arsip perusahaan. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->string('proof_path')->nullable()->after('paid_at');
            $table->string('proof_name', 200)->nullable()->after('proof_path');
            $table->text('proof_note')->nullable()->after('proof_name');
            $table->timestamp('proof_uploaded_at')->nullable()->after('proof_note');
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropColumn(['proof_path', 'proof_name', 'proof_note', 'proof_uploaded_at']);
        });
    }
};
