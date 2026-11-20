<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Katalog layanan: Paket Umrah + jadwal keberangkatan, jadwal penerbangan (dikelola admin),
 * dan jenis layanan visa.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('packages', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('type', 20)->default('reguler'); // hemat | reguler | plus | vip
            $table->text('summary')->nullable();
            $table->longText('description')->nullable();
            $table->unsignedSmallInteger('duration_days')->default(9);
            $table->string('airline')->nullable();
            $table->string('departure_city')->default('Medan (KNO)');
            $table->string('hotel_makkah')->nullable();
            $table->unsignedTinyInteger('hotel_makkah_star')->default(4);
            $table->string('hotel_makkah_distance')->nullable();
            $table->string('hotel_madinah')->nullable();
            $table->unsignedTinyInteger('hotel_madinah_star')->default(4);
            $table->string('hotel_madinah_distance')->nullable();
            $table->decimal('price_quad', 15, 0);   // harga per orang kamar ber-4
            $table->decimal('price_triple', 15, 0); // ber-3
            $table->decimal('price_double', 15, 0); // ber-2
            $table->decimal('min_deposit', 15, 0)->default(3000000); // deposit awal wajib (default 3jt)
            $table->string('cover_image')->nullable();
            $table->json('gallery')->nullable();
            $table->json('itinerary')->nullable();   // [{day,title,description}]
            $table->json('facilities')->nullable();  // [string]
            $table->json('excludes')->nullable();    // [string]
            $table->json('document_requirements')->nullable(); // [string]
            $table->boolean('is_featured')->default(false);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('package_departures', function (Blueprint $table) {
            $table->id();
            $table->foreignId('package_id')->constrained()->cascadeOnDelete();
            $table->date('departure_date');
            $table->date('return_date');
            $table->unsignedInteger('quota');
            $table->unsignedInteger('booked')->default(0); // kursi terkonfirmasi (DP/lunas dibayar)
            $table->unsignedInteger('held')->default(0);   // kursi ditahan sementara (menunggu bayar)
            $table->string('status', 20)->default('open'); // open | closed | departed
            $table->timestamps();
            $table->index(['departure_date', 'status']);
        });

        // Jadwal penerbangan — TIDAK ada kerja sama API, admin yang memperbarui data.
        Schema::create('flights', function (Blueprint $table) {
            $table->id();
            $table->string('airline');
            $table->string('airline_code', 5)->nullable();
            $table->string('flight_number', 20);
            $table->string('origin_code', 5);
            $table->string('origin_city');
            $table->string('destination_code', 5);
            $table->string('destination_city');
            $table->dateTime('depart_at');
            $table->dateTime('arrive_at');
            $table->unsignedSmallInteger('transit_count')->default(0);
            $table->string('transit_info')->nullable();
            $table->string('cabin_class', 20)->default('ekonomi'); // ekonomi | bisnis | first
            $table->decimal('price', 15, 0);
            $table->unsignedSmallInteger('baggage_kg')->default(30);
            $table->unsignedSmallInteger('cabin_baggage_kg')->default(7);
            $table->unsignedInteger('seats_available')->default(0);
            $table->text('refund_policy')->nullable();
            $table->text('reschedule_policy')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->index(['origin_code', 'destination_code', 'depart_at']);
        });

        Schema::create('visa_services', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->json('requirements')->nullable(); // [string]
            $table->unsignedSmallInteger('processing_days')->default(7);
            $table->decimal('price', 15, 0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('visa_services');
        Schema::dropIfExists('flights');
        Schema::dropIfExists('package_departures');
        Schema::dropIfExists('packages');
    }
};
