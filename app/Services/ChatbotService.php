<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\ChatbotIntent;
use App\Models\FlightOrder;
use App\Models\SupportTicket;
use App\Models\TicketMessage;
use App\Models\VisaApplication;
use App\Support\AdminNotifier;
use App\Support\Audit;
use Illuminate\Support\Str;

/**
 * Asisten otomatis Pusat Bantuan.
 * 1) Mencocokkan pertanyaan dengan kata kunci di tabel chatbot_intents (dikelola admin).
 * 2) Jika tidak ada jawaban yang cocok → menawarkan untuk dihubungkan dengan admin.
 * 3) Saat dihubungkan, admin menerima notifikasi dan melihat seluruh riwayat percakapan.
 */
class ChatbotService
{
    public const OPT_ADMIN = 'Hubungkan saya dengan Admin';
    public const OPT_MENU = 'Kembali ke menu utama';
    public const OPT_STATUS = 'Cek status pesanan saya';

    public const MAIN_MENU = [
        'Informasi Paket Umrah',
        'Pemesanan Tiket Pesawat',
        'Layanan Visa Umrah',
        'Cara Pembayaran & Cicilan',
        self::OPT_STATUS,
        self::OPT_ADMIN,
    ];

    public function greet(SupportTicket $ticket): TicketMessage
    {
        $name = $ticket->user?->name ? ', '.Str::words($ticket->user->name, 2, '') : '';

        return $this->bot($ticket, "Assalamu'alaikum{$name} 🙏\nSelamat datang di Pusat Bantuan PT. Sumatera Andalan Haramain.\n\nAda yang dapat kami bantu hari ini? Silakan pilih topik di bawah ini atau ketikkan pertanyaan Anda.", self::MAIN_MENU);
    }

    public function handleUserMessage(SupportTicket $ticket, string $text): array
    {
        $msg = $ticket->messages()->create([
            'sender_type' => 'user', 'sender_id' => $ticket->user_id, 'message' => Str::limit(trim($text), 2000, ''),
        ]);
        $ticket->update(['last_message_at' => now()]);
        $out = [$msg];

        // Jika sudah ditangani/menunggu admin → bot diam, admin yang membalas
        if (in_array($ticket->status, ['menunggu_admin', 'ditangani'], true)) {
            if ($ticket->status === 'menunggu_admin') {
                AdminNotifier::notify('bantuan', 'Pesan baru dari '.($ticket->user?->name ?? 'Tamu'),
                    Str::limit($text, 80), route('admin.support.show', $ticket));
            }

            return $out;
        }

        if ($ticket->status === 'selesai') {
            $ticket->update(['status' => 'bot', 'closed_at' => null]);
        }

        $norm = Str::lower(trim($text));

        if ($norm === Str::lower(self::OPT_ADMIN) || preg_match('/\b(admin|cs|manusia|petugas|operator)\b/u', $norm)) {
            $out[] = $this->escalate($ticket);

            return $out;
        }
        if ($norm === Str::lower(self::OPT_MENU) || in_array($norm, ['menu', 'mulai', 'start'], true)) {
            $out[] = $this->bot($ticket, 'Baik, berikut menu utama kami. Silakan pilih topik yang Anda butuhkan:', self::MAIN_MENU);

            return $out;
        }
        if ($norm === Str::lower(self::OPT_STATUS) || Str::contains($norm, ['status pesanan', 'pesanan saya', 'cek pesanan'])) {
            $out[] = $this->orderStatus($ticket);

            return $out;
        }

        if ($intent = $this->match($norm)) {
            $intent->increment('hits');
            $options = array_values(array_unique(array_merge($intent->quick_replies ?? [], [self::OPT_MENU, self::OPT_ADMIN])));
            $out[] = $this->bot($ticket, $intent->answer."\n\nApakah jawaban ini membantu? Bila masih ada yang ingin ditanyakan, silakan ketik kembali.", $options);

            return $out;
        }

        $out[] = $this->bot($ticket, 'Mohon maaf, asisten otomatis kami belum dapat menjawab pertanyaan tersebut. 🙏'.
            "\nApakah Anda berkenan kami hubungkan langsung dengan admin kami? Riwayat percakapan ini akan diteruskan sehingga Anda tidak perlu mengulang pertanyaan.",
            [self::OPT_ADMIN, self::OPT_MENU]);

        return $out;
    }

