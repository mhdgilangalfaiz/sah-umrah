<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Daftar maskapai + logo (dikelola admin). Paket tetap menyimpan nama maskapai sebagai teks;
 * logo dicocokkan lewat nama. Nama maskapai yang sudah dipakai paket langsung dimasukkan.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('airlines', function (Blueprint $table) {
            $table->id();
            $table->string('name', 80)->unique();
            $table->string('logo')->nullable();
            $table->timestamps();
        });

        $now = now();
        $names = DB::table('packages')->whereNotNull('airline')->where('airline', '!=', '')->distinct()->pluck('airline');
        DB::table('airlines')->insert($names->map(fn ($n) => ['name' => trim($n), 'created_at' => $now, 'updated_at' => $now])->unique('name')->values()->all());
    }

    public function down(): void
    {
        Schema::dropIfExists('airlines');
    }
};
