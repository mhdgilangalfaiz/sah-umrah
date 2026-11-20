<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\URL;

class Document extends Model
{
    public const TYPES = [
        'paspor' => 'Paspor',
        'foto' => 'Pas Foto',
        'ktp' => 'KTP',
        'kk' => 'Kartu Keluarga',
        'buku_nikah' => 'Buku Nikah',
        'vaksin' => 'Sertifikat Vaksin',
        'berkas_visa' => 'Berkas Visa (ZIP/RAR)',
        'visa_terbit' => 'Visa Terbit',
        'eticket' => 'E-Ticket',
        'lainnya' => 'Lainnya',
    ];

    protected $fillable = [
        'user_id', 'jamaah_id', 'documentable_type', 'documentable_id', 'type', 'original_name', 'file_name', 'disk',
        'path', 'mime', 'size', 'is_encrypted', 'status', 'rejection_note', 'uploaded_by', 'verified_by', 'verified_at',
    ];

    protected $hidden = ['path', 'disk'];

    protected $appends = ['type_label'];

    protected function casts(): array
    {
        return ['is_encrypted' => 'boolean', 'verified_at' => 'datetime'];
    }

    public function getTypeLabelAttribute(): string
    {
        return self::TYPES[$this->type] ?? $this->type;
    }

    /** URL unduh bertanda tangan & berbatas waktu (file disimpan privat) */
    public function signedUrl(int $minutes = 10): string
    {
        return URL::temporarySignedRoute('documents.download', now()->addMinutes($minutes), ['document' => $this->id]);
    }

    public function user() { return $this->belongsTo(User::class); }
    public function jamaah() { return $this->belongsTo(Jamaah::class); }
    public function documentable() { return $this->morphTo(); }
    public function verifier() { return $this->belongsTo(User::class, 'verified_by'); }
}
