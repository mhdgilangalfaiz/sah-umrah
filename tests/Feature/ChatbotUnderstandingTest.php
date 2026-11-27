<?php

namespace Tests\Feature;

use App\Models\SupportTicket;
use App\Services\ChatbotService;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** Ketikan bebas (bukan tombol) tetap dipahami: permintaan bantuan, singkatan, salah ketik, tanda baca. */
class ChatbotUnderstandingTest extends TestCase
{
    use RefreshDatabase;

    public function test_free_text_is_understood(): void
    {
        $this->seed(DatabaseSeeder::class);
        $bot = app(ChatbotService::class);

        $this->assertSame('Informasi paket umrah', $bot->match('brp harga umroh?')?->title);
        $this->assertSame('Cara pembayaran & cicilan', $bot->match('gmn cara byr nya')?->title);
        $this->assertSame('Cara pembayaran & cicilan', $bot->match('pembayran')?->title);      // salah ketik
        $this->assertSame('Dokumen yang diperlukan', $bot->match('syarat pasport apa aja')?->title);
        $this->assertNull($bot->match('saya ingin valid'));                                    // "va" bukan bagian kata lain

        // "BANTU SAYA" → menu topik, bukan "maaf tidak bisa menjawab"
        $res = $this->postJson('/bantuan/chat', ['message' => 'BANTU SAYA'])->assertOk()->json();
        $last = collect($res['messages'] ?? $res)->last();
        $this->assertStringContainsString('dengan senang hati', json_encode($res));
        $this->assertStringNotContainsString('belum dapat menjawab', json_encode($res));
    }
}
