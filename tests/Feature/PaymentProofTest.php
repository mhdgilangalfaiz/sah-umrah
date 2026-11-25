<?php

namespace Tests\Feature;

use App\Models\Flight;
use App\Models\FlightOrder;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/** Setelah pembayaran berhasil, pelanggan mengunggah bukti pembayaran (resi/struk) sebagai arsip perusahaan. */
class PaymentProofTest extends TestCase
{
    use RefreshDatabase;

    private User $customer;

    protected function setUp(): void
    {
        parent::setUp();
        Notification::fake();
        Storage::fake('local');
        config(['filesystems.private_disk' => 'local']);
        $this->customer = User::factory()->create();
    }

    private function payment(string $status = 'dibayar'): Payment
    {
        $flight = Flight::create([
            'airline' => 'Saudia', 'flight_number' => 'SV 1', 'origin_code' => 'CGK', 'origin_city' => 'Jakarta',
            'destination_code' => 'JED', 'destination_city' => 'Jeddah', 'depart_at' => now()->addMonth(), 'arrive_at' => now()->addMonth()->addHours(9),
            'price' => 5000000, 'seats_available' => 10,
        ]);
        $order = FlightOrder::create([
            'code' => FlightOrder::generateCode('T'), 'user_id' => $this->customer->id, 'flight_id' => $flight->id,
            'pax_count' => 2, 'unit_price' => 5000000, 'total_amount' => 10000000, 'paid_amount' => 3000000, 'status' => 'cicilan_berjalan',
        ]);

        return Payment::create([
            'code' => 'PAY-UJI-'.uniqid(), 'user_id' => $this->customer->id, 'payable_type' => $order->getMorphClass(), 'payable_id' => $order->id,
            'amount' => 3000000, 'method' => 'va_mandiri', 'gateway' => 'simulator', 'status' => $status, 'idempotency_key' => (string) \Illuminate\Support\Str::uuid(),
            'expires_at' => now()->addDay(), 'paid_at' => $status === 'dibayar' ? now() : null,
        ]);
    }

    public function test_pelanggan_unggah_bukti_lalu_admin_dapat_melihat(): void
    {
        $p = $this->payment();
        $this->assertTrue($p->needs_proof);

        // halaman pesanan mengingatkan pembayaran yang belum ada buktinya
        $this->actingAs($this->customer)->get(route('customer.flight-orders.show', $p->payable))
            ->assertInertia(fn ($page) => $page->where('payBox.missing_proofs.0.code', $p->code));

        $this->actingAs($this->customer)->post(route('payments.proof.store', $p), [
            'file' => UploadedFile::fake()->image('struk-transfer.jpg'), 'note' => 'Transfer a.n. Budi, ref 123456',
        ])->assertSessionHasNoErrors()->assertSessionHas('success');

        $p->refresh();
        $this->assertNotNull($p->proof_path);
        $this->assertSame('struk-transfer.jpg', $p->proof_name);
        $this->assertSame('Transfer a.n. Budi, ref 123456', $p->proof_note);
        $this->assertFalse($p->needs_proof);
        Storage::disk('local')->assertExists($p->proof_path);

        // pemilik & admin bisa membuka bukti; pelanggan lain tidak
        $this->actingAs($this->customer)->get(route('payments.proof', $p))->assertOk();
        $this->actingAs(User::factory()->admin()->create())->get(route('payments.proof', $p))->assertOk();
        $this->actingAs(User::factory()->admin('super_admin', true)->create())->get(route('payments.proof', $p))->assertOk();
        $this->actingAs(User::factory()->create())->get(route('payments.proof', $p))->assertNotFound();

        // ganti bukti → file lama dihapus
        $old = $p->proof_path;
        $this->actingAs($this->customer)->post(route('payments.proof.store', $p), ['file' => UploadedFile::fake()->create('resi.pdf', 100, 'application/pdf')])->assertSessionHasNoErrors();
        Storage::disk('local')->assertMissing($old);
        $this->assertSame('resi.pdf', $p->fresh()->proof_name);

        $this->actingAs($this->customer)->get(route('customer.flight-orders.show', $p->payable))
            ->assertInertia(fn ($page) => $page->where('payBox.missing_proofs', []));
    }

    public function test_bukti_hanya_untuk_pembayaran_berhasil_dan_file_divalidasi(): void
    {
        $pending = $this->payment('menunggu_pembayaran');
        $this->actingAs($this->customer)->post(route('payments.proof.store', $pending), ['file' => UploadedFile::fake()->image('a.jpg')])->assertStatus(422);

        $paid = $this->payment();
        $this->actingAs($this->customer)->post(route('payments.proof.store', $paid), ['file' => UploadedFile::fake()->create('virus.exe', 10)])->assertSessionHasErrors('file');
        $this->actingAs(User::factory()->create())->post(route('payments.proof.store', $paid), ['file' => UploadedFile::fake()->image('a.jpg')])->assertNotFound();
        $this->assertNull($paid->fresh()->proof_path);
    }
}
