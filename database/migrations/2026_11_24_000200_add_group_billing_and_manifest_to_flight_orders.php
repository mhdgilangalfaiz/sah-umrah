<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Pemesanan seat tiket secara grup (agen travel) maupun perorangan:
 *  - pembeli memilih jumlah seat sendiri, tanpa mengisi data penumpang saat memesan
 *  - data penerima invoice (nama travel/perusahaan + penanggung jawab) dicantumkan di invoice
 *  - pembayaran bisa dicicil sampai lunas; setelah lunas pembeli mengunggah manifest (Excel)
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('flight_orders', function (Blueprint $table) {
            $table->string('buyer_type', 12)->default('perorangan')->after('user_id'); // agen | perorangan
            $table->string('bill_company', 150)->nullable()->after('buyer_type');
            $table->string('bill_name', 150)->nullable()->after('bill_company');
            $table->text('bill_address')->nullable()->after('bill_name');
            $table->timestamp('settlement_due_at')->nullable()->after('expires_at');
            $table->timestamp('manifest_uploaded_at')->nullable()->after('settlement_due_at');
            $table->json('manifest_warnings')->nullable()->after('manifest_uploaded_at');
        });
    }

    public function down(): void
    {
        Schema::table('flight_orders', function (Blueprint $table) {
            $table->dropColumn(['buyer_type', 'bill_company', 'bill_name', 'bill_address', 'settlement_due_at', 'manifest_uploaded_at', 'manifest_warnings']);
        });
    }
};
