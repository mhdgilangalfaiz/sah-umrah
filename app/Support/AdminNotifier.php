<?php

namespace App\Support;

use App\Models\User;
use App\Notifications\SystemNotification;
use Illuminate\Support\Facades\Notification;

/** Kirim notifikasi in-app ke admin berdasarkan peran (super_admin selalu ikut). */
class AdminNotifier
{
    public static function notify(array $roles, string $category, string $title, string $message, ?string $url = null, bool $mail = false, string $level = 'info'): void
    {
        $admins = User::whereIn('role', array_unique(array_merge(['super_admin'], $roles)))->where('is_active', true)->get();
        if ($admins->isEmpty()) return;
        Notification::send($admins, new SystemNotification($category, $title, $message, $url, 'Buka', $mail, false, $level));
    }
}
