<?php

namespace App\Support;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;

/**
 * Pencatat audit: siapa melakukan apa dan kapan.
 * Contoh: Audit::log('paket.harga_ubah', 'Mengubah harga paket X', $package, $old, $new);
 */
class Audit
{
    public static function log(string $action, string $description, ?Model $subject = null, array $old = [], array $new = [], $user = null): AuditLog
    {
        $user ??= auth()->user();
        $request = request();

        return AuditLog::create([
            'user_id' => $user?->id,
            'user_name' => $user?->name ?? 'Sistem',
            'role' => $user?->role ?? 'system',
            'action' => $action,
            'auditable_type' => $subject ? $subject->getMorphClass() : null,
            'auditable_id' => $subject?->getKey(),
            'description' => $description,
            'old_values' => self::scrub($old) ?: null,
            'new_values' => self::scrub($new) ?: null,
            'ip' => $request?->ip(),
            'user_agent' => substr((string) $request?->userAgent(), 0, 250),
            'created_at' => now(),
        ]);
    }

    /** Catat perubahan model (hanya field yang berubah) */
    public static function changes(string $action, string $description, Model $model): void
    {
        $changes = $model->getChanges();
        unset($changes['updated_at']);
        if (! $changes) return;
        $old = array_intersect_key($model->getOriginal(), $changes);
        self::log($action, $description, $model, $old, $changes);
    }

    /** Jangan pernah simpan data sensitif ke audit log */
    private static function scrub(array $data): array
    {
        foreach (['password', 'nik', 'passport_number', 'account_number', 'remember_token'] as $k) {
            if (array_key_exists($k, $data)) $data[$k] = '[disamarkan]';
        }

        return $data;
    }
}
