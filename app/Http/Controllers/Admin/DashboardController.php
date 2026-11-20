<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\FlightOrder;
use App\Models\PackageDeparture;
use App\Models\Payment;
use App\Models\SecurityAlert;
use App\Models\VisaApplication;
use Illuminate\Support\Carbon;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index()
    {
        $paid = Payment::where('status', 'dibayar');
        $map = [Booking::class => 'umrah', FlightOrder::class => 'tiket', VisaApplication::class => 'visa'];

        // Omzet 6 bulan terakhir per layanan
        $chart = [];
        for ($i = 5; $i >= 0; $i--) {
            $m = Carbon::now()->startOfMonth()->subMonths($i);
            $row = ['bulan' => $m->translatedFormat('M y'), 'umrah' => 0, 'tiket' => 0, 'visa' => 0];
            $sums = Payment::where('status', 'dibayar')->whereBetween('paid_at', [$m, $m->copy()->endOfMonth()])
                ->selectRaw('payable_type, SUM(amount) as total')->groupBy('payable_type')->pluck('total', 'payable_type');
            foreach ($sums as $type => $total) {
                $row[$map[$type] ?? 'umrah'] = (int) $total;
            }
            $chart[] = $row;
        }

        $departures = PackageDeparture::with('package:id,name')
            ->whereBetween('departure_date', [today(), today()->addDays(45)])->orderBy('departure_date')->get()
            ->map(fn ($d) => [
                'id' => $d->id, 'package' => $d->package->name, 'date' => $d->departure_date->format('Y-m-d'),
                'days_left' => (int) today()->diffInDays($d->departure_date), 'booked' => $d->booked, 'quota' => $d->quota, 'remaining' => $d->remaining,
            ]);

        return Inertia::render('Admin/Dashboard', [
            'stats' => [
                'revenue_month' => (int) (clone $paid)->where('paid_at', '>=', now()->startOfMonth())->sum('amount'),
                'revenue_total' => (int) (clone $paid)->sum('amount'),
                'orders' => [
                    'umrah' => Booking::count(),
                    'tiket' => FlightOrder::count(),
                    'visa' => VisaApplication::count(),
                ],
                'pending_payments' => Payment::where('status', 'menunggu_pembayaran')->where('expires_at', '>', now())->count(),
                'outstanding' => (int) Booking::whereIn('status', ['cicilan_berjalan', 'menunggu_pembayaran'])->selectRaw('SUM(total_amount - paid_amount) as s')->value('s'),
                'overdue' => Booking::where('status', 'cicilan_berjalan')->where('payment_deadline', '<', today())->count(),
                'quota_remaining' => (int) PackageDeparture::where('status', 'open')->where('departure_date', '>', today())->get()->sum('remaining'),
            ],
            'chart' => $chart,
            'departures' => $departures,
            'recentPayments' => Payment::with('user:id,name')->where('status', 'dibayar')->latest('paid_at')->take(8)->get()
                ->map(fn ($p) => ['code' => $p->code, 'user' => $p->user->name, 'amount' => $p->amount, 'method' => $p->method_label, 'paid_at' => $p->paid_at?->diffForHumans()]),
            'alerts' => SecurityAlert::whereNull('resolved_at')->latest()->take(5)->get(),
        ]);
    }
}
