<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\PaymentInstallment;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $u = $request->user();

        $active = Booking::with('departure.package')->where('user_id', $u->id)
            ->whereIn('status', ['menunggu_pembayaran', 'cicilan_berjalan', 'lunas'])->latest()->get();

        return Inertia::render('Customer/Dashboard', [
            'stats' => [
                'bookings' => $u->bookings()->count(),
                'flights' => $u->flightOrders()->count(),
                'visas' => $u->visaApplications()->count(),
                'outstanding' => $active->sum(fn ($b) => $b->outstandingAmount())
                    + $u->flightOrders()->where('status', 'menunggu_pembayaran')->sum('total_amount')
                    + $u->visaApplications()->where('status', 'menunggu_pembayaran')->get()->sum(fn ($v) => $v->outstandingAmount()),
                'documents_pending' => $u->documents()->where('status', '!=', 'diverifikasi')->count(),
            ],
            'activeBookings' => $active->map(fn ($b) => [
                'code' => $b->code, 'package' => $b->departure->package->name, 'status' => $b->status,
                'departure_date' => $b->departure->departure_date->format('Y-m-d'),
                'days_left' => (int) today()->diffInDays($b->departure->departure_date, false),
                'total' => $b->total_amount, 'paid' => $b->paid_amount, 'outstanding' => $b->outstandingAmount(),
                'deadline' => $b->payment_deadline?->format('Y-m-d'), 'overdue' => $b->isOverdue(),
            ]),
            'nextInstallments' => PaymentInstallment::with('booking:id,code')
                ->whereHas('booking', fn ($q) => $q->where('user_id', $u->id)->whereIn('status', ['menunggu_pembayaran', 'cicilan_berjalan']))
                ->where('status', '!=', 'lunas')->orderBy('due_date')->take(5)->get(),
            'notifications' => $u->notifications()->take(5)->get()->map(fn ($n) => ['id' => $n->id, 'data' => $n->data, 'read_at' => $n->read_at, 'created_at' => $n->created_at->diffForHumans()]),
            'visas' => $u->visaApplications()->with('service:id,name')->latest()->take(3)->get(),
        ]);
    }
}
