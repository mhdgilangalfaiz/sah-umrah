<?php

namespace Tests\Feature;

use App\Models\Package;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** Setiap orang yang dipesankan otomatis tercatat di Data Jamaah pemilik akun, tanpa dobel. */
class CheckoutJamaahTest extends TestCase
{
    use RefreshDatabase;

    public function test_all_passengers_are_saved_as_jamaah_without_duplicates(): void
    {
        $user = User::factory()->create();
        $pkg = Package::create(['name' => 'Paket Uji', 'slug' => 'paket-uji', 'type' => 'reguler', 'duration_days' => 9,
            'price_quad' => 10000000, 'price_triple' => 11000000, 'price_double' => 12000000, 'min_deposit' => 3000000]);
        $dep = $pkg->departures()->create(['departure_date' => now()->addDays(120), 'return_date' => now()->addDays(128), 'quota' => 20]);

        $five = collect(['Jaya', 'Siti', 'Ahmad', 'Fatimah', 'Ali'])->map(fn ($n, $i) => ['full_name' => $n, 'gender' => $i % 2 ? 'P' : 'L', 'birth_date' => (1980 + $i).'-01-01'])->all();
        $book = fn (array $passengers) => $this->actingAs($user)->post('/pesan/umrah', [
            'departure_id' => $dep->id, 'room_type' => 'quad', 'scheme' => 'cicilan', 'agree' => true, 'passengers' => $passengers,
        ])->assertSessionHasNoErrors();

        // pesan untuk 5 orang (tanpa centang apa pun) → 5 jamaah tercatat & tersambung ke penumpang
        $book($five);
        $this->assertSame(5, $user->jamaah()->count());
        $this->assertSame(0, \App\Models\BookingPassenger::whereNull('jamaah_id')->count());

        // pesan lagi untuk orang yang sama (beda kapital) + paspor baru → tidak dobel, paspor dilengkapi
        $book([['full_name' => 'jaya', 'gender' => 'L', 'birth_date' => '1980-01-01', 'passport_number' => 'C1234567', 'passport_expiry' => now()->addYears(5)->toDateString()]]);
        $this->assertSame(5, $user->jamaah()->count());
        $this->assertNotNull($user->jamaah()->where('full_name', 'Jaya')->first()->passport_expiry);
    }
}
