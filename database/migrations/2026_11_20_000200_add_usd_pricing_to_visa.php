<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Harga visa ditetapkan dalam USD; pembayaran tetap Rupiah dengan kurs saat pembelian.
 * Kurs yang dipakai dicatat di setiap pengajuan agar nilai invoice dapat ditelusuri.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('visa_services', function (Blueprint $table) {
            $table->decimal('price_usd', 10, 2)->nullable()->after('price');
        });
        Schema::table('visa_applications', function (Blueprint $table) {
            $table->decimal('unit_price_usd', 10, 2)->nullable()->after('unit_price');
            $table->decimal('exchange_rate', 12, 2)->nullable()->after('unit_price_usd');
        });
    }

    public function down(): void
    {
        Schema::table('visa_services', fn (Blueprint $table) => $table->dropColumn('price_usd'));
        Schema::table('visa_applications', fn (Blueprint $table) => $table->dropColumn(['unit_price_usd', 'exchange_rate']));
    }
};
