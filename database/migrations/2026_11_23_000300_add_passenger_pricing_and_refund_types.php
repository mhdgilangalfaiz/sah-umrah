<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Perubahan pesanan umrah setelah dibuat:
 *  - booking_passengers.category & price: harga per jamaah (dewasa/anak/bayi) → total pesanan = jumlah harga jamaah.
 *    Admin bisa mengubah dewasa → anak (harga lebih murah) atau mengurangi jamaah.
 *  - refunds.type: pembatalan (seluruh pesanan) | pengurangan (sebagian jamaah) | refund (pengembalian dana saja).
 *  - refunds.passenger_ids: jamaah yang dibatalkan pada pengurangan.
 *  - booking_changes: riwayat perubahan pesanan (siapa, apa, selisih harga).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('booking_passengers', function (Blueprint $table) {
            $table->string('category', 10)->default('dewasa')->after('title'); // dewasa | anak | bayi
            $table->decimal('price', 15, 0)->nullable()->after('category');
        });

        // Harga jamaah lama = harga per pax pesanannya
        foreach (DB::table('bookings')->select('id', 'unit_price')->get() as $b) {
            DB::table('booking_passengers')->where('orderable_type', 'App\\Models\\Booking')->where('orderable_id', $b->id)
                ->update(['price' => $b->unit_price]);
        }

        Schema::table('refunds', function (Blueprint $table) {
            $table->string('type', 20)->default('refund')->after('code');
            $table->json('passenger_ids')->nullable()->after('type');
            $table->string('bank_name')->nullable()->change();
            $table->text('account_number')->nullable()->change();
            $table->string('account_holder')->nullable()->change();
        });

        Schema::create('booking_changes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('booking_id')->constrained()->cascadeOnDelete();
            $table->string('type', 20); // pengurangan | perubahan | pembatalan
            $table->text('description');
            $table->decimal('old_total', 15, 0);
            $table->decimal('new_total', 15, 0);
            $table->decimal('refund_amount', 15, 0)->default(0);
            $table->foreignId('refund_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('changed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('booking_changes');
        Schema::table('refunds', function (Blueprint $table) {
            $table->dropColumn(['type', 'passenger_ids']);
        });
        Schema::table('booking_passengers', function (Blueprint $table) {
            $table->dropColumn(['category', 'price']);
        });
    }
};
