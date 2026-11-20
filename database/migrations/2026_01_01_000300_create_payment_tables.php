<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Pembayaran: transaksi gateway, termin cicilan, webhook (idempotensi), invoice/kwitansi, refund, dokumen.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_installments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('booking_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('sequence');
            $table->string('label'); // "Deposit Awal", "Termin 1", ...
            $table->decimal('amount', 15, 0);
            $table->decimal('paid_amount', 15, 0)->default(0);
            $table->date('due_date');
            $table->string('status', 20)->default('belum_dibayar'); // belum_dibayar|sebagian|lunas|terlambat
            $table->timestamp('last_reminded_at')->nullable();
            $table->unsignedInteger('reminder_count')->default(0);
            $table->timestamps();
        });

        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->string('code', 40)->unique(); // dipakai sebagai external_id ke gateway
            $table->foreignId('user_id')->constrained();
            $table->morphs('payable'); // Booking | FlightOrder | VisaApplication
            $table->foreignId('payment_installment_id')->nullable()->constrained()->nullOnDelete();
            $table->decimal('amount', 15, 0);
            $table->string('method', 20); // va_mandiri | va_bsi | va_muamalat | qris
            $table->string('gateway', 20); // xendit | simulator
            $table->string('gateway_id')->nullable();
            $table->string('va_number', 50)->nullable();
            $table->text('qr_string')->nullable();
            // menunggu_pembayaran | dibayar | kedaluwarsa | gagal | refund
            $table->string('status', 30)->default('menunggu_pembayaran')->index();
            $table->string('idempotency_key', 80)->unique();
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->json('gateway_response')->nullable();
            $table->timestamps();
        });

        // Setiap webhook dicatat; event_id unik mencegah pemrosesan ganda (idempotensi).
        Schema::create('webhook_events', function (Blueprint $table) {
            $table->id();
            $table->string('gateway', 20);
            $table->string('event_id')->unique();
            $table->string('event_type')->nullable();
            $table->boolean('signature_valid')->default(false);
            $table->json('payload');
            $table->string('result')->nullable();
            $table->timestamp('processed_at')->nullable();
            $table->timestamps();
        });

        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->string('number', 40)->unique();
            $table->string('type', 10); // invoice | kwitansi
            $table->morphs('invoiceable');
            $table->foreignId('user_id')->constrained();
            $table->foreignId('payment_id')->nullable()->constrained()->nullOnDelete();
            $table->decimal('amount', 15, 0);
            $table->json('items')->nullable();
            $table->string('status', 20)->default('belum_lunas'); // belum_lunas | lunas | batal
            $table->timestamp('issued_at');
            $table->timestamps();
        });

        Schema::create('refunds', function (Blueprint $table) {
            $table->id();
            $table->string('code', 30)->unique();
            $table->foreignId('user_id')->constrained();
            $table->morphs('refundable');
            $table->decimal('requested_amount', 15, 0);
            $table->decimal('approved_amount', 15, 0)->nullable();
            $table->text('reason');
            $table->string('bank_name');
            $table->text('account_number'); // terenkripsi
            $table->string('account_holder');
            $table->string('proof_path')->nullable(); // foto bukti (mis. paspor/bukti kesalahan)
            // diajukan | disetujui | ditolak | selesai
            $table->string('status', 20)->default('diajukan')->index();
            $table->text('admin_note')->nullable();
            $table->string('transfer_proof_path')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();
        });

        Schema::create('documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('jamaah_id')->nullable()->constrained('jamaah')->nullOnDelete();
            $table->nullableMorphs('documentable'); // mis. VisaApplication, FlightOrder
            // paspor|foto|ktp|kk|buku_nikah|vaksin|berkas_visa|visa_terbit|eticket|lainnya
            $table->string('type', 30);
            $table->string('original_name');
            $table->string('file_name');
            $table->string('disk', 20);
            $table->string('path');
            $table->string('mime', 100)->nullable();
            $table->unsignedBigInteger('size')->default(0);
            $table->boolean('is_encrypted')->default(true);
            $table->string('status', 20)->default('menunggu'); // menunggu | diverifikasi | ditolak
            $table->text('rejection_note')->nullable();
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('verified_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();
        });

        // Pencatatan pengingat terkirim (cicilan, keberangkatan) — mencegah duplikasi
        Schema::create('reminder_logs', function (Blueprint $table) {
            $table->id();
            $table->morphs('remindable');
            $table->string('type', 30); // cicilan_h7|cicilan_h3|cicilan_h1|overdue|berangkat_h30|berangkat_h7|berangkat_h1
            $table->string('channel', 20); // email | whatsapp | in_app
            $table->date('sent_on');
            $table->timestamps();
            $table->unique(['remindable_type', 'remindable_id', 'type', 'channel', 'sent_on'], 'reminder_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reminder_logs');
        Schema::dropIfExists('documents');
        Schema::dropIfExists('refunds');
        Schema::dropIfExists('invoices');
        Schema::dropIfExists('webhook_events');
        Schema::dropIfExists('payments');
        Schema::dropIfExists('payment_installments');
    }
};
