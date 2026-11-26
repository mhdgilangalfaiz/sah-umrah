<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Invoice;
use App\Models\Package;
use App\Models\Payment;
use App\Models\User;
use App\Services\InvoiceService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/** Paket umrah: cicilan bebas (lunas H-40), pembayaran tunai via kwitansi kantor, dan revisi invoice oleh admin. */
class UmrahCashAndRevisionTest extends TestCase
{
    use RefreshDatabase;

    private User $jamaah;
    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        Notification::fake();
        Storage::fake('local');
        config(['filesystems.private_disk' => 'local']);
        $this->jamaah = User::factory()->create();
        $this->admin = User::factory()->admin()->create();
    }

    private function booking(int $pax = 2): Booking
    {
        $pkg = Package::create(['name' => 'Paket Uji', 'slug' => 'paket-uji', 'type' => 'reguler', 'duration_days' => 9,
            'price_quad' => 30000000, 'price_triple' => 32000000, 'price_double' => 35000000, 'min_deposit' => 3000000]);
        $dep = $pkg->departures()->create(['departure_date' => now()->addDays(150), 'return_date' => now()->addDays(158), 'quota' => 20]);
        $passengers = collect(range(1, $pax))->map(fn ($i) => ['full_name' => "Jamaah $i", 'gender' => 'L', 'birth_date' => '1980-01-01'])->all();
        $this->actingAs($this->jamaah)->post('/pesan/umrah', ['departure_id' => $dep->id, 'room_type' => 'quad', 'scheme' => 'cicilan', 'agree' => true, 'passengers' => $passengers])
            ->assertSessionHasNoErrors();

        return Booking::with('departure')->firstOrFail();
    }

    private function cash(Booking $b, int $amount, array $extra = [])
    {
        return $this->actingAs($this->jamaah)->post(route('customer.bookings.cash', $b), array_merge([
            'amount' => $amount, 'paid_date' => today()->toDateString(), 'receipt' => UploadedFile::fake()->image('kwitansi.jpg'), 'note' => 'Kwitansi no. 0123',
        ], $extra));
    }

    public function test_cicilan_bebas_tanpa_termin_bulanan_lunas_h40(): void
    {
        $b = $this->booking();

        $this->assertSame($b->departure->departure_date->copy()->subDays(40)->toDateString(), $b->payment_deadline->toDateString());
        $this->assertSame(['Deposit Awal', 'Pelunasan'], $b->installments()->orderBy('sequence')->pluck('label')->all());
        $this->assertSame(6000000, $b->minimumPayment()); // deposit 3 jt × 2 jamaah
        $this->assertTrue($b->allowsCustomAmount());
    }

    public function test_bayar_tunai_kwitansi_diverifikasi_admin_tercatat_di_invoice(): void
    {
        $b = $this->booking();
        $this->cash($b, 6000000)->assertSessionHasNoErrors();

        $p = Payment::firstOrFail();
        $this->assertSame('menunggu_verifikasi', $p->status);
        $this->assertSame('tunai', $p->method);
        $this->assertNotNull($p->proof_path);
        $this->assertSame(0, (int) $b->fresh()->paid_amount); // belum tercatat sebelum diverifikasi

        // tidak boleh melebihi sisa tagihan yang belum diverifikasi
        $this->cash($b, 60000000)->assertSessionHasErrors('amount');

        // kursi tidak dilepas selama kwitansi diverifikasi
        $b->update(['hold_expires_at' => now()->subHour()]);
        $this->artisan('orders:expire')->assertSuccessful();
        $this->assertSame('menunggu_pembayaran', $b->fresh()->status);

        // super admin hanya melihat
        $this->actingAs(User::factory()->admin('super_admin', true)->create())->post(route('admin.payments.cash.approve', $p))->assertForbidden();

        $this->actingAs($this->admin)->post(route('admin.payments.cash.approve', $p))->assertSessionHasNoErrors();
        $b->refresh();
        $this->assertSame('dibayar', $p->fresh()->status);
        $this->assertSame(6000000, (int) $b->paid_amount);
        $this->assertSame('cicilan_berjalan', $b->status);
        $this->assertTrue((bool) $b->seats_confirmed);

        $history = app(InvoiceService::class)->paymentHistory($b, (int) $b->total_amount);
        $this->assertSame('Tunai (Kantor)', $history[0]['type']);
        $this->assertSame('Deposit', $history[0]['info']);
        $this->assertSame(today()->format('d-m-Y'), $history[0]['date']);
        $this->actingAs($this->jamaah)->get(route('invoices.pdf', $b->invoices()->first()))->assertOk();
    }

    public function test_kwitansi_ditolak_dengan_alasan(): void
    {
        $b = $this->booking();
        $this->cash($b, 6000000);
        $p = Payment::firstOrFail();

        $this->actingAs($this->admin)->post(route('admin.payments.cash.reject', $p), ['note' => ''])->assertSessionHasErrors('note');
        $this->actingAs($this->admin)->post(route('admin.payments.cash.reject', $p), ['note' => 'Foto kwitansi tidak terbaca.'])->assertSessionHasNoErrors();

        $this->assertSame('ditolak', $p->fresh()->status);
        $this->assertSame(0, (int) $b->fresh()->paid_amount);
        // jamaah bisa kirim ulang
        $this->cash($b, 6000000)->assertSessionHasNoErrors();
        $this->actingAs($this->jamaah)->get(route('customer.bookings.show', $b))->assertOk();
    }

    public function test_revisi_invoice_umrah_keterangan_biaya_tambahan_dan_sk(): void
    {
        $b = $this->booking();
        $old = $b->invoices()->firstOrFail();
        $key = app(InvoiceService::class)->bookingLines($b)[0]['key'];

        $this->actingAs($this->admin)->post(route('admin.bookings.revise', $b), [
            'descriptions' => [$key => "Paket Umrah Uji 9 Hari\nKamar Quad · Hotel bintang 4"],
            'extras' => [['description' => 'Upgrade kamar double', 'qty' => 2, 'price' => 5000000], ['description' => 'Diskon rombongan', 'qty' => 1, 'price' => -1000000]],
            'terms' => "SYARAT & KETENTUAN\nA. Uji\n1. Ketentuan baru.",
            'reason' => 'Upgrade kamar & S&K baru.',
        ])->assertSessionHasNoErrors();

        $b->refresh();
        $this->assertSame(60000000 + 10000000 - 1000000, (int) $b->total_amount);
        $inv = $b->invoices()->where('type', 'invoice')->active()->firstOrFail();
        $this->assertSame($old->number.'-R1', $inv->number);
        $this->assertSame('direvisi', $old->fresh()->status);
        $this->assertStringStartsWith('Paket Umrah Uji 9 Hari', $inv->items[0]['description']);
        $this->assertSame('Upgrade kamar double', $inv->items[1]['description']);
        $this->assertStringContainsString('Ketentuan baru', $inv->details['terms']);
        $this->actingAs($this->admin)->get(route('invoices.pdf', $inv))->assertOk();
        $this->actingAs($this->admin)->get(route('admin.bookings.show', $b))->assertOk();

        // jamaah dikurangi lewat "Ubah pesanan" → biaya tambahan & keterangan tetap terbawa
        $p2 = $b->passengers()->orderByDesc('id')->first();
        app(\App\Services\BookingService::class)->reducePassengers($b, [$p2->id], 0, 'Uji pengurangan', $this->admin);
        $b->refresh();
        $this->assertSame(30000000 + 9000000, (int) $b->total_amount);
        $inv = $b->invoices()->where('type', 'invoice')->active()->firstOrFail();
        $this->assertStringStartsWith('Paket Umrah Uji 9 Hari', $inv->items[0]['description']);
        $this->assertCount(3, $inv->items);

        // validasi & hak akses
        $this->actingAs($this->admin)->post(route('admin.bookings.revise', $b), ['reason' => ''])->assertSessionHasErrors('reason');
        $this->actingAs($this->admin)->post(route('admin.bookings.revise', $b), ['reason' => 'Potongan besar', 'extras' => [['description' => 'Potongan', 'qty' => 1, 'price' => -99000000]]])->assertSessionHasErrors('extras');
        $this->actingAs($this->jamaah)->post(route('admin.bookings.revise', $b), ['reason' => 'Coba-coba'])->assertForbidden();
        $this->assertSame(2, Invoice::where('invoiceable_id', $b->id)->where('type', 'invoice')->count());
    }
}
