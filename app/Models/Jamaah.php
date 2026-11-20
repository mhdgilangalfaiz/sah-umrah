<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Jamaah extends Model
{
    protected $table = 'jamaah';

    public const RELATIONS = [
        'diri_sendiri' => 'Diri Sendiri', 'suami' => 'Suami', 'istri' => 'Istri', 'anak' => 'Anak',
        'orang_tua' => 'Orang Tua', 'saudara' => 'Saudara', 'lainnya' => 'Lainnya',
    ];

    protected $fillable = [
        'user_id', 'full_name', 'relation', 'nik', 'passport_number', 'passport_place', 'passport_issued_at',
        'passport_expiry', 'birth_place', 'birth_date', 'gender', 'phone', 'mahram_id', 'mahram_relation',
    ];

    protected $hidden = ['nik', 'passport_number'];

    protected $appends = ['masked_passport'];

    protected function casts(): array
    {
        return [
            'nik' => 'encrypted',
            'passport_number' => 'encrypted',
            'passport_issued_at' => 'date:Y-m-d',
            'passport_expiry' => 'date:Y-m-d',
            'birth_date' => 'date:Y-m-d',
        ];
    }

    public function user() { return $this->belongsTo(User::class); }
    public function mahram() { return $this->belongsTo(Jamaah::class, 'mahram_id'); }
    public function documents() { return $this->hasMany(Document::class); }

    /** Nomor paspor ditampilkan tersamar, mis. A1*****67 */
    public function getMaskedPassportAttribute(): ?string
    {
        $p = $this->passport_number;

        return $p ? substr($p, 0, 2).str_repeat('*', max(strlen($p) - 4, 0)).substr($p, -2) : null;
    }
}
