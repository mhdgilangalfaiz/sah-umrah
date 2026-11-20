<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Pusat bantuan (chatbox + admin), notifikasi, audit log, konten CMS, keamanan rekening bank.
 */
return new class extends Migration
{
    public function up(): void
    {
        // Basis pengetahuan chatbot: kata kunci → jawaban otomatis
        Schema::create('chatbot_intents', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('category', 30)->default('umum'); // umum|umrah|tiket|visa|pembayaran|dokumen
            $table->text('keywords'); // dipisah koma
            $table->text('answer');
            $table->json('quick_replies')->nullable(); // tombol lanjutan
            $table->unsignedInteger('hits')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Satu percakapan = satu tiket bantuan. Status 'bot' → 'menunggu_admin' → 'ditangani' → 'selesai'
        Schema::create('support_tickets', function (Blueprint $table) {
            $table->id();
            $table->string('code', 30)->unique();
            $table->foreignId('user_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('guest_token', 64)->nullable()->index();
            $table->string('subject')->nullable();
            $table->string('category', 30)->default('umum');
            $table->string('status', 20)->default('bot')->index();
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('escalated_at')->nullable();
            $table->timestamp('closed_at')->nullable();
            $table->timestamp('last_message_at')->nullable();
            $table->timestamps();
        });

        Schema::create('ticket_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('support_ticket_id')->constrained()->cascadeOnDelete();
            $table->string('sender_type', 10); // user | bot | admin | system
            $table->foreignId('sender_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('message');
            $table->json('options')->nullable(); // quick replies
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
        });

        Schema::create('notifications', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('type');
            $table->morphs('notifiable');
            $table->text('data');
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
        });

        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('user_name')->nullable();
            $table->string('role', 20)->nullable();
            $table->string('action', 60)->index(); // login, harga.ubah, status.ubah, dokumen.verifikasi, refund.setujui ...
            $table->nullableMorphs('auditable');
            $table->text('description');
            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();
            $table->string('ip', 45)->nullable();
            $table->string('user_agent')->nullable();
            $table->timestamp('created_at')->useCurrent()->index();
        });

        // --- Konten (dapat diedit admin) ---
        Schema::create('pages', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique(); // tentang-kami, kontak, syarat-ketentuan, kebijakan-privasi, kebijakan-refund
            $table->string('title');
            $table->longText('content');
            $table->timestamps();
        });

        Schema::create('posts', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('slug')->unique();
            $table->text('excerpt')->nullable();
            $table->longText('content');
            $table->string('cover_image')->nullable();
            $table->foreignId('author_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('published_at')->nullable();
            $table->timestamps();
        });

        Schema::create('testimonials', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('city')->nullable();
            $table->text('content');
            $table->unsignedTinyInteger('rating')->default(5);
            $table->string('photo')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('galleries', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('image');
            $table->string('category', 30)->default('umum');
            $table->timestamps();
        });

        Schema::create('faqs', function (Blueprint $table) {
            $table->id();
            $table->string('question');
            $table->text('answer');
            $table->unsignedSmallInteger('sort')->default(0);
            $table->timestamps();
        });

        Schema::create('settings', function (Blueprint $table) {
            $table->string('key')->primary();
            $table->text('value')->nullable();
            $table->timestamps();
        });

        Schema::create('promotions', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('message');
            $table->string('link')->nullable();
            $table->unsignedInteger('recipients')->default(0);
            $table->foreignId('sent_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();
        });

        // --- KEAMANAN DATA KEUANGAN (lihat app/Security/Finance) ---
        Schema::create('company_bank_accounts', function (Blueprint $table) {
            $table->id();
            $table->string('bank_name');
            $table->text('account_number'); // terenkripsi
            $table->string('account_holder');
            $table->string('purpose', 30)->default('settlement'); // settlement | refund
            // pending_verification | active | blocked | replaced
            $table->string('status', 30)->default('pending_verification')->index();
            $table->string('integrity_hash', 128); // HMAC: deteksi perubahan langsung di database
            $table->string('approval_token_hash', 128)->nullable();
            $table->timestamp('approval_expires_at')->nullable();
            $table->foreignId('requested_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('requested_ip', 45)->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('blocked_at')->nullable();
            $table->string('blocked_reason')->nullable();
            $table->timestamps();
        });

        Schema::create('security_alerts', function (Blueprint $table) {
            $table->id();
            $table->string('type', 50); // bank_change_requested | bank_change_cancelled | integrity_violation ...
            $table->string('severity', 10)->default('high');
            $table->text('message');
            $table->json('context')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        foreach (['security_alerts', 'company_bank_accounts', 'promotions', 'settings', 'faqs', 'galleries',
            'testimonials', 'posts', 'pages', 'audit_logs', 'notifications', 'ticket_messages',
            'support_tickets', 'chatbot_intents'] as $t) {
            Schema::dropIfExists($t);
        }
    }
};