    /** Pencocokan kata kunci sederhana dengan skor (jumlah kata kunci yang cocok, bobot frasa panjang) */
    public function match(string $text): ?ChatbotIntent
    {
        $best = null;
        $bestScore = 0;
        foreach (ChatbotIntent::where('is_active', true)->get() as $intent) {
            $score = 0;
            foreach (array_filter(array_map('trim', explode(',', Str::lower($intent->keywords)))) as $kw) {
                if ($kw !== '' && Str::contains($text, $kw)) {
                    $score += 1 + substr_count($kw, ' ');
                }
            }
            if ($score > $bestScore) {
                $bestScore = $score;
                $best = $intent;
            }
        }

        return $best;
    }

    public function escalate(SupportTicket $ticket): TicketMessage
    {
        if (! $ticket->user_id) {
            return $this->bot($ticket, 'Untuk terhubung dengan admin, silakan masuk atau daftar akun terlebih dahulu agar kami dapat mengenali dan membantu Anda dengan aman. 🙏',
                [self::OPT_MENU], ['login_required' => true]);
        }

        $ticket->update(['status' => 'menunggu_admin', 'escalated_at' => now()]);
        Audit::log('bantuan.eskalasi', "Tiket {$ticket->code} dihubungkan ke admin", $ticket);
        AdminNotifier::notify('bantuan', 'Permintaan bantuan — '.$ticket->user->name,
            'Pelanggan '.$ticket->user->customer_code.' meminta dihubungkan dengan admin (tiket '.$ticket->code.').',
            route('admin.support.show', $ticket), true, 'warning');

        return $ticket->messages()->create([
            'sender_type' => 'system',
            'message' => 'Permintaan Anda telah kami teruskan kepada admin. Mohon kesediaannya menunggu sebentar, admin kami akan segera membalas di percakapan ini. (Kode tiket: '.$ticket->code.')',
        ]);
    }

    private function orderStatus(SupportTicket $ticket): TicketMessage
    {
        $user = $ticket->user;
        if (! $user) {
            return $this->bot($ticket, 'Silakan masuk ke akun Anda terlebih dahulu untuk melihat status pesanan.', [self::OPT_MENU]);
        }
        $label = fn ($s) => Str::of($s)->replace('_', ' ')->title();
        $lines = [];
        foreach (Booking::with('departure.package')->where('user_id', $user->id)->latest()->take(3)->get() as $b) {
            $lines[] = "• {$b->code} — Umrah {$b->departure->package->name}: {$label($b->status)} (sisa Rp".number_format($b->outstandingAmount(), 0, ',', '.').')';
        }
        foreach (FlightOrder::where('user_id', $user->id)->latest()->take(2)->get() as $f) {
            $lines[] = "• {$f->code} — Tiket pesawat: {$label($f->status)}";
        }
        foreach (VisaApplication::where('user_id', $user->id)->latest()->take(2)->get() as $v) {
            $lines[] = "• {$v->code} — Visa: ".(VisaApplication::STATUSES[$v->status] ?? $v->status);
        }
        $text = $lines ? "Berikut status pesanan terakhir Anda:\n".implode("\n", $lines)."\n\nDetail lengkap tersedia di menu Dashboard › Pesanan Saya."
            : 'Anda belum memiliki pesanan. Silakan lihat paket umrah kami terlebih dahulu. 😊';

        return $this->bot($ticket, $text, [self::OPT_MENU, self::OPT_ADMIN]);
    }

    private function bot(SupportTicket $ticket, string $text, array $options = [], array $meta = []): TicketMessage
    {
        $ticket->update(['last_message_at' => now()]);

        return $ticket->messages()->create([
            'sender_type' => 'bot', 'message' => $text, 'options' => $options ? ['replies' => $options] + $meta : ($meta ?: null),
        ]);
    }
}
