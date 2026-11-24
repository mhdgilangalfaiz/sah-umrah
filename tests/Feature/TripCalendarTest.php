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
            ->where('calendarEvents', fn ($events) => collect($events)->contains(fn ($e) => $e['type'] === 'departure' && $e['date'] === $dep->departure_date->toDateString())
                && collect($events)->contains(fn ($e) => in_array($e['type'], ['installment', 'deadline'], true))));
    }

    public function test_calendar_is_empty_without_orders(): void
    {
        $this->actingAs(User::factory()->create())->get('/dashboard')->assertInertia(fn (Assert $p) => $p->where('calendarEvents', []));
    }
}
