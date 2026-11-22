<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Galeri foto menjadi album: satu item = satu judul + subjudul + banyak foto (kolom `photos`).
 * `image` tetap menyimpan foto sampul (foto pertama) / file video. Kategori tidak dipakai lagi.
 * Data lama: foto berjudul sama yang diunggah di hari yang sama digabung menjadi satu album.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('galleries', function (Blueprint $table) {
            $table->string('subtitle', 255)->nullable()->after('title');
            $table->json('photos')->nullable()->after('image');
        });

        $groups = DB::table('galleries')->where('type', 'foto')->orderBy('id')->get()
            ->groupBy(fn ($g) => mb_strtolower(trim($g->title)).'|'.substr((string) $g->created_at, 0, 10));

        foreach ($groups as $rows) {
            $first = $rows->first();
            DB::table('galleries')->where('id', $first->id)->update([
                'photos' => json_encode($rows->pluck('image')->filter()->values()->all()),
            ]);
            DB::table('galleries')->whereIn('id', $rows->skip(1)->pluck('id'))->delete();
        }
    }

    public function down(): void
    {
        foreach (DB::table('galleries')->where('type', 'foto')->whereNotNull('photos')->get() as $g) {
            $photos = json_decode($g->photos, true) ?: [];
            foreach (array_slice($photos, 1) as $path) {
                DB::table('galleries')->insert([
                    'title' => $g->title, 'type' => 'foto', 'image' => $path, 'category' => $g->category,
                    'created_at' => $g->created_at, 'updated_at' => $g->updated_at,
                ]);
            }
        }

        Schema::table('galleries', function (Blueprint $table) {
            $table->dropColumn(['subtitle', 'photos']);
        });
    }
};
