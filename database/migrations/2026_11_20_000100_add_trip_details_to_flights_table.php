<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tiket pesawat berbasis seat dari mitra (bukan API maskapai):
 * - trip_type: sekali jalan (oneway) atau pulang-pergi (pp) dalam satu harga
 * - segments / return_segments: rute per penerbangan, mis. KNO→KUL→JED (transit)
 * - seats_total: alokasi seat dari mitra; seats_available tetap = sisa yang bisa dijual
 * - seats_updated_at: kapan admin terakhir memperbarui seat secara manual
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('flights', function (Blueprint $table) {
            $table->string('trip_type', 10)->default('oneway')->after('cabin_class');
            $table->json('segments')->nullable()->after('transit_info');
            $table->json('return_segments')->nullable()->after('segments');
            $table->dateTime('return_depart_at')->nullable()->after('return_segments');
            $table->dateTime('return_arrive_at')->nullable()->after('return_depart_at');
            $table->unsignedInteger('seats_total')->nullable()->after('seats_available');
            $table->timestamp('seats_updated_at')->nullable()->after('seats_total');
        });
    }

    public function down(): void
    {
        Schema::table('flights', function (Blueprint $table) {
            $table->dropColumn(['trip_type', 'segments', 'return_segments', 'return_depart_at', 'return_arrive_at', 'seats_total', 'seats_updated_at']);
        });
    }
};
