<?php

namespace App\Http\Controllers\Admin;

use App\Exports\ArrayExport;
use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Notifications\SystemNotification;
use App\Services\BookingService;
use App\Support\Audit;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Maatwebsite\Excel\Facades\Excel;

class BookingController extends Controller
{
    private function query(Request $request)
    {
        return Booking::with(['user:id,name,email,phone,customer_code', 'departure.package:id,name'])
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->when($request->q, fn ($q, $s) => $q->where(fn ($w) => $w->where('code', 'like', "%$s%")
                ->orWhereHas('user', fn ($u) => $u->where('name', 'like', "%$s%")->orWhere('customer_code', 'like', "%$s%"))))
            ->when($request->boolean('terlambat'), fn ($q) => $q->where('status', 'cicilan_berjalan')->where('payment_deadline', '<', today()))
            ->when($request->dari, fn ($q, $d) => $q->whereDate('created_at', '>=', $d))
            ->when($request->sampai, fn ($q, $d) => $q->whereDate('created_at', '<=', $d))
            ->latest();
    }

    public function index(Request $request)
    {
        return Inertia::render('Admin/Bookings/Index', [
            'bookings' => $this->query($request)->paginate(20)->withQueryString()->through(fn ($b) => [
                'code' => $b->code, 'user' => $b->user->name, 'customer_code' => $b->user->customer_code,
                'package' => $b->departure->package->name, 'departure_date' => $b->departure->departure_date->format('Y-m-d'),
                'pax' => $b->pax_count, 'total' => $b->total_amount, 'paid' => $b->paid_amount, 'status' => $b->status,
                'scheme' => $b->payment_scheme, 'overdue' => $b->isOverdue(), 'created_at' => $b->created_at->format('d/m/Y'),
            ]),
            'filters' => $request->only('status', 'q', 'terlambat', 'dari', 'sampai'),
        ]);
    }

    public function show(Booking $booking)
    {
        $booking->load('user', 'departure.package', 'installments', 'passengers', 'invoices', 'refunds');

        return Inertia::render('Admin/Bookings/Show', [
            'booking' => $booking,
            'customer' => $booking->user->only('name', 'email', 'phone', 'customer_code', 'city'),
            'passengers' => $booking->passengers->map(fn ($p) => [
                ...$p->only('id', 'title', 'full_name', 'gender', 'nationality', 'mahram_name', 'mahram_relation'),
                'birth_date' => $p->birth_date?->format('d/m/Y'), 'passport_number' => $p->passport_number,
                'passport_expiry' => $p->passport_expiry?->format('d/m/Y'), 'nik' => $p->nik,
            ]),
            'payments' => $booking->payments()->get(),
            'outstanding' => $booking->outstandingAmount(),
            'overdue' => $booking->isOverdue(),
            'reminders' => \App\Models\ReminderLog::where('remindable_type', $booking->getMorphClass())->where('remindable_id', $booking->id)->latest()->take(20)->get(),
            'documents' => $booking->user->documents()->whereIn('jamaah_id', $booking->passengers->pluck('jamaah_id')->filter())->get()
                ->map(fn ($d) => ['id' => $d->id, 'type_label' => $d->type_label, 'file_name' => $d->file_name, 'status' => $d->status, 'url' => $d->signedUrl()]),
        ]);
    }

    public function cancel(Request $request, Booking $booking, BookingService $service)
    {
        $data = $request->validate(['reason' => 'required|string|max:300']);
        abort_if(in_array($booking->status, ['dibatalkan', 'selesai'], true), 422);
        $service->cancel($booking, $data['reason'], $request->user());
        $booking->user->notify(new SystemNotification('pesanan', 'Pesanan Dibatalkan — '.$booking->code,
            'Pesanan Anda dibatalkan oleh admin. Alasan: '.$data['reason'].'. Bila ada dana yang telah dibayar, silakan ajukan refund melalui dashboard.',
            route('customer.refunds.index'), 'Ajukan Refund', true, false, 'warning'));

        return back()->with('success', 'Pesanan dibatalkan.');
    }

    public function export(Request $request)
    {
        $rows = $this->query($request)->get()->map(fn ($b) => [
            $b->code, $b->created_at->format('d/m/Y'), $b->user->name, $b->user->customer_code, $b->user->phone,
            $b->departure->package->name, $b->departure->departure_date->format('d/m/Y'), $b->pax_count, strtoupper($b->room_type),
            $b->payment_scheme, $b->total_amount, $b->paid_amount, $b->outstandingAmount(), $b->status,
        ])->all();
        Audit::log('pesanan.ekspor', 'Ekspor data pesanan umrah ('.count($rows).' baris)');

        return Excel::download(new ArrayExport(['Kode', 'Tanggal', 'Pemesan', 'Kode Pelanggan', 'HP', 'Paket', 'Berangkat', 'Pax', 'Kamar', 'Skema', 'Total', 'Dibayar', 'Sisa', 'Status'], $rows),
            'pesanan-umrah-'.now()->format('d-m-y').'.xlsx');
    }
}
