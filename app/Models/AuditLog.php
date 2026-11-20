<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Audit log hanya boleh ditambah, tidak pernah diubah/dihapus dari aplikasi. */
class AuditLog extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = [
        'user_id', 'user_name', 'role', 'action', 'auditable_type', 'auditable_id', 'description',
        'old_values', 'new_values', 'ip', 'user_agent', 'created_at',
    ];

    protected function casts(): array
    {
        return ['old_values' => 'array', 'new_values' => 'array', 'created_at' => 'datetime'];
    }

    protected static function booted(): void
    {
        static::updating(fn () => false);
        static::deleting(fn () => false);
    }

    public function user() { return $this->belongsTo(User::class); }
    public function auditable() { return $this->morphTo(); }
}
