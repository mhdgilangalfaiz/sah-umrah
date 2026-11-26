<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Manifest hanya diunggah pembeli; admin memeriksa lalu "menerima" atau "meminta perbaikan".
 * Setelah diterima, admin mengajukan data ke maskapai (di luar sistem).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('flight_orders', function (Blueprint $table) {
            $table->timestamp('manifest_accepted_at')->nullable()->after('manifest_warnings');
            $table->foreignId('manifest_accepted_by')->nullable()->after('manifest_accepted_at')->constrained('users')->nullOnDelete();
            $table->text('manifest_revision_note')->nullable()->after('manifest_accepted_by');
        });
    }

    public function down(): void
    {
        Schema::table('flight_orders', function (Blueprint $table) {
            $table->dropConstrainedForeignId('manifest_accepted_by');
            $table->dropColumn(['manifest_accepted_at', 'manifest_revision_note']);
        });
    }
};
