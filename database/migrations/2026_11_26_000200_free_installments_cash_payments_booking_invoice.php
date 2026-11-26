<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Paket umrah:
 *  - Cicilan bebas (tanpa termin bulanan): deposit awal, lalu bayar kapan saja & berapa saja, lunas paling lambat H-40.
 *  - Pembayaran tunai di kantor: jamaah mengunggah kwitansi kantor → admin memverifikasi → tercatat di invoice.
 *  - Invoice umrah bisa direvisi admin (keterangan, baris tambahan/potongan, S&K) → disimpan di bookings.invoice_meta.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->text('review_note')->nullable()->after('proof_uploaded_at');
            $table->foreignId('reviewed_by')->nullable()->after('review_note')->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable()->after('reviewed_by');
        });

        Schema::table('bookings', function (Blueprint $table) {
            $table->json('invoice_meta')->nullable()->after('notes');
        });

        // Pesanan cicilan yang masih berjalan → batas pelunasan H-40, termin bulanan digabung jadi satu "Pelunasan"
        $days = (int) config('payment.settlement_days_before_departure', 40);
        $bookings = DB::table('bookings')
            ->join('package_departures', 'package_departures.id', '=', 'bookings.package_departure_id')
            ->where('bookings.payment_scheme', 'cicilan')->whereIn('bookings.status', ['menunggu_pembayaran', 'cicilan_berjalan'])
            ->get(['bookings.id', 'bookings.total_amount', 'bookings.paid_amount', 'package_departures.departure_date']);

        foreach ($bookings as $b) {
            $deadline = \Carbon\Carbon::parse($b->departure_date)->subDays($days)->toDateString();
            DB::table('bookings')->where('id', $b->id)->update(['payment_deadline' => $deadline]);

            $deposit = DB::table('payment_installments')->where('booking_id', $b->id)->orderBy('sequence')->first();
            if (! $deposit) continue;
            DB::table('payment_installments')->where('booking_id', $b->id)->where('id', '!=', $deposit->id)->delete();
            $rest = (int) $b->total_amount - (int) $deposit->amount;
            if ($rest > 0) {
                DB::table('payment_installments')->insert([
                    'booking_id' => $b->id, 'sequence' => 2, 'label' => 'Pelunasan', 'amount' => $rest, 'due_date' => $deadline,
                    'paid_amount' => 0, 'status' => 'belum_dibayar', 'created_at' => now(), 'updated_at' => now(),
                ]);
            }
            // alokasi ulang pembayaran yang sudah masuk: deposit dulu, sisanya ke pelunasan
            $paid = (int) $b->paid_amount;
            foreach (DB::table('payment_installments')->where('booking_id', $b->id)->orderBy('sequence')->get() as $inst) {
                $alloc = min((int) $inst->amount, max(0, $paid));
                $paid -= $alloc;
                DB::table('payment_installments')->where('id', $inst->id)->update([
                    'paid_amount' => $alloc,
                    'status' => $alloc >= $inst->amount ? 'lunas' : ($alloc > 0 ? 'sebagian' : 'belum_dibayar'),
                ]);
            }
        }
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropColumn('invoice_meta');
        });
        Schema::table('payments', function (Blueprint $table) {
            $table->dropConstrainedForeignId('reviewed_by');
            $table->dropColumn(['review_note', 'reviewed_at']);
        });
    }
};
