<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Pesanan: jamaah tersimpan, booking umrah, order tiket, pengajuan visa, penumpang (polymorphic).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('jamaah', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('full_name');
            $table->string('relation', 30)->default('diri_sendiri'); // diri_sendiri|suami|istri|anak|orang_tua|saudara|lainnya
            $table->text('nik')->nullable();             // terenkripsi
            $table->text('passport_number')->nullable(); // terenkripsi
            $table->string('passport_place')->nullable();
            $table->date('passport_issued_at')->nullable();
            $table->date('passport_expiry')->nullable();
            $table->string('birth_place')->nullable();
            $table->date('birth_date')->nullable();
            $table->string('gender', 10)->nullable();
            $table->string('phone', 30)->nullable();
            $table->foreignId('mahram_id')->nullable()->constrained('jamaah')->nullOnDelete();
            $table->string('mahram_relation', 30)->nullable();
            $table->timestamps();
        });

        Schema::create('bookings', function (Blueprint $table) {
            $table->id();
            $table->string('code', 30)->unique();
            $table->foreignId('user_id')->constrained();
            $table->foreignId('package_departure_id')->constrained();
            $table->string('room_type', 10); // quad|triple|double
            $table->unsignedSmallInteger('pax_count');
            $table->decimal('unit_price', 15, 0);
            $table->decimal('total_amount', 15, 0);
            $table->decimal('paid_amount', 15, 0)->default(0);
            $table->string('payment_scheme', 10); // lunas|cicilan
            // menunggu_pembayaran | cicilan_berjalan | lunas | dibatalkan | kedaluwarsa | selesai
            $table->string('status', 30)->default('menunggu_pembayaran')->index();
            $table->boolean('seats_confirmed')->default(false);
            $table->timestamp('hold_expires_at')->nullable();
            $table->date('payment_deadline')->nullable(); // batas pelunasan (H-30 keberangkatan)
            $table->text('notes')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->string('cancel_reason')->nullable();
            $table->timestamps();
        });

        Schema::create('flight_orders', function (Blueprint $table) {
            $table->id();
            $table->string('code', 30)->unique();
            $table->foreignId('user_id')->constrained();
            $table->foreignId('flight_id')->constrained();
            $table->unsignedSmallInteger('pax_count');
            $table->decimal('unit_price', 15, 0);
            $table->decimal('total_amount', 15, 0);
            $table->decimal('paid_amount', 15, 0)->default(0);
            // menunggu_pembayaran | dibayar | tiket_terbit | dibatalkan | kedaluwarsa
            $table->string('status', 30)->default('menunggu_pembayaran')->index();
            $table->string('contact_email')->nullable();
            $table->string('contact_phone', 30)->nullable();
            $table->string('pnr', 20)->nullable();
            $table->timestamp('issued_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
        });

        Schema::create('visa_applications', function (Blueprint $table) {
            $table->id();
            $table->string('code', 30)->unique();
            $table->foreignId('user_id')->constrained();
            $table->foreignId('visa_service_id')->constrained();
            $table->unsignedSmallInteger('pax_count');
            $table->date('planned_departure')->nullable();
            $table->text('notes')->nullable();
            // menunggu_invoice | menunggu_pembayaran | menunggu_dokumen | diverifikasi | diproses | terbit | ditolak | dibatalkan
            $table->string('status', 30)->default('menunggu_invoice')->index();
            $table->decimal('unit_price', 15, 0)->default(0);
            $table->decimal('extra_fee', 15, 0)->default(0);
            $table->string('extra_fee_label')->nullable();
            $table->decimal('discount', 15, 0)->default(0);
            $table->decimal('total_amount', 15, 0)->default(0);
            $table->decimal('paid_amount', 15, 0)->default(0);
            $table->timestamp('invoice_issued_at')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->timestamp('issued_at')->nullable();
            $table->timestamps();
        });

        Schema::create('visa_status_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('visa_application_id')->constrained()->cascadeOnDelete();
            $table->string('from_status', 30)->nullable();
            $table->string('to_status', 30);
            $table->text('note')->nullable();
            $table->foreignId('changed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // Penumpang/jamaah per pesanan (umrah, tiket, visa) — polymorphic
        Schema::create('booking_passengers', function (Blueprint $table) {
            $table->id();
            $table->morphs('orderable');
            $table->foreignId('jamaah_id')->nullable()->constrained('jamaah')->nullOnDelete();
            $table->string('title', 10)->nullable(); // Tn/Ny/Nn/An
            $table->string('full_name');
            $table->string('gender', 10)->nullable();
            $table->date('birth_date')->nullable();
            $table->text('nik')->nullable();             // terenkripsi
            $table->text('passport_number')->nullable(); // terenkripsi
            $table->date('passport_expiry')->nullable();
            $table->string('nationality', 30)->default('Indonesia');
            $table->string('mahram_name')->nullable();
            $table->string('mahram_relation', 30)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('booking_passengers');
        Schema::dropIfExists('visa_status_logs');
        Schema::dropIfExists('visa_applications');
        Schema::dropIfExists('flight_orders');
        Schema::dropIfExists('bookings');
        Schema::dropIfExists('jamaah');
    }
};
