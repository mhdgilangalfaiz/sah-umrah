<?php

namespace App\Notifications\Channels;

use App\Services\WhatsAppService;
use Illuminate\Notifications\Notification;

/** Kanal WhatsApp — HANYA untuk pengingat otomatis (cicilan/keberangkatan), bukan konsultasi/pemesanan. */
class WhatsAppChannel
{
    public function __construct(private WhatsAppService $wa) {}

    public function send(object $notifiable, Notification $notification): void
    {
        if (! method_exists($notification, 'toWhatsApp') || ! $notifiable->phone) return;
        $this->wa->send($notifiable->phone, $notification->toWhatsApp($notifiable));
    }
}
