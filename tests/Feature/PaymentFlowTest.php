<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Invoice;
use App\Models\Package;
use App\Models\PackageDeparture;
use App\Models\Payment;
use App\Models\Refund;
use App\Models\User;
use App\Services\Payment\SimulatorGateway;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * Alur pembayaran umrah end-to-end lewat webhook bertanda tangan (gateway simulator).
 * Skenario sesuai kebutuhan: paket Rp10.000.000 → deposit 3jt → cicil 2jt → ... → lunas.
 */
class PaymentFlowTest extends TestCase
{
    use RefreshDatabase;

    private function makeDeparture(int $price = 10000000, int $days = 120): PackageDeparture
    {
        $p = Package::create([
            'name' => 'Paket Uji', 'slug' => 'paket-uji-'.Str::random(4), 'type' => 'reguler', 'duration_days' => 9,
            'price_quad' => $price, 'price_triple' => $price + 1000000, 'price_double' => $price + 2000000, 'min_deposit' => 3000000,
        ]);

        return $p->departures()->create(['departure_date' => now()->addDays($days), 'return_date' => now()->addDays($days + 8), 'quota' => 10]);
    }

    private function book(User $u, PackageDeparture $d, string $scheme = 'cicilan'): Booking
    {
        $this->actingAs($u)->post('/pesan/umrah', [
            'departure_id' => $d->id, 'room_type' => 'quad', 'scheme' => $scheme, 'agree' => true,
            'passengers' => [['full_name' => 'Jaya', 'gender' => 'L', 'birth_date' => '1990-01-01']],
        ])->assertSessionHasNoErrors()->assertRedirect();

        return Booking::latest('id')->first();
    }

    private function pay(User $u, Booking $b, ?int $amount, string $method = 'va_bsi'): Payment
    {
        $this->actingAs($u)->post('/bayar', [
            'payable_type' => 'booking', 'code' => $b->code, 'method' => $method, 'amount' => $amount, 'idempotency_key' => (string) Str::uuid(),
        ])->assertSessionHasNoErrors();

        return Payment::latest('id')->first();
    }

