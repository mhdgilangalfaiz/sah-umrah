<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\User>
 */
class UserFactory extends Factory
{
    protected static ?string $password;

    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => Str::lower(Str::random(10)).'@gmail.com',
            'email_verified_at' => now(),
            'password' => static::$password ??= Hash::make('password'),
            'remember_token' => Str::random(10),
            'phone' => '0812'.fake()->numerify('########'),
            'nik' => fake()->numerify('################'),
            'birth_place' => 'Medan',
            'birth_date' => '1990-01-01',
            'gender' => 'L',
            'address' => 'Jl. Contoh No. 1',
            'city' => 'Medan',
            'profile_completed_at' => now(),
            'pdp_consent_at' => now(),
        ];
    }

    public function unverified(): static
    {
        return $this->state(fn () => ['email_verified_at' => null]);
    }

    /** Akun admin (role & flag diisi lewat forceFill karena tidak fillable) */
    public function admin(string $role = 'super_admin', bool $primary = false): static
    {
        return $this->state(fn () => ['email' => Str::lower(Str::random(8)).'@sah.co.id'])
            ->afterMaking(fn ($u) => $u->forceFill(['role' => $role, 'is_primary_admin' => $primary]));
    }
}
