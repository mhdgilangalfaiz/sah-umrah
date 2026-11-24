<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Revisi invoice oleh admin (mis. seat tiket terpakai 30 → 28, detail flight berubah).
 * Setiap revisi menerbitkan invoice baru bernomor "-R{n}"; invoice lama berstatus "direvisi" (tetap tersimpan sebagai riwayat).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->unsignedSmallInteger('revision')->default(0)->after('status');
            $table->foreignId('replaces_id')->nullable()->after('revision')->constrained('invoices')->nullOnDelete();
            $table->text('notes')->nullable()->after('items'); // alasan revisi, tampil di PDF
            $table->json('details')->nullable()->after('notes'); // mis. detail penerbangan versi revisi
            $table->foreignId('revised_by')->nullable()->after('replaces_id')->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropConstrainedForeignId('replaces_id');
            $table->dropConstrainedForeignId('revised_by');
            $table->dropColumn(['revision', 'notes', 'details']);
        });
    }
};
