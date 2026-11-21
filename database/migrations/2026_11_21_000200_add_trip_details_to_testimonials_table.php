<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Detail perjalanan pada testimoni (tampil di kartu ulasan landing page):
 * bulan keberangkatan jamaah dan nama paket yang diikuti.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('testimonials', function (Blueprint $table) {
            $table->date('departure_month')->nullable()->after('rating');
            $table->string('package_name', 150)->nullable()->after('departure_month');
        });
    }

    public function down(): void
    {
        Schema::table('testimonials', function (Blueprint $table) {
            $table->dropColumn(['departure_month', 'package_name']);
        });
    }
};
