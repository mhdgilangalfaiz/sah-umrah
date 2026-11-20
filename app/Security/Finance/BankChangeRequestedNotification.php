<?php

namespace App\Security\Finance;

use App\Models\User;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/** Email ke pemilik perusahaan saat ada permintaan perubahan rekening (dikirim langsung, tidak lewat queue). */
class BankChangeRequestedNotification extends Notification
{
    public function __construct(
        public CompanyBankAccount $account,
        public User $requester,
        public string $approveUrl,
        public string $cancelUrl,
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->error()
            ->subject('⚠️ PERINGATAN KEAMANAN: Permintaan Perubahan Rekening Bank — '.config('app.name'))
            ->greeting('Peringatan Keamanan Data Keuangan')
            ->line('Ada permintaan untuk menambahkan/mengubah rekening bank perusahaan:')
            ->line('**Bank:** '.$this->account->bank_name)
            ->line('**No. Rekening:** '.$this->account->masked_number)
            ->line('**Atas Nama:** '.$this->account->account_holder)
            ->line('**Tujuan:** '.$this->account->purpose)
            ->line('**Diajukan oleh:** '.$this->requester->name.' ('.$this->requester->email.') dari IP '.$this->account->requested_ip)
            ->line('**Waktu:** '.now()->translatedFormat('d M Y H:i').' WIB')
            ->line('Jika Anda **TIDAK** mengenali permintaan ini, klik tombol di bawah. Rekening baru akan langsung diblokir & dimatikan, dan akun admin pengaju akan dinonaktifkan.')
            ->action('BATALKAN & BLOKIR REKENING INI', $this->cancelUrl)
            ->line('Jika permintaan ini memang sah, setujui melalui tautan berikut:')
            ->line('[Setujui perubahan rekening]('.$this->approveUrl.')')
            ->line('Tanpa tindakan dalam '.config('finance.approval_hours', 24).' jam, permintaan otomatis DIBLOKIR.');
    }
}
