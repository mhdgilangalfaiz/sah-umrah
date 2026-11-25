<?php

namespace Tests\Feature;

use App\Models\Package;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class TripCalendarTest extends TestCase
{
    use RefreshDatabase;

    public function test_dashboard_calendar_marks_departure_and_installments(): void
    {
        $user = User::factory()->create();
        $pkg = Package::create(['name' => 'Paket Uji', 'slug' => 'paket-uji', 'type' => 'reguler', 'duration_days' => 9,
            'price_quad' => 10000000, 'price_triple' => 11000000, 'price_double' => 12000000, 'min_deposit' => 3000000]);
        $dep = $pkg->departures()->create(['departure_date' => now()->addDays(120), 'return_date' => now()->addDays(128), 'quota' => 10]);

        $this->actingAs($user)->post('/pesan/umrah', [
            'departure_id' => $dep->id, 'room_type' => 'quad', 'scheme' => 'cicilan', 'agree' => true,
            'passengers' => [['full_name' => 'Jaya', 'gender' => 'L', 'birth_date' => '1990-01-01']],
        ])->assertSessionHasNoErrors();

        $this->actingAs($user)->get('/dashboard')->assertInertia(fn (Assert $p) => $p
            ->component('Customer/Dashboard')
            ->where('calendarEvents', fn ($events) => collect($events)->contains(fn ($e) => $e['type'] === 'umrah' && $e['date'] === $dep->departure_date->toDateString())
                && collect($events)->contains(fn ($e) => in_array($e['type'], ['installment', 'deadline'], true))));
    }

    public function test_tiket_pesawat_dan_visa_punya_penanda_sendiri(): void
    {
        $user = User::factory()->create();
        $flight = \App\Models\Flight::create([
            'airline' => 'Saudia', 'flight_number' => 'SV 817', 'origin_code' => 'KNO', 'origin_city' => 'Medan', 'destination_code' => 'JED', 'destination_city' => 'Jeddah',
            'depart_at' => now()->addDays(40)->setTime(8, 10), 'arrive_at' => now()->addDays(40)->setTime(17, 0),
            'return_depart_at' => now()->addDays(52)->setTime(19, 15), 'return_arrive_at' => now()->addDays(53)->setTime(9, 0),
            'price' => 10000000, 'seats_available' => 10,
        ]);
        \App\Models\FlightOrder::create(['code' => 'SAH-T-CAL1', 'user_id' => $user->id, 'flight_id' => $flight->id, 'pax_count' => 2,
            'unit_price' => 10000000, 'total_amount' => 20000000, 'paid_amount' => 20000000, 'status' => 'dibayar']);
        $svc = \App\Models\VisaService::create(['name' => 'Visa Umrah', 'price' => 2500000, 'processing_days' => 7]);
        \App\Models\VisaApplication::create(['code' => 'SAH-V-CAL1', 'user_id' => $user->id, 'visa_service_id' => $svc->id, 'pax_count' => 2,
            'planned_departure' => now()->addDays(40)->toDateString(), 'status' => 'terbit', 'issued_at' => now()->addDays(2),
            'unit_price' => 2500000, 'total_amount' => 5000000, 'paid_amount' => 5000000]);

        $this->actingAs($user)->get('/dashboard')->assertInertia(fn (Assert $p) => $p->where('calendarEvents', function ($events) use ($flight) {
            $e = collect($events);

            return $e->contains(fn ($x) => $x['type'] === 'flight' && $x['date'] === $flight->depart_at->toDateString())
                && $e->where('type', 'visa')->count() === 2
                && $e->contains(fn ($x) => $x['type'] === 'visa' && $x['title'] === 'Visa terbit');
        }));
    }

    public function test_calendar_is_empty_without_orders(): void
    {
        $this->actingAs(User::factory()->create())->get('/dashboard')->assertInertia(fn (Assert $p) => $p->where('calendarEvents', []));
    }
}
