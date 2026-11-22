<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BookingPassenger extends Model
{
    /** Kategori jamaah pada pesanan umrah — harga per kategori diatur admin per pesanan */
    public const CATEGORIES = ['dewasa' => 'Dewasa', 'anak' => 'Anak', 'bayi' => 'Bayi'];

    protected $fillable = [
        'jamaah_id', 'title', 'category', 'price', 'full_name', 'gender', 'birth_date', 'nik', 'passport_number', 'passport_expiry',
        'nationality', 'mahram_name', 'mahram_relation',
    ];

    protected $hidden = ['nik', 'passport_number'];

    protected function casts(): array
    {
        return [
            'nik' => 'encrypted', 'passport_number' => 'encrypted',
            'birth_date' => 'date:Y-m-d', 'passport_expiry' => 'date:Y-m-d', 'price' => 'integer',
        ];
    }

    public function orderable() { return $this->morphTo(); }
    public function jamaah() { return $this->belongsTo(Jamaah::class); }
}
