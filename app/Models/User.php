<?php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Str;

class User extends Authenticatable implements MustVerifyEmail
{
    use HasFactory, Notifiable;

    public const ROLE_CUSTOMER = 'customer';
    public const ADMIN_ROLES = ['super_admin', 'finance', 'operasional', 'cs'];
    public const ROLE_LABELS = [
        'customer' => 'Pelanggan',
        'super_admin' => 'Super Admin',
        'finance' => 'Finance',
        'operasional' => 'Operasional',
        'cs' => 'Customer Service',
    ];

    protected $fillable = [
        'name', 'email', 'password', 'google_id', 'avatar', 'phone', 'nik', 'birth_place', 'birth_date',
        'gender', 'address', 'city', 'profile_completed_at', 'pdp_consent_at', 'email_verified_at',
    ];

    // role / is_primary_admin / is_active sengaja TIDAK fillable (cegah mass-assignment privilege escalation)

    protected $attributes = ['role' => 'customer', 'is_active' => true, 'is_primary_admin' => false];

    protected $hidden = ['password', 'remember_token', 'nik', 'google_id'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'profile_completed_at' => 'datetime',
            'pdp_consent_at' => 'datetime',
            'last_login_at' => 'datetime',
            'birth_date' => 'date',
            'password' => 'hashed',
            'nik' => 'encrypted',
            'is_primary_admin' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (User $user) {
            if (! $user->customer_code) {
                do {
                    $code = 'SAH-'.strtoupper(Str::random(6));
                } while (static::where('customer_code', $code)->exists());
                $user->customer_code = $code;
            }
        });
    }

    public function isAdmin(): bool
    {
        return in_array($this->role, self::ADMIN_ROLES, true);
    }

    public function hasRole(string ...$roles): bool
    {
        return $this->role === 'super_admin' || in_array($this->role, $roles, true);
    }

    public function needsProfileCompletion(): bool
    {
        return ! $this->isAdmin() && is_null($this->profile_completed_at);
    }

    public function roleLabel(): string
    {
        return self::ROLE_LABELS[$this->role] ?? $this->role;
    }

    /** Nama yang aman dipakai untuk penamaan file, mis. "jaya" → berkas_jaya.pdf */
    public function fileSlug(): string
    {
        return Str::slug(Str::limit($this->name, 40, ''), '_') ?: 'user'.$this->id;
    }

    public function jamaah() { return $this->hasMany(Jamaah::class); }
    public function bookings() { return $this->hasMany(Booking::class); }
    public function flightOrders() { return $this->hasMany(FlightOrder::class); }
    public function visaApplications() { return $this->hasMany(VisaApplication::class); }
    public function payments() { return $this->hasMany(Payment::class); }
    public function documents() { return $this->hasMany(Document::class); }
    public function supportTickets() { return $this->hasMany(SupportTicket::class); }
    public function refunds() { return $this->hasMany(Refund::class); }

    public function scopeAdmins($q) { return $q->whereIn('role', self::ADMIN_ROLES); }
    public function scopeCustomers($q) { return $q->where('role', self::ROLE_CUSTOMER); }
}
