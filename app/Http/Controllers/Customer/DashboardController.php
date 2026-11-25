<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\PaymentInstallment;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DashboardController extends Controller
{
    private const BOOKING_STATUS = [
        'menunggu_pembayaran' => 'Menunggu Pembayaran',
        'cicilan_berjalan' => 'Cicilan Berjalan',
        'lunas' => 'Lunas',
    ];

    public function index(Request $request)
    {
        $u = $request->user();

        $active = Booking::with('departure.package')->where('user_id', $u->id)
            ->whereIn('status', array_keys(self::BOOKING_STATUS))->latest()->get();

        // Perjalanan terdekat yang belum berangkat ditampilkan sebagai "Perjalanan Umrah Aktif"
        $trip = $active->sortBy(fn ($b) => $b->departure->departure_date)
            ->first(fn ($b) => $b->departure->departure_date->gte(today())) ?? $active->first();

        return Inertia::render('Customer/Dashboard', [
            'stats' => [
                'umrah' => $u->bookings()->count(),
                'tiket' => $u->flightOrders()->count(),
                'visa' => $u->visaApplications()->count(),
                'outstanding' => $active->sum(fn ($b) => $b->outstandingAmount())
                    + $u->flightOrders()->where('status', 'menunggu_pembayaran')->sum('total_amount')
                    + $u->visaApplications()->where('status', 'menunggu_pembayaran')->get()->sum(fn ($v) => $v->outstandingAmount()),
                'documents_pending' => $u->documents()->where('status', '!=', 'diverifikasi')->count(),
            ],
            'activeTrip' => $trip ? [
                'code' => $trip->code,
                'package' => $trip->departure->package->name,
                'image' => $trip->departure->package->cover_url ?? '/images/landing/galeri-2.webp',
                'status' => $trip->status,
                'status_label' => self::BOOKING_STATUS[$trip->status] ?? $trip->status,
                'departure_date' => $trip->departure->departure_date->toDateString(),
                'days_left' => (int) today()->diffInDays($trip->departure->departure_date, false),
                'total' => (int) $trip->total_amount,
                'paid' => (int) $trip->paid_amount,
                'overdue' => $trip->isOverdue(),
                'url' => route('customer.bookings.show', $trip->code),
            ] : null,
            'installments' => PaymentInstallment::with('booking:id,code')
                ->whereHas('booking', fn ($q) => $q->where('user_id', $u->id)->whereIn('status', ['menunggu_pembayaran', 'cicilan_berjalan']))
                ->where('status', '!=', 'lunas')->orderBy('due_date')->take(3)->get()
                ->map(fn (PaymentInstallment $i) => [
                    'id' => $i->id,
                    'label' => $i->label ?: 'Termin '.$i->sequence,
                    'code' => $i->booking->code,
                    'due_date' => $i->due_date?->toDateString(),
                    'amount' => (int) ($i->amount - $i->paid_amount),
                    'overdue' => $i->due_date && $i->due_date->lt(today()),
                    'url' => route('customer.bookings.show', $i->booking->code),
                ]),
            'calendarEvents' => $this->calendarEvents($u, $active),
            'notifications' => $u->notifications()->take(4)->get()->map(fn ($n) => [
                'id' => $n->id,
                'title' => $n->data['title'] ?? 'Notifikasi',
                'category' => $n->data['category'] ?? 'info',
                'read' => (bool) $n->read_at,
                'time' => $n->created_at->locale('id')->diffForHumans(),
            ]),
        ]);
    }

    /**
     * Tanggal penting jamaah untuk "Kalender Perjalanan Saya", masing-masing dengan penanda sendiri:
     * umrah (berangkat & pulang), tiket pesawat (terbang & kembali), visa (terbit & rencana berangkat),
     * jatuh tempo cicilan, dan batas pelunasan.
     */
    private function calendarEvents($u, $active): array
    {
        $events = [];
        $rp = fn ($n) => 'Rp'.number_format((int) $n, 0, ',', '.');

        // ---- Paket umrah
        foreach ($active as $b) {
            $url = route('customer.bookings.show', $b->code);
            $name = $b->departure->package->name;
            $events[] = ['date' => $b->departure->departure_date->toDateString(), 'type' => 'umrah',
                'title' => 'Berangkat umrah', 'detail' => $name.' · '.$b->code, 'url' => $url];
            if ($b->departure->return_date) {
                $events[] = ['date' => $b->departure->return_date->toDateString(), 'type' => 'umrah',
                    'title' => 'Pulang umrah', 'detail' => $name.' · '.$b->code, 'url' => $url];
            }
            if ($b->status !== 'lunas' && $b->payment_deadline) {
                $events[] = ['date' => $b->payment_deadline->toDateString(), 'type' => 'deadline',
                    'title' => 'Batas pelunasan umrah', 'detail' => $b->code.' · sisa '.$rp($b->outstandingAmount()),
                    'overdue' => $b->payment_deadline->lt(today()), 'url' => $url];
            }
        }

        PaymentInstallment::with('booking:id,code')
            ->whereHas('booking', fn ($q) => $q->where('user_id', $u->id)->whereIn('status', ['menunggu_pembayaran', 'cicilan_berjalan']))
            ->where('status', '!=', 'lunas')->whereNotNull('due_date')->orderBy('due_date')->get()
            ->each(function (PaymentInstallment $i) use (&$events) {
                $events[] = ['date' => $i->due_date->toDateString(), 'type' => 'installment',
                    'title' => ($i->label ?: 'Termin '.$i->sequence).' jatuh tempo', 'detail' => $i->booking->code,
                    'amount' => (int) ($i->amount - $i->paid_amount), 'overdue' => $i->due_date->lt(today()),
                    'url' => route('customer.bookings.show', $i->booking->code)];
            });

        // ---- Tiket pesawat
        $u->flightOrders()->with('flight')->whereNotIn('status', ['dibatalkan', 'kedaluwarsa'])->get()
            ->filter(fn ($o) => $o->flight?->depart_at)
            ->each(function ($o) use (&$events, $rp) {
                $f = $o->flight;
                $url = route('customer.flight-orders.show', $o->code);
                $seat = $o->pax_count.' seat';
                $events[] = ['date' => $f->depart_at->toDateString(), 'type' => 'flight',
                    'title' => 'Terbang '.$f->origin_code.' → '.$f->destination_code.' · '.$f->depart_at->format('H.i'),
                    'detail' => $f->airline.' '.$f->flight_number.' · '.$seat.' · '.$o->code, 'url' => $url];
                if ($f->return_depart_at) {
                    $events[] = ['date' => $f->return_depart_at->toDateString(), 'type' => 'flight',
                        'title' => 'Terbang kembali '.$f->destination_code.' → '.$f->origin_code.' · '.$f->return_depart_at->format('H.i'),
                        'detail' => $f->airline.' · '.$seat.' · '.$o->code, 'url' => $url];
                }
                if ($o->settlement_due_at && $o->outstandingAmount() > 0 && in_array($o->status, ['menunggu_pembayaran', 'cicilan_berjalan'], true)) {
                    $events[] = ['date' => $o->settlement_due_at->toDateString(), 'type' => 'deadline',
                        'title' => 'Batas pelunasan tiket', 'detail' => $o->code.' · sisa '.$rp($o->outstandingAmount()),
                        'overdue' => $o->settlement_due_at->isPast(), 'url' => $url];
                }
            });

        // ---- Visa
        $u->visaApplications()->with('service:id,name')->whereNotIn('status', ['ditolak', 'dibatalkan'])->get()
            ->each(function ($v) use (&$events) {
                $url = route('customer.visa.show', $v->code);
                $name = $v->service?->name ?? 'Visa';
                if ($v->issued_at) {
                    $events[] = ['date' => $v->issued_at->toDateString(), 'type' => 'visa',
                        'title' => 'Visa terbit', 'detail' => $name.' · '.$v->pax_count.' orang · '.$v->code, 'url' => $url];
                }
                if ($v->planned_departure) {
                    $events[] = ['date' => $v->planned_departure->toDateString(), 'type' => 'visa',
                        'title' => 'Rencana berangkat (visa)', 'detail' => $name.' · '.$v->code, 'url' => $url];
                }
            });

        return collect($events)->sortBy('date')->values()->all();
    }
}
