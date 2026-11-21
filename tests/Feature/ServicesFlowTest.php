<?php

namespace Tests\Feature;

use App\Models\ChatbotIntent;
use App\Models\Document;
use App\Models\Payment;
use App\Models\SupportTicket;
use App\Models\User;
use App\Models\VisaApplication;
use App\Models\VisaService;
use App\Security\Finance\BankAccountGuard;
use App\Security\Finance\CompanyBankAccount;
use App\Services\Payment\SimulatorGateway;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

class ServicesFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_alur_visa_invoice_admin_bayar_upload_terbit(): void
    {
        Storage::fake('local');
        $u = User::factory()->create(['name' => 'Jaya']);
        $ops = User::factory()->admin()->create();
        $svc = VisaService::create(['name' => 'Visa Umrah', 'price' => 2500000, 'processing_days' => 7]);

        $this->actingAs($u)->post('/pesan/visa', ['visa_service_id' => $svc->id, 'pax_count' => 3, 'agree' => true])->assertSessionHasNoErrors();
        $v = VisaApplication::first();
        $this->assertSame('menunggu_invoice', $v->status);

        // belum ada invoice → tidak bisa bayar
        $this->actingAs($u)->post('/bayar', ['payable_type' => 'visa', 'code' => $v->code, 'method' => 'qris', 'idempotency_key' => (string) Str::uuid()])
            ->assertSessionHasErrors('amount');

        // admin mengubah jumlah pemesan & biaya lalu menerbitkan invoice
        $this->actingAs($ops)->post("/admin/visa/{$v->code}/invoice", ['pax_count' => 4, 'unit_price' => 2500000, 'extra_fee' => 100000, 'discount' => 0])->assertSessionHasNoErrors();
        $v->refresh();
        $this->assertSame('menunggu_pembayaran', $v->status);
        $this->assertSame(10100000, $v->total_amount);

        // bayar via gateway
        $this->actingAs($u)->post('/bayar', ['payable_type' => 'visa', 'code' => $v->code, 'method' => 'va_mandiri', 'idempotency_key' => (string) Str::uuid()]);
        $p = Payment::first();
        $body = json_encode(SimulatorGateway::payloadFor($p));
        $this->call('POST', '/webhooks/payment/simulator', [], [], [], ['CONTENT_TYPE' => 'application/json', 'HTTP_X_SIMULATOR_SIGNATURE' => SimulatorGateway::sign($body)], $body)->assertOk();
        $this->assertSame('menunggu_dokumen', $v->fresh()->status);

        // upload berkas zip → nama file sesuai nama pengguna
        $this->actingAs($u)->post("/akun/visa/{$v->code}/berkas", ['file' => UploadedFile::fake()->create('dokumen.zip', 100, 'application/zip')])->assertSessionHasNoErrors();
        $doc = Document::where('type', 'berkas_visa')->first();
        $this->assertSame('berkas_visa_jaya.zip', $doc->file_name);
        $this->assertTrue($doc->is_encrypted);

        // admin verifikasi → proses → terbit dengan file visa (nama file admin pakai tanggal)
        $this->actingAs($ops)->post("/admin/visa/{$v->code}/status", ['status' => 'diverifikasi', 'document_id' => $doc->id])->assertSessionHasNoErrors();
        $this->actingAs($ops)->post("/admin/visa/{$v->code}/status", ['status' => 'diproses'])->assertSessionHasNoErrors();
        $this->actingAs($ops)->post("/admin/visa/{$v->code}/status", ['status' => 'terbit', 'visa_file' => UploadedFile::fake()->create('visa.pdf', 50, 'application/pdf')])->assertSessionHasNoErrors();

        $v->refresh();
        $this->assertSame('terbit', $v->status);
        $this->assertGreaterThanOrEqual(5, $v->statusLogs()->count());
        $visaDoc = Document::where('type', 'visa_terbit')->first();
        $this->assertSame(now()->format('d-m-y').'-visa-terbit.pdf', $visaDoc->file_name);
        $this->assertSame('diverifikasi', $doc->fresh()->status);
    }

    public function test_chatbox_menjawab_otomatis_lalu_eskalasi_ke_admin(): void
    {
        $u = User::factory()->create();
        $cs = User::factory()->admin()->create();
        ChatbotIntent::create(['title' => 'Cicilan', 'keywords' => 'cicilan, dp, deposit', 'answer' => 'Deposit awal minimal Rp3.000.000.']);

        $this->actingAs($u)->getJson('/bantuan/chat')->assertOk()->assertJsonPath('ticket.status', 'bot');

        $res = $this->actingAs($u)->postJson('/bantuan/chat', ['message' => 'Bagaimana cara cicilan?'])->assertOk();
        $this->assertStringContainsString('Rp3.000.000', collect($res->json('messages'))->last()['message']);

        $res = $this->actingAs($u)->postJson('/bantuan/chat', ['message' => 'Apakah hotel menyediakan kursi roda listrik?'])->assertOk();
        $this->assertContains('Hubungkan saya dengan Admin', collect($res->json('messages'))->last()['options']['replies']);

        $this->actingAs($u)->postJson('/bantuan/chat', ['message' => 'Hubungkan saya dengan Admin'])->assertOk();
        $t = SupportTicket::first();
        $this->assertSame('menunggu_admin', $t->status);
        $this->assertTrue($cs->notifications()->where('data', 'like', '%Permintaan bantuan%')->exists());

        // admin membuka tiket → ditangani, membalas, pelanggan menerima balasan
        $this->actingAs($cs)->get("/admin/bantuan/{$t->code}")->assertOk();
        $this->assertSame('ditangani', $t->fresh()->status);
        $this->actingAs($cs)->postJson("/admin/bantuan/{$t->code}/balas", ['message' => 'Bisa, kami siapkan.'])->assertOk();
        $msgs = $this->actingAs($u)->getJson('/bantuan/chat')->json('messages');
        $this->assertSame('admin', collect($msgs)->last()['sender_type']);
    }

    public function test_keamanan_rekening_persetujuan_pembatalan_dan_deteksi_tamper(): void
    {
        Notification::fake();
        $guard = app(BankAccountGuard::class);
        $finance = User::factory()->admin()->create();

        // ajukan → belum aktif, email terkirim ke pemilik
        $a = $guard->requestChange(['bank_name' => 'BSI', 'account_number' => '7123456789', 'account_holder' => 'PT SAH'], $finance);
        $this->assertSame('pending_verification', $a->status);
        $this->assertNull($guard->active());
        Notification::assertSentOnDemand(\App\Security\Finance\BankChangeRequestedNotification::class);

        // setujui dengan token yang benar
        $token = 'tok-'.Str::random(20);
        $a->forceFill(['approval_token_hash' => hash('sha256', $token)])->saveQuietly();
        $guard->decide($a->fresh(), $token, 'approve');
        $this->assertSame($a->id, $guard->active()->id);

        // perubahan baru dibatalkan pemilik → diblokir & admin pengaju dinonaktifkan
        $b = $guard->requestChange(['bank_name' => 'Bank Lain', 'account_number' => '999999999', 'account_holder' => 'Penipu'], $finance);
        $t2 = 'tok2';
        $b->forceFill(['approval_token_hash' => hash('sha256', $t2)])->saveQuietly();
        $guard->decide($b->fresh(), $t2, 'cancel');
        $this->assertSame('blocked', $b->fresh()->status);
        $this->assertFalse($finance->fresh()->is_active);
        $this->assertSame($a->id, $guard->active()->id); // rekening lama tetap dipakai

        // peretas mengubah nomor rekening langsung di database → segel rusak → diblokir
        DB::table('company_bank_accounts')->where('id', $a->id)->update(['account_number' => encrypt('1111111111', false) ? \Illuminate\Support\Facades\Crypt::encryptString('1111111111') : '']);
        $this->artisan('finance:verify-integrity')->assertFailed();
        $this->assertSame('blocked', CompanyBankAccount::find($a->id)->status);
        $this->assertNull($guard->active());
    }

    public function test_dokumen_privat_hanya_lewat_signed_url_pemilik(): void
    {
        Storage::fake('local');
        $u = User::factory()->create(['name' => 'Jaya']);
        $this->actingAs($u)->post('/akun/dokumen', ['type' => 'paspor', 'file' => UploadedFile::fake()->image('scan.jpg')])->assertSessionHasNoErrors();
        $doc = Document::first();
        $this->assertSame('paspor_jaya.jpg', $doc->file_name);
        // konten tersimpan terenkripsi
        $this->assertStringNotContainsString('JFIF', Storage::disk('local')->get($doc->path));

        $this->actingAs($u)->get('/berkas/'.$doc->id)->assertForbidden(); // tanpa signature
        $this->actingAs($u)->get($doc->signedUrl())->assertOk();
        $this->actingAs(User::factory()->create())->get($doc->signedUrl())->assertNotFound();
    }
}
