<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Agen: pelanggan yang ditandai admin (biasanya memesan banyak & menjual kembali layanan SAH).
 * Penanda ini hanya terlihat admin — pengguna tidak tahu dirinya ditandai.
 * Siaran agen: pesan WhatsApp otomatis berisi paket/tiket/visa/promo yang dikirim serentak ke semua agen.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('is_agent')->default(false)->index();
            $table->timestamp('agent_marked_at')->nullable();
            $table->string('agent_note', 255)->nullable();
        });

        Schema::create('agent_broadcasts', function (Blueprint $table) {
            $table->id();
            $table->string('item_type', 20); // paket | tiket | visa | promo | bebas
            $table->unsignedBigInteger('item_id')->nullable();
            $table->string('title', 200);
            $table->text('message');
            $table->unsignedInteger('recipients')->default(0);
            $table->foreignId('sent_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('agent_broadcast_recipients', function (Blueprint $table) {
            $table->id();
            $table->foreignId('agent_broadcast_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name', 120);
            $table->string('phone', 30)->nullable();
            $table->string('status', 15)->default('antri'); // antri | terkirim | simulasi | gagal
            $table->string('error', 255)->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('agent_broadcast_recipients');
        Schema::dropIfExists('agent_broadcasts');
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['is_agent']);
            $table->dropColumn(['is_agent', 'agent_marked_at', 'agent_note']);
        });
    }
};
