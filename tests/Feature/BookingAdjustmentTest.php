<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Package;
use App\Models\Payment;
use App\Models\Refund;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

/** Pengurangan jamaah, perubahan dewasa → anak, pembatalan + status Refund, dan pengajuan dari pelanggan. */
class BookingAdjustmentTest extends TestCase
{
    use RefreshDatabase;

    private User $customer;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
        $this->customer = User::where('email', 'jaya.demo@gmail.com')->first();
        $this->admin = User::where('role', User::ROLE_ADMIN)->where('is_active', true)->first();
    }

    /** Booking 2 dewasa, sudah bayar $paid */
    private function booking(int $paid): Booking
    {
        $dep = Package::first()->upcomingDepartures()->first();
        $this->actingAs($this->customer)->post('/pesan/umrah', ['departure_id' => $dep->id, 'room_type' => 'quad', 'scheme' => 'cicilan', 'agree' => true,
            'passengers' => [['full_name' => 'Boy', 'gender' => 'L', 'birth_date' => '1990-01-01'], ['full_name' => 'Adik', 'gender' => 'P', 'birth_date' => '2016-01-01']]])
            ->assertSessionHasNoErrors();
        $b = Booking::latest('id')->first();
        $this->post('/bayar', ['payable_type' => 'booking', 'code' => $b->code, 'method' => 'qris', 'amount' => $paid, 'idempotency_key' => (string) Str::uuid()])->assertSessionHasNoErrors();
        $this->post('/bayar/'.Payment::latest('id')->first()->code.'/simulasi', ['status' => 'PAID']);

        return $b->fresh();
    }

    private function assertScheduleMatches(Booking $b): void
    {
        $b->refresh();
        $this->assertSame((int) $b->total_amount, (int) $b->installments()->sum('amount'), 'jumlah termin = total');
        $this->assertSame((int) $b->paid_amount, (int) $b->installments()->sum('paid_amount'), 'alokasi bayar = dibayar');
    }

    public function test_admin_reduces_one_passenger_with_refund(): void
    {
        $b = $this->booking(10_000_000);
        $unit = $b->unit_price;
        $boy = $b->passengers()->where('full_name', 'Boy')->first();
        $adik = $b->passengers()->where('full_name', 'Adik')->first();
        $booked = $b->departure->fresh()->booked;

        $this->actingAs($this->admin)->post(route('admin.bookings.reduce', $b), [
            'passenger_ids' => [$adik->id], 'refund_amount' => 5_000_000, 'reason' => 'Adik batal berangkat',
        ])->assertSessionHasNoErrors();

        $b->refresh();
        $this->assertSame(1, $b->pax_count);
        $this->assertSame($unit, $b->total_amount);
        $this->assertSame(5_000_000, $b->paid_amount);
        $this->assertSame('cicilan_berjalan', $b->status); // pengurangan tidak mengubah status
        $this->assertSame($booked - 1, $b->departure->fresh()->booked);
        $this->assertSame([$boy->id], $b->passengers()->pluck('id')->all());
        $this->assertScheduleMatches($b);
        $this->assertDatabaseHas('refunds', ['refundable_id' => $b->id, 'type' => 'pengurangan', 'status' => 'disetujui', 'approved_amount' => 5_000_000]);
        $this->assertDatabaseHas('booking_changes', ['booking_id' => $b->id, 'type' => 'pengurangan', 'refund_amount' => 5_000_000]);

        // tidak boleh mengurangi semua jamaah
        $this->post(route('admin.bookings.reduce', $b), ['passenger_ids' => [$boy->id], 'refund_amount' => 0, 'reason' => 'x'])->assertSessionHasErrors('passenger_ids');
    }

    public function test_admin_changes_adult_to_child_and_overpayment_must_be_refunded(): void
    {
        $b = $this->booking(10_000_000);
        [$boy, $adik] = [$b->passengers()->where('full_name', 'Boy')->first(), $b->passengers()->where('full_name', 'Adik')->first()];
        $childPrice = $b->unit_price - 5_000_000;
        $payload = fn (int $refund) => ['refund_amount' => $refund, 'reason' => 'Adik ternyata anak-anak', 'passengers' => [
            ['id' => $boy->id, 'category' => 'dewasa', 'price' => $b->unit_price],
            ['id' => $adik->id, 'category' => 'anak', 'price' => $childPrice],
        ]];

        $this->actingAs($this->admin)->post(route('admin.bookings.change', $b), $payload(0))->assertSessionHasNoErrors();
        $b->refresh();
        $this->assertSame($b->unit_price * 2 - 5_000_000, $b->total_amount);
        $this->assertSame(2, $b->pax_count);
        $this->assertSame('anak', $adik->fresh()->category);
        $this->assertScheduleMatches($b);
        // invoice memuat baris dewasa & anak
        $this->assertCount(2, $b->invoices()->where('type', 'invoice')->first()->items);

        // dana melebihi yang dibayar ditolak
        $this->post(route('admin.bookings.change', $b), $payload(99_000_000))->assertSessionHasErrors();
    }

    public function test_admin_cancel_with_refund_sets_refund_status(): void
    {
        $b = $this->booking(6_000_000);
        $this->actingAs($this->admin)->post(route('admin.bookings.cancel', $b), ['reason' => 'Sakit', 'refund_amount' => 5_000_000])->assertSessionHasNoErrors();
        $this->assertSame('refund', $b->fresh()->status);
        $this->assertDatabaseHas('refunds', ['refundable_id' => $b->id, 'type' => 'pembatalan', 'status' => 'disetujui', 'approved_amount' => 5_000_000]);

        $b2 = $this->booking(6_000_000);
        $this->actingAs($this->admin)->post(route('admin.bookings.cancel', $b2), ['reason' => 'Tanpa dana kembali', 'refund_amount' => 0])->assertSessionHasNoErrors();
        $this->assertSame('dibatalkan', $b2->fresh()->status);
    }

    public function test_customer_requests_reduction_and_admin_approval_applies_it(): void
    {
        $b = $this->booking(10_000_000);
        $adik = $b->passengers()->where('full_name', 'Adik')->first();

        $this->actingAs($this->customer)->post(route('customer.refunds.store'), [
            'order_type' => 'booking', 'order_code' => $b->code, 'type' => 'pengurangan', 'passenger_ids' => [$adik->id],
            'amount' => 5_000_000, 'reason' => 'Adik tidak jadi ikut karena sekolah', 'bank_name' => 'BSI', 'account_number' => '1234567890', 'account_holder' => 'Boy',
        ])->assertSessionHasNoErrors();
        $refund = Refund::latest('id')->first();
        $this->assertSame('pengurangan', $refund->type);
        $this->assertSame([$adik->id], $refund->passenger_ids);

        $this->actingAs($this->admin)->put(route('admin.refunds.update', $refund), ['action' => 'setujui', 'approved_amount' => 4_000_000])->assertSessionHasNoErrors();
        $b->refresh();
        $this->assertSame(1, $b->pax_count);
        $this->assertSame(6_000_000, $b->paid_amount);
        $this->assertSame('disetujui', $refund->fresh()->status);
        $this->assertScheduleMatches($b);
    }

    public function test_customer_cancellation_request_approved_sets_refund_status(): void
    {
        $b = $this->booking(6_000_000);
        $this->actingAs($this->customer)->post(route('customer.refunds.store'), [
            'order_type' => 'booking', 'order_code' => $b->code, 'type' => 'pembatalan', 'amount' => 6_000_000,
            'reason' => 'Ada keperluan keluarga mendadak', 'bank_name' => 'BSI', 'account_number' => '1234567890', 'account_holder' => 'Boy',
        ])->assertSessionHasNoErrors();

        $this->actingAs($this->admin)->put(route('admin.refunds.update', Refund::latest('id')->first()), ['action' => 'setujui', 'approved_amount' => 5_000_000])
            ->assertSessionHasNoErrors();
        $this->assertSame('refund', $b->fresh()->status);

        $this->actingAs($this->customer)->get(route('customer.bookings.show', $b))->assertInertia(fn ($p) => $p->where('canRequest', false)->has('changes', 1));
    }
}
