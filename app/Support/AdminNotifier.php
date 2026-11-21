<?php

namespace App\Support;

use App\Models\User;
use App\Notifications\SystemNotification;
use Illuminate\Support\Facades\Notification;

/**
 * Kirim notifikasi in-app ke admin.
 * Semua notifikasi masuk ke peran Admin; Super Admin ikut menerima kategori pembelian (pesanan & pembayaran)
 * karena hanya itu yang bisa ia lihat.
 */
class AdminNotifier
{
    public const SUPER_ADMIN_CATEGORIES = ['pesanan', 'pembayaran'];

    public static function notify(string $category, string $title, string $message, ?string $url = null, bool $mail = false, string $level = 'info'): void
    {
        $roles = in_array($category, self::SUPER_ADMIN_CATEGORIES, true) ? User::ADMIN_ROLES : [User::ROLE_ADMIN];
        $admins = User::whereIn('role', $roles)->where('is_active', true)->get();
        if ($admins->isEmpty()) return;
        Notification::send($admins, new SystemNotification($category, $title, $message, $url, 'Buka', $mail, false, $level));
    }
}
