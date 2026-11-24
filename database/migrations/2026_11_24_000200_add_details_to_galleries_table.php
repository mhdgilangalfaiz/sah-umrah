<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Detail galeri yang tampil di panel kanan lightbox: tanggal kegiatan (opsional), lokasi, keterangan. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('galleries', function (Blueprint $table) {
            $table->date('event_date')->nullable()->after('subtitle');
            $table->string('location', 150)->nullable()->after('event_date');
            $table->text('description')->nullable()->after('location');
        });
    }

    public function down(): void
    {
        Schema::table('galleries', function (Blueprint $table) {
            $table->dropColumn(['event_date', 'location', 'description']);
        });
    }
};
