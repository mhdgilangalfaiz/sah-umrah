<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\FlightOrder;
use App\Models\Invoice;
use App\Models\VisaApplication;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;

/** Laporan invoice & kwitansi semua pembelian (dapat dilihat Admin dan Super Admin). */
class InvoiceController extends Controller
{
    private const SERVICES = [Booking::class => 'Paket Umrah', FlightOrder::class => 'Tiket Pesawat', VisaApplication::class => 'Visa'];

    public function index(Request $request)
    {
        $filters = $request->validate([
            'q' => 'nullable|string|max:100',
            'jenis' => 'nullable|in:invoice,kwitansi',
            'status' => 'nullable|in:belum_lunas,lunas,batal',
            'layanan' => 'nullable|in:umrah,tiket,visa',
            'dari' => 'nullable|date',
            'sampai' => 'nullable|date',
        ]);
        $from = Carbon::parse($filters['dari'] ?? now()->startOfMonth())->startOfDay();
        $to = Carbon::parse($filters['sampai'] ?? now())->endOfDay();
        $serviceMap = ['umrah' => Booking::class, 'tiket' => FlightOrder::class, 'visa' => VisaApplication::class];

        $q = Invoice::with(['user:id,name,email', 'invoiceable'])
            ->whereBetween('issued_at', [$from, $to])
            ->when($filters['jenis'] ?? null, fn ($q, $v) => $q->where('type', $v))
            ->when($filters['status'] ?? null, fn ($q, $v) => $q->where('status', $v))
            ->when($filters['layanan'] ?? null, fn ($q, $v) => $q->where('invoiceable_type', (new $serviceMap[$v])->getMorphClass()))
            ->when($filters['q'] ?? null, fn ($q, $v) => $q->where(fn ($w) => $w
                ->where('number', 'like', "%$v%")
                ->orWhereHas('user', fn ($u) => $u->where('name', 'like', "%$v%")->orWhere('email', 'like', "%$v%"))));

        $summary = (clone $q)->selectRaw('type, status, COUNT(*) as n, SUM(amount) as total')->groupBy('type', 'status')->get();
        $sum = fn ($type, $status = null) => (int) $summary->where('type', $type)->when($status, fn ($c) => $c->where('status', $status))->sum('total');

        return Inertia::render('Admin/Invoices', [
            'invoices' => $q->latest('issued_at')->latest('id')->paginate(25)->withQueryString()->through(fn (Invoice $i) => [
                'id' => $i->id,
                'number' => $i->number,
                'type' => $i->type,
                'status' => $i->status,
                'amount' => $i->amount,
                'issued_at' => $i->issued_at?->format('Y-m-d H:i'),
                'customer' => $i->user?->name,
                'email' => $i->user?->email,
                'service' => $i->invoiceable ? (self::SERVICES[$i->invoiceable::class] ?? '-') : '-',
                'order_code' => $i->invoiceable?->code,
                'order_url' => $this->orderUrl($i),
                'pdf_url' => route('invoices.pdf', $i),
            ]),
            'summary' => [
                'invoice_count' => (int) $summary->where('type', 'invoice')->sum('n'),
                'invoice_total' => $sum('invoice'),
                'unpaid_total' => $sum('invoice', 'belum_lunas'),
                'receipt_count' => (int) $summary->where('type', 'kwitansi')->sum('n'),
                'receipt_total' => $sum('kwitansi'),
            ],
            'filters' => $filters + ['dari' => $from->format('Y-m-d'), 'sampai' => $to->format('Y-m-d')],
        ]);
    }

    private function orderUrl(Invoice $i): ?string
    {
        $o = $i->invoiceable;

        return match (true) {
            $o instanceof Booking => route('admin.bookings.show', $o),
            $o instanceof FlightOrder => route('admin.flight-orders.show', $o),
            $o instanceof VisaApplication => route('admin.visa.show', $o),
            default => null,
        };
    }
}
