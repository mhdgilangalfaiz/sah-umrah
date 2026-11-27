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

        $norm = self::normalize($text);

        if ($norm === Str::lower(self::OPT_ADMIN) || preg_match('/\b(admin|cs|manusia|petugas|operator)\b/u', $norm)) {
            $out[] = $this->escalate($ticket);

            return $out;
        }
        if ($norm === Str::lower(self::OPT_MENU) || in_array($norm, ['menu', 'mulai', 'start'], true)) {
            $out[] = $this->bot($ticket, 'Baik, berikut menu utama kami. Silakan pilih topik yang Anda butuhkan:', self::MAIN_MENU);

            return $out;
        }
        if ($this->isHelpRequest($norm)) {
            $out[] = $this->bot($ticket, 'Tentu, dengan senang hati kami bantu. 😊 Silakan pilih topik di bawah ini, atau ketik pertanyaan Anda, mis. "berapa harga paket umrah?" atau "syarat dokumen visa".', self::MAIN_MENU);

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

        // Belum yakin: tawarkan topik yang paling mirip sebagai tombol, plus opsi admin
        $suggest = $this->suggestions($norm);
        $out[] = $this->bot($ticket, $suggest
            ? 'Mohon maaf, kami belum menemukan jawaban yang pas. 🙏 Mungkin maksud Anda salah satu topik berikut? Atau kami hubungkan langsung dengan admin.'
            : 'Mohon maaf, asisten otomatis kami belum dapat menjawab pertanyaan tersebut. 🙏'.
                "\nSilakan pilih topik di bawah, atau kami hubungkan langsung dengan admin — riwayat percakapan ini akan diteruskan sehingga Anda tidak perlu mengulang pertanyaan.",
            $suggest ? array_values(array_unique([...$suggest, self::OPT_ADMIN, self::OPT_MENU])) : array_values(array_unique([...array_slice(self::MAIN_MENU, 0, 4), self::OPT_ADMIN])));

        return $out;
    }

    /** Singkatan & bahasa sehari-hari → kata baku, agar ketikan bebas tetap dikenali */
    private const SLANG = [
        'brp' => 'berapa', 'brapa' => 'berapa', 'gmn' => 'bagaimana', 'gimana' => 'bagaimana', 'gmana' => 'bagaimana', 'bgmn' => 'bagaimana',
        'yg' => 'yang', 'dgn' => 'dengan', 'utk' => 'untuk', 'tdk' => 'tidak', 'gak' => 'tidak', 'ga' => 'tidak', 'nggak' => 'tidak', 'gk' => 'tidak',
        'tf' => 'transfer', 'trf' => 'transfer', 'umroh' => 'umrah', 'umrohnya' => 'umrah', 'byr' => 'bayar', 'bayarnya' => 'bayar',
        'harganya' => 'harga', 'biayanya' => 'biaya', 'pasport' => 'paspor', 'passport' => 'paspor', 'pasporku' => 'paspor',
        'tiketnya' => 'tiket', 'visanya' => 'visa', 'jadwalnya' => 'jadwal', 'cicil' => 'cicilan', 'nyicil' => 'cicilan', 'kredit' => 'cicilan',
        'ass' => 'assalamualaikum', 'askum' => 'assalamualaikum', 'asw' => 'assalamualaikum', 'p' => 'halo', 'hallo' => 'halo', 'hello' => 'halo', 'hi' => 'hai',
        'mksh' => 'makasih', 'thx' => 'thanks', 'tq' => 'thanks', 'dmn' => 'dimana', 'dmana' => 'dimana',
    ];

    /** huruf kecil, tanda baca jadi spasi (kecuali &), singkatan diganti kata baku */
    public static function normalize(string $text): string
    {
        $t = Str::lower(trim($text));
        $t = preg_replace("/[^\\p{L}\\p{N}&\\s]+/u", ' ', $t);
        $words = preg_split('/\\s+/u', trim($t), -1, PREG_SPLIT_NO_EMPTY);

        return implode(' ', array_map(fn ($w) => self::SLANG[$w] ?? $w, $words));
    }

    /** "bantu saya", "tolong", "mau tanya", "info dong" → tampilkan menu (bukan pertanyaan spesifik) */
    private function isHelpRequest(string $norm): bool
    {
        $help = ['bantu', 'bantuan', 'tolong', 'help', 'tanya', 'bertanya', 'info', 'informasi', 'mau tanya', 'minta tolong'];
        $filler = ['saya', 'aku', 'kami', 'dong', 'donk', 'ya', 'kak', 'min', 'admin', 'pak', 'bu', 'mau', 'ingin', 'bisa', 'boleh', 'mohon', 'nih', 'sih', 'tolong', 'minta', 'apa', 'bisakah'];
        $words = explode(' ', $norm);
        if (! array_intersect($words, $help)) return false;

        // hanya berisi kata bantuan + kata pengisi → permintaan umum
        return ! array_diff($words, [...$help, ...$filler]);
    }

    /** Kata kunci cocok bila: frasa ada di teks (kata pendek ≤3 huruf harus kata utuh), atau kata mirip (salah ketik ringan) */
    private static function keywordScore(string $text, string $kw): float
    {
        if ($kw === '') return 0;
        $padded = ' '.$text.' ';
        if (mb_strlen($kw) <= 3 ? Str::contains($padded, ' '.$kw.' ') : Str::contains($text, $kw)) {
            return 1 + substr_count($kw, ' ');
        }
        // toleransi salah ketik untuk kata kunci satu kata yang cukup panjang
        if (! str_contains($kw, ' ') && mb_strlen($kw) >= 5) {
            $max = mb_strlen($kw) >= 8 ? 2 : 1;
            foreach (explode(' ', $text) as $w) {
                if (mb_strlen($w) >= 4 && abs(mb_strlen($w) - mb_strlen($kw)) <= $max && levenshtein($w, $kw) <= $max) {
                    return 0.8;
                }
            }
        }

        return 0;
    }

    /** @return array<int, array{0: ChatbotIntent, 1: float}> skor tiap topik, tertinggi dulu */
    private function scores(string $text): array
    {
        $out = [];
        foreach (ChatbotIntent::where('is_active', true)->get() as $intent) {
            $score = 0;
            foreach (array_filter(array_map(fn ($k) => self::normalize($k), explode(',', $intent->keywords))) as $kw) {
                $score += self::keywordScore($text, $kw);
            }
            if ($score > 0) $out[] = [$intent, $score];
        }
        usort($out, fn ($a, $b) => $b[1] <=> $a[1]);

        return $out;
    }

    /** Pencocokan kata kunci dengan skor (frasa panjang lebih berbobot, salah ketik ringan ditoleransi) */
    public function match(string $text): ?ChatbotIntent
    {
        $scores = $this->scores(self::normalize($text));

        return $scores && $scores[0][1] >= 0.8 ? $scores[0][0] : null;
    }

    /** Judul topik yang paling mirip (untuk tombol saran) — termasuk kecocokan sebagian kata judul */
    private function suggestions(string $norm): array
    {
        $words = array_filter(explode(' ', $norm), fn ($w) => mb_strlen($w) >= 4);
        if (! $words) return [];
        $out = [];
        foreach (ChatbotIntent::where('is_active', true)->whereNotIn('category', ['umum'])->get() as $intent) {
            $title = self::normalize($intent->title.' '.$intent->keywords);
            foreach ($words as $w) {
                foreach (explode(' ', $title) as $tw) {
                    if (mb_strlen($tw) >= 4 && (str_starts_with($tw, mb_substr($w, 0, 4)) || levenshtein($w, $tw) <= 2)) {
                        $out[$intent->id] = Str::ucfirst($intent->title);
                        break 2;
                    }
                }
            }
        }

        return array_slice(array_values($out), 0, 3);
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
