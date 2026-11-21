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
            'notifications' => $u->notifications()->take(4)->get()->map(fn ($n) => [
                'id' => $n->id,
                'title' => $n->data['title'] ?? 'Notifikasi',
                'category' => $n->data['category'] ?? 'info',
                'read' => (bool) $n->read_at,
                'time' => $n->created_at->locale('id')->diffForHumans(),
            ]),
        ]);
    }
}
