<?php

namespace App\Support;

use App\Models\Flight;
use App\Models\Package;
use App\Models\Promotion;
use App\Models\Setting;
use App\Models\VisaService;

/**
 * Menyusun pesan WhatsApp siaran agen dari layanan yang dipilih admin.
 * {nama} diganti nama tiap agen saat dikirim. Teks bisa diedit admin sebelum dikirim.
 * Format WA: *tebal*, _miring_.
 */
class AgentMessage
{
    /** Pilihan layanan untuk form siaran: [type => [[id, label, sub]]] */
    public static function options(): array
    {
        return [
            'paket' => Package::where('is_active', true)->latest('id')->get(['id', 'name', 'duration_days', 'price_quad'])
                ->map(fn ($p) => ['id' => $p->id, 'label' => $p->name, 'sub' => $p->duration_days.' hari · mulai '.self::rp($p->price_quad)])->values(),
            'tiket' => Flight::where('is_active', true)->where('depart_at', '>', now())->orderBy('depart_at')->take(100)->get()
                ->map(fn ($f) => ['id' => $f->id, 'label' => "{$f->airline} {$f->route_label}", 'sub' => $f->depart_at->translatedFormat('d M Y H:i').' · '.self::rp($f->price)])->values(),
            'visa' => VisaService::where('is_active', true)->get(['id', 'name', 'price', 'processing_days'])
                ->map(fn ($v) => ['id' => $v->id, 'label' => $v->name, 'sub' => self::rp($v->price).' · proses '.$v->processing_days.' hari'])->values(),
            'promo' => Promotion::latest('id')->take(30)->get(['id', 'title', 'created_at'])
                ->map(fn ($p) => ['id' => $p->id, 'label' => $p->title, 'sub' => 'dikirim '.$p->created_at->translatedFormat('d M Y')])->values(),
        ];
    }

    /** @return array{title: string, message: string}|null */
    public static function build(string $type, ?int $id): ?array
    {
        $company = Setting::get('company_name', 'SAH - PT. Sumatera Andalan Haramain');
        $footer = "\n\nInfo & pemesanan hubungi kami.\n_{$company}_";

        switch ($type) {
            case 'paket':
                $p = Package::with('upcomingDepartures')->find($id);
                if (! $p) return null;
                $dates = $p->upcomingDepartures->take(3)->map(fn ($d) => $d->departure_date->translatedFormat('d M Y'))->implode(', ');
                $lines = array_filter([
                    "Assalamu'alaikum {nama},",
                    '',
                    '*PAKET UMRAH: '.mb_strtoupper($p->name).'*',
                    $p->summary ? $p->summary : null,
                    '',
                    "🕋 Durasi: {$p->duration_days} hari".($p->departure_city ? " · berangkat dari {$p->departure_city}" : ''),
                    $p->airline ? "✈️ Maskapai: {$p->airline}" : null,
                    $p->hotel_makkah ? "🏨 Makkah: {$p->hotel_makkah}".($p->hotel_makkah_star ? " ({$p->hotel_makkah_star}★)" : '') : null,
                    $p->hotel_madinah ? "🏨 Madinah: {$p->hotel_madinah}".($p->hotel_madinah_star ? " ({$p->hotel_madinah_star}★)" : '') : null,
                    $dates ? "🗓 Jadwal: {$dates}" : null,
                    '💰 Harga: Quad '.self::rp($p->price_quad).' · Triple '.self::rp($p->price_triple).' · Double '.self::rp($p->price_double),
                    '',
                    'Detail paket: '.route('packages.show', $p->slug),
                ], fn ($l) => $l !== null);

                return ['title' => 'Paket Umrah — '.$p->name, 'message' => implode("\n", $lines).$footer];

            case 'tiket':
                $f = Flight::find($id);
                if (! $f) return null;
                $lines = array_filter([
                    "Assalamu'alaikum {nama},",
                    '',
                    '*TIKET PESAWAT TERSEDIA*',
                    "✈️ {$f->airline} {$f->flight_number}",
                    "🛫 Rute: {$f->origin_city} → {$f->destination_city} ({$f->route_label})",
                    '🗓 Berangkat: '.$f->depart_at->translatedFormat('l, d M Y H:i'),
                    $f->return_depart_at ? '🛬 Kembali: '.$f->return_depart_at->translatedFormat('l, d M Y H:i') : null,
                    $f->baggage_kg ? "🧳 Bagasi: {$f->baggage_kg} kg" : null,
                    $f->seats_available !== null ? "💺 Sisa kursi: {$f->seats_available}" : null,
                    '💰 Harga: '.self::rp($f->price).' /orang',
                    '',
                    'Pesan: '.route('flights.index', ['asal' => $f->origin_code, 'tujuan' => $f->destination_code]),
                ], fn ($l) => $l !== null);

                return ['title' => 'Tiket — '.$f->airline.' '.$f->route_label, 'message' => implode("\n", $lines).$footer];

            case 'visa':
                $v = VisaService::find($id);
                if (! $v) return null;
                $lines = array_filter([
                    "Assalamu'alaikum {nama},",
                    '',
                    '*LAYANAN VISA: '.mb_strtoupper($v->name).'*',
                    $v->description ? strip_tags($v->description) : null,
                    '',
                    '💰 Biaya: '.self::rp($v->price).' /orang',
                    $v->processing_days ? "⏱ Proses: ±{$v->processing_days} hari kerja" : null,
                    '',
                    'Ajukan: '.route('visa.index'),
                ], fn ($l) => $l !== null);

                return ['title' => 'Visa — '.$v->name, 'message' => implode("\n", $lines).$footer];

            case 'promo':
                $p = Promotion::find($id);
                if (! $p) return null;
                $lines = array_filter([
                    "Assalamu'alaikum {nama},",
                    '',
                    '*PROMO: '.mb_strtoupper($p->title).'*',
                    $p->message,
                    $p->link ? "\nInfo: {$p->link}" : null,
                ], fn ($l) => $l !== null);

                return ['title' => 'Promo — '.$p->title, 'message' => implode("\n", $lines).$footer];

            default: // pesan bebas
                return ['title' => 'Informasi untuk agen', 'message' => "Assalamu'alaikum {nama},\n\n".$footer];
        }
    }

    /** Ganti {nama} dengan nama agen */
    public static function personalize(string $message, string $name): string
    {
        return str_replace('{nama}', $name, $message);
    }

    private static function rp($n): string
    {
        return 'Rp'.number_format((int) $n, 0, ',', '.');
    }
}
