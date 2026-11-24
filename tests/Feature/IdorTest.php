<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Invoice;
use App\Models\Package;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

/** Jamaah tidak boleh membuka/mengubah data jamaah lain hanya dengan mengganti kode/ID di URL. */
class IdorTest extends TestCase
{
    use RefreshDatabase;

    public function test_customer_cannot_access_another_customers_data_by_changing_url(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $pkg = Package::create(['name' => 'Paket', 'slug' => 'paket', 'type' => 'reguler', 'duration_days' => 9,
            'price_quad' => 10000000, 'price_triple' => 11000000, 'price_double' => 12000000, 'min_deposit' => 3000000, 'is_active' => true]);
        $dep = $pkg->departures()->create(['departure_date' => now()->addDays(120), 'return_date' => now()->addDays(128), 'quota' => 10]);

        $this->actingAs($owner)->post('/pesan/umrah', ['departure_id' => $dep->id, 'room_type' => 'quad', 'scheme' => 'cicilan', 'agree' => true,
            'passengers' => [['full_name' => 'Pemilik', 'gender' => 'L', 'birth_date' => '1990-01-01']]])->assertSessionHasNoErrors();
        $booking = Booking::sole();
        $this->actingAs($owner)->post('/bayar', ['payable_type' => 'booking', 'code' => $booking->code, 'method' => 'va_bsi', 'amount' => 3000000, 'idempotency_key' => (string) Str::uuid()]);
        $payment = Payment::sole();
        $invoice = Invoice::where('invoiceable_id', $booking->id)->firstOrFail();
        $jamaah = $owner->jamaah()->firstOrFail();

        $this->actingAs($other);
        foreach ([
            ['get', route('customer.bookings.show', $booking)],
            ['get', route('payments.show', $payment)],
            ['get', route('payments.status', $payment)],
            ['get', route('invoices.pdf', $invoice)],
            ['post', route('customer.bookings.cancel', $booking)],
            ['post', route('payments.cancel', $payment)],
            ['put', route('customer.jamaah.update', $jamaah)],
            ['delete', route('customer.jamaah.destroy', $jamaah)],
        ] as [$method, $url]) {
            $status = $this->{$method}($url)->status();
            $this->assertContains($status, [403, 404], "$method $url mengembalikan $status");
        }
        // bayar tagihan orang lain juga ditolak
        $this->post('/bayar', ['payable_type' => 'booking', 'code' => $booking->code, 'method' => 'va_bsi', 'amount' => 3000000, 'idempotency_key' => (string) Str::uuid()])
            ->assertStatus(404);

        $this->assertSame('menunggu_pembayaran', $booking->fresh()->status);
        $this->assertNotNull($jamaah->fresh());
    }
}
