<?php

namespace App\Notifications;

use App\Notifications\Channels\WhatsAppChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Satu kelas notifikasi untuk semua kejadian sistem (in-app + email, opsional WhatsApp otomatis).
 * Kategori: akun, promo, pesanan, pembayaran, cicilan, dokumen, visa, tiket, keberangkatan, bantuan, keamanan.
 * In-app (database) dikirim langsung; email/WA lewat antrean (queue).
 */
class SystemNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public string $category,
        public string $title,
        public string $message,
        public ?string $url = null,
        public ?string $actionText = null,
        public bool $mail = true,
        public bool $whatsapp = false,
        public string $level = 'info', // info | success | warning | danger
    ) {}

    public function via(object $notifiable): array
    {
        $channels = ['database'];
        if ($this->mail && $notifiable->email) $channels[] = 'mail';
        if ($this->whatsapp && $notifiable->phone) $channels[] = WhatsAppChannel::class;

        return $channels;
    }

    public function viaConnections(): array
    {
        return ['database' => 'sync'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $mail = (new MailMessage)
            ->subject($this->title.' — '.config('app.name'))
            ->greeting('Assalamu\'alaikum, '.$notifiable->name)
            ->line($this->message);
        if ($this->url) $mail->action($this->actionText ?? 'Buka', $this->url);

        return $mail->salutation("Wassalam,\nPT. Sumatera Andalan Haramain");
    }

    public function toWhatsApp(object $notifiable): string
    {
        return "*{$this->title}*\n\n{$this->message}".($this->url ? "\n\n{$this->url}" : '')."\n\n— PT. Sumatera Andalan Haramain (pesan otomatis)";
    }

    public function toArray(object $notifiable): array
    {
        return [
            'category' => $this->category,
            'title' => $this->title,
            'message' => $this->message,
            'url' => $this->url,
            'level' => $this->level,
        ];
    }
}
