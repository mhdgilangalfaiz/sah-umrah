<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Booking;
use App\Models\Package;
use App\Models\Payment;
use App\Models\User;
use App\Services\Payment\SimulatorGateway;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/**
 * Alur lintas fitur dari sisi jamaah sampai admin:
 * pesan paket → notifikasi admin → bayar (webhook) → notifikasi pembayaran (admin & super admin) & jamaah
 * → dashboard jamaah (perjalanan, kalender) → admin (dashboard, laporan, data jamaah, audit log, menu sidebar).
 */
class EndToEndIntegrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_booking_to_payment_flows_through_every_module(): void
    {
        $admin = User::factory()->admin()->create();
        $super = User::factory()->admin('super_admin', true)->create();
        $jamaah = User::factory()->create(['name' => 'Jaya Uji']);

        $pkg = Package::create(['name' => 'Paket Integrasi', 'slug' => 'paket-integrasi', 'type' => 'reguler', 'duration_days' => 9, 'airline' => 'Batik Air Malaysia',
            'price_quad' => 10000000, 'price_triple' => 11000000, 'price_double' => 12000000, 'min_deposit' => 3000000, 'is_active' => true]);
        $dep = $pkg->departures()->create(['departure_date' => now()->addDays(120), 'return_date' => now()->addDays(128), 'quota' => 10]);

        // 1) Paket tampil di beranda dengan maskapainya
        $this->get('/')->assertInertia(fn (Assert $p) => $p->where('packages.0.name', 'Paket Integrasi')->where('packages.0.airline', 'Batik Air Malaysia'));

        // 2) Jamaah memesan untuk 2 orang → booking + data jamaah + notifikasi admin
        $this->actingAs($jamaah)->post('/pesan/umrah', [
            'departure_id' => $dep->id, 'room_type' => 'quad', 'scheme' => 'cicilan', 'agree' => true,
            'passengers' => [['full_name' => 'Jaya Uji', 'gender' => 'L', 'birth_date' => '1990-01-01'], ['full_name' => 'Siti Uji', 'gender' => 'P', 'birth_date' => '1992-02-02']],
        ])->assertSessionHasNoErrors();
        $booking = Booking::sole();
        $this->assertSame(2, $jamaah->jamaah()->count());
        $this->assertTrue($admin->unreadNotifications()->where('data->category', 'pesanan')->exists());

        // 3) Bayar deposit lewat gateway simulator → webhook menandai lunas sebagian
        $this->actingAs($jamaah)->post('/bayar', ['payable_type' => 'booking', 'code' => $booking->code, 'method' => 'va_bsi', 'amount' => 6000000, 'idempotency_key' => (string) Str::uuid()])
            ->assertSessionHasNoErrors();
        $payment = Payment::latest('id')->first();
        $body = json_encode(SimulatorGateway::payloadFor($payment, 'PAID'));
        $this->call('POST', '/webhooks/payment/simulator', [], [], [], ['CONTENT_TYPE' => 'application/json', 'HTTP_X_SIMULATOR_SIGNATURE' => SimulatorGateway::sign($body)], $body)->assertOk();
        $this->assertSame('dibayar', $payment->fresh()->status);
        $this->assertSame(6000000, $booking->fresh()->paid_amount);

        // notifikasi pembayaran: admin & super admin (kategori pembelian) + jamaah
        $this->assertTrue($admin->unreadNotifications()->where('data->category', 'pembayaran')->exists());
        $this->assertTrue($super->unreadNotifications()->where('data->category', 'pembayaran')->exists());
        $this->assertTrue($jamaah->notifications()->exists());

        // 4) Dashboard jamaah: perjalanan aktif & kalender
        $this->actingAs($jamaah)->get('/dashboard')->assertInertia(fn (Assert $p) => $p
            ->where('activeTrip.code', $booking->code)->where('activeTrip.paid', 6000000)
            ->where('calendarEvents', fn ($e) => collect($e)->contains('type', 'umrah')));

        // 5) Admin: dashboard, laporan, data jamaah, audit log, badge sidebar
        $this->actingAs($admin)->get('/admin')->assertInertia(fn (Assert $p) => $p->where('stats.orders.umrah', 1)->where('stats.revenue_month', 6000000));
        $this->actingAs($admin)->get(route('admin.reports.index'))->assertOk()->assertInertia(fn (Assert $p) => $p->where('summary.revenue', 6000000));
        $this->actingAs($admin)->get(route('admin.jamaah.show', $jamaah->customer_code))->assertInertia(fn (Assert $p) => $p->has('jamaah', 2)->has('bookings', 1));
        $this->actingAs($admin)->get(route('admin.audit.index'))->assertInertia(fn (Assert $p) => $p->where('logs.data', fn ($l) => collect($l)->pluck('action')->contains('pesanan.umrah_dibuat')));
        $this->actingAs($admin)->get('/admin')->assertInertia(fn (Assert $p) => $p->where('unreadByPath', fn ($paths) => count($paths) > 0));

        // 6) Super admin melihat pembelian yang sama, tapi tidak bisa mengubah
        $this->actingAs($super)->get(route('admin.bookings.show', $booking))->assertOk();
        $this->actingAs($super)->post(route('admin.bookings.cancel', $booking))->assertForbidden();
        $this->assertGreaterThan(0, AuditLog::count());
    }
}