    private function webhook(Payment $p, string $status = 'PAID', ?string $eventId = null, ?string $sig = null)
    {
        $payload = SimulatorGateway::payloadFor($p, $status);
        if ($eventId) $payload['event_id'] = $eventId;
        $body = json_encode($payload);

        return $this->call('POST', '/webhooks/payment/simulator', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_X_SIMULATOR_SIGNATURE' => $sig ?? SimulatorGateway::sign($body),
        ], $body);
    }

    public function test_cicilan_kustom_deposit_lalu_cicil_sampai_lunas(): void
    {
        $u = User::factory()->create();
        $dep = $this->makeDeparture();
        $b = $this->book($u, $dep);

        // kursi ditahan, belum terkonfirmasi
        $this->assertSame(1, $dep->fresh()->held);
        $this->assertSame(10000000, $b->total_amount);
        $this->assertSame('Deposit Awal', $b->installments->first()->label);
        $this->assertTrue(Invoice::where('type', 'invoice')->where('invoiceable_id', $b->id)->exists());

        // pembayaran pertama di bawah deposit 3jt ditolak
        $this->actingAs($u)->post('/bayar', ['payable_type' => 'booking', 'code' => $b->code, 'method' => 'va_mandiri', 'amount' => 2000000, 'idempotency_key' => (string) Str::uuid()])
            ->assertSessionHasErrors('amount');

        // deposit 3jt → webhook
        $p1 = $this->pay($u, $b, 3000000);
        $this->assertNotNull($p1->va_number);
        $this->webhook($p1)->assertOk()->assertJson(['result' => 'dibayar']);

        $b->refresh();
        $this->assertSame(3000000, $b->paid_amount);
        $this->assertSame(7000000, $b->outstandingAmount());
        $this->assertSame('cicilan_berjalan', $b->status);
        $this->assertTrue($b->seats_confirmed);
        $this->assertSame(0, $dep->fresh()->held);
        $this->assertSame(1, $dep->fresh()->booked);
        $this->assertSame(0, Invoice::where('type', 'kwitansi')->count()); // tidak ada kwitansi terpisah

        // cicilan bebas 2jt (sisa 8jt dalam contoh user → di sini sisa 5jt)
        $p2 = $this->pay($u, $b, 2000000, 'qris');
        $this->assertNotNull($p2->qr_string);
        $this->webhook($p2)->assertOk();
        $this->assertSame(5000000, $b->fresh()->outstandingAmount());

        // pelunasan
        $p3 = $this->pay($u, $b, 5000000, 'va_muamalat');
        $this->webhook($p3)->assertOk();
        $b->refresh();
        $this->assertSame('lunas', $b->status);
        $this->assertSame(0, $b->outstandingAmount());
        $this->assertTrue($b->installments()->where('status', '!=', 'lunas')->doesntExist());
        $this->assertSame('lunas', $b->invoices()->where('type', 'invoice')->first()->status);
        $this->assertSame(0, Invoice::where('type', 'kwitansi')->count());
        $this->assertSame(1, $b->invoices()->count());

        // riwayat pembayaran di invoice: tanggal, jenis, keterangan, nominal
        $history = app(\App\Services\InvoiceService::class)->paymentHistory($b, (int) $b->total_amount);
        $this->assertSame(['Deposit', 'Pembayaran Termin 1', 'Lunas'], array_column($history, 'info'));
        $this->assertSame([3000000, 2000000, 5000000], array_column($history, 'amount'));
        $this->assertSame('QRIS', $history[1]['type']);
        $this->assertSame('Transfer Muamalat', $history[2]['type']);
        $this->actingAs($u)->get(route('invoices.pdf', $b->invoices()->first()))->assertOk();
    }

    public function test_webhook_idempotent_dan_signature_divalidasi(): void
    {
        $u = User::factory()->create();
        $b = $this->book($u, $this->makeDeparture());
        $p = $this->pay($u, $b, 3000000);

        // signature salah → 401, status tetap
        $this->webhook($p, 'PAID', null, 'signature-palsu')->assertStatus(401);
        $this->assertSame('menunggu_pembayaran', $p->fresh()->status);

        // event yang sama dikirim 2x → hanya diproses sekali
        $this->webhook($p, 'PAID', 'evt-1')->assertJson(['result' => 'dibayar']);
        $this->webhook($p, 'PAID', 'evt-1')->assertJson(['result' => 'duplikat']);
        // event berbeda untuk payment yang sama → sudah dibayar
        $this->webhook($p, 'PAID', 'evt-2')->assertJson(['result' => 'sudah_dibayar']);

        $this->assertSame(3000000, $b->fresh()->paid_amount);
    }

    public function test_idempotency_key_mencegah_transaksi_ganda(): void
    {
        $u = User::factory()->create();
        $b = $this->book($u, $this->makeDeparture());
        $key = (string) Str::uuid();
        $data = ['payable_type' => 'booking', 'code' => $b->code, 'method' => 'va_bsi', 'amount' => 3000000, 'idempotency_key' => $key];

        $this->actingAs($u)->post('/bayar', $data);
        $this->actingAs($u)->post('/bayar', $data);
        $this->assertSame(1, Payment::count());

        // klik baru dengan nominal & metode sama → pakai ulang VA aktif
        $this->actingAs($u)->post('/bayar', array_merge($data, ['idempotency_key' => (string) Str::uuid()]));
        $this->assertSame(1, Payment::count());

        // ganti metode → VA lama dinonaktifkan, hanya 1 transaksi aktif
        $this->actingAs($u)->post('/bayar', array_merge($data, ['method' => 'qris', 'idempotency_key' => (string) Str::uuid()]));
        $this->assertSame(1, Payment::where('status', 'menunggu_pembayaran')->count());
    }

    public function test_pembayaran_ganda_setelah_lunas_otomatis_diajukan_refund(): void
    {
        $u = User::factory()->create();
        $b = $this->book($u, $this->makeDeparture(3000000), 'lunas');
        $p1 = $this->pay($u, $b, null);
        // VA kedua dibuat paksa (mis. race di gateway) lalu keduanya dibayar
        $p2 = Payment::create(array_merge($p1->only('user_id', 'payable_type', 'payable_id', 'amount', 'method', 'gateway', 'expires_at'), [
            'code' => 'PAY-DUP-1', 'status' => 'menunggu_pembayaran', 'idempotency_key' => 'dup',
        ]));
        $this->webhook($p1)->assertOk();
        $this->webhook($p2)->assertOk();

        $this->assertSame(3000000, $b->fresh()->paid_amount);
        $this->assertTrue(Refund::where('refundable_id', $b->id)->where('requested_amount', 3000000)->exists());
    }

    public function test_hold_kursi_kedaluwarsa_dilepas_otomatis(): void
    {
        $u = User::factory()->create();
        $dep = $this->makeDeparture();
        $b = $this->book($u, $dep);
        $this->assertSame(1, $dep->fresh()->held);

        $this->travel(25)->hours();
        $this->artisan('orders:expire')->assertSuccessful();

        $this->assertSame('kedaluwarsa', $b->fresh()->status);
        $this->assertSame(0, $dep->fresh()->held);
    }

    public function test_kuota_tidak_bisa_terlampaui(): void
    {
        $dep = $this->makeDeparture();
        $dep->update(['quota' => 1]);
        $this->book(User::factory()->create(), $dep);

        $u2 = User::factory()->create();
        $this->actingAs($u2)->post('/pesan/umrah', [
            'departure_id' => $dep->id, 'room_type' => 'quad', 'scheme' => 'cicilan', 'agree' => true,
            'passengers' => [['full_name' => 'Budi', 'gender' => 'L', 'birth_date' => '1990-01-01']],
        ])->assertSessionHasErrors('departure');
    }

    public function test_keberangkatan_dekat_hanya_boleh_lunas(): void
    {
        $u = User::factory()->create();
        $dep = $this->makeDeparture(10000000, 20);
        $this->actingAs($u)->post('/pesan/umrah', [
            'departure_id' => $dep->id, 'room_type' => 'quad', 'scheme' => 'cicilan', 'agree' => true,
            'passengers' => [['full_name' => 'Jaya', 'gender' => 'L', 'birth_date' => '1990-01-01']],
        ])->assertSessionHasErrors('scheme');
    }

    public function test_pelanggan_tidak_bisa_melihat_pesanan_orang_lain(): void
    {
        $owner = User::factory()->create();
        $b = $this->book($owner, $this->makeDeparture());
        $this->actingAs(User::factory()->create())->get('/akun/umrah/'.$b->code)->assertNotFound();
    }
}
