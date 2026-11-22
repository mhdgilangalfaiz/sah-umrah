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

    /** Dokumen pribadi jamaah yang diunggah pelanggan & diverifikasi admin di Data Jamaah */
    public const JAMAAH_TYPES = ['paspor', 'foto', 'ktp', 'kk', 'buku_nikah', 'vaksin', 'lainnya'];

    protected $fillable = [
        'user_id', 'jamaah_id', 'documentable_type', 'documentable_id', 'type', 'original_name', 'file_name', 'disk',
        'path', 'mime', 'size', 'is_encrypted', 'status', 'rejection_note', 'review', 'uploaded_by', 'verified_by', 'verified_at',
    ];

    protected $hidden = ['path', 'disk'];

    protected $appends = ['type_label'];

    protected function casts(): array
    {
        return ['is_encrypted' => 'boolean', 'verified_at' => 'datetime', 'review' => 'array'];
    }

    public function getTypeLabelAttribute(): string
    {
        return self::TYPES[$this->type] ?? $this->type;
    }

    public function isZip(): bool
    {
        return strtolower(pathinfo($this->file_name, PATHINFO_EXTENSION)) === 'zip';
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
