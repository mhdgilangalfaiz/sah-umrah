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

/** Laporan invoice semua pembelian (dapat dilihat Admin dan Super Admin). */
class InvoiceController extends Controller
{
    private const SERVICES = [Booking::class => 'Paket Umrah', FlightOrder::class => 'Tiket Pesawat', VisaApplication::class => 'Visa'];

    public function index(Request $request)
    {
        $filters = $request->validate([
            'q' => 'nullable|string|max:100',
            'status' => 'nullable|in:belum_lunas,lunas,batal',
            'layanan' => 'nullable|in:umrah,tiket,visa',
            'dari' => 'nullable|date',
            'sampai' => 'nullable|date',
        ]);
        $from = Carbon::parse($filters['dari'] ?? now()->startOfMonth())->startOfDay();
        $to = Carbon::parse($filters['sampai'] ?? now())->endOfDay();
        $serviceMap = ['umrah' => Booking::class, 'tiket' => FlightOrder::class, 'visa' => VisaApplication::class];

        // hanya invoice terbaru tiap pesanan (invoice yang sudah diganti revisi tampil di riwayat pesanannya)
        $q = Invoice::with(['user:id,name,email', 'invoiceable' => fn ($m) => $m->morphWith([Booking::class => ['departure'], FlightOrder::class => ['flight']])])
            ->where('type', 'invoice')->where('status', '!=', 'direvisi')
            ->whereBetween('issued_at', [$from, $to])
            ->when($filters['status'] ?? null, fn ($q, $v) => $q->where('status', $v))
            ->when($filters['layanan'] ?? null, fn ($q, $v) => $q->where('invoiceable_type', (new $serviceMap[$v])->getMorphClass()))
            ->when($filters['q'] ?? null, fn ($q, $v) => $q->where(fn ($w) => $w
                ->where('number', 'like', "%$v%")
                ->orWhereHas('user', fn ($u) => $u->where('name', 'like', "%$v%")->orWhere('email', 'like', "%$v%"))));

        $summary = (clone $q)->selectRaw('type, status, COUNT(*) as n, SUM(amount) as total')->groupBy('type', 'status')->get();
        $counted = $summary->reject(fn ($r) => $r->type === 'invoice' && in_array($r->status, Invoice::INACTIVE, true));
        $sum = fn ($type, $status = null) => (int) $counted->where('type', $type)->when($status, fn ($c) => $c->where('status', $status))->sum('total');

        $received = \App\Models\Payment::where('status', 'dibayar')->whereBetween('paid_at', [$from, $to])
            ->when($filters['layanan'] ?? null, fn ($q, $v) => $q->where('payable_type', (new $serviceMap[$v])->getMorphClass()));

        return Inertia::render('Admin/Invoices', [
            'invoices' => $this->withHistory($q->orderBy('number')->orderBy('id')->paginate(25)->withQueryString())->through(fn (Invoice $i) => [
                'id' => $i->id,
                'number' => $i->number,
                'type' => $i->type,
                'revision' => $i->revision,
                'status' => $i->display_status,
                'amount' => $i->amount,
                'issued_at' => $i->issued_at?->format('Y-m-d H:i'),
                'customer' => $i->user?->name,
                'email' => $i->user?->email,
                'service' => $i->invoiceable ? (self::SERVICES[$i->invoiceable::class] ?? '-') : '-',
                // tanggal keberangkatan & batas pelunasan → admin tahu tagihan mana yang paling mendesak
                ...$this->schedule($i->invoiceable),
                'order_code' => $i->invoiceable?->code,
                'order_url' => $this->orderUrl($i),
                'pdf_url' => route('invoices.pdf', $i),
                // seluruh invoice pesanan ini, dari yang pertama terbit sampai yang terbaru
                'history' => $i->getAttribute('history') ?? [],
            ]),
            'summary' => [
                'invoice_count' => (int) $counted->where('type', 'invoice')->sum('n'),
                'invoice_total' => $sum('invoice'),
                'unpaid_total' => $sum('invoice', 'belum_lunas'),
                // uang diterima = pembayaran sukses pada periode (dicatat di riwayat pembayaran invoice)
                'receipt_count' => (clone $received)->count(),
                'receipt_total' => (int) (clone $received)->sum('amount'),
            ],
            'filters' => $filters + ['dari' => $from->format('Y-m-d'), 'sampai' => $to->format('Y-m-d')],
        ]);
    }

    /** Lampirkan riwayat invoice tiap pesanan di halaman ini (satu query untuk semua baris) */
    private function withHistory($page)
    {
        $items = $page->getCollection();
        $all = Invoice::where('type', 'invoice')
            ->where(function ($w) use ($items) {
                foreach ($items->groupBy('invoiceable_type') as $type => $rows) {
                    $w->orWhere(fn ($x) => $x->where('invoiceable_type', $type)->whereIn('invoiceable_id', $rows->pluck('invoiceable_id')));
                }
            })
            ->orderBy('issued_at')->orderBy('id')->get()
            ->groupBy(fn ($i) => $i->invoiceable_type.'#'.$i->invoiceable_id);

        $items->each(function (Invoice $i) use ($all) {
            $list = $all->get($i->invoiceable_type.'#'.$i->invoiceable_id, collect());
            $i->setRelation('invoiceable', $i->invoiceable); // pakai pesanan yang sudah dimuat untuk label status
            $i->setAttribute('history', $list->map(function (Invoice $h) use ($i) {
                $h->setRelation('invoiceable', $i->invoiceable);

                return [
                    'id' => $h->id, 'number' => $h->number, 'revision' => $h->revision, 'status' => $h->display_status,
                    'amount' => (int) $h->amount, 'issued_at' => $h->issued_at?->format('Y-m-d H:i'), 'notes' => $h->notes,
                    'current' => $h->id === $i->id, 'pdf_url' => route('invoices.pdf', $h),
                ];
            })->values()->all());
        });

        return $page;
    }

    /** Tanggal keberangkatan, batas pelunasan, dan sisa tagihan pesanan */
    private function schedule($o): array
    {
        [$depart, $deadline] = match (true) {
            $o instanceof Booking => [$o->departure?->departure_date, $o->payment_deadline],
            $o instanceof FlightOrder => [$o->flight?->depart_at, $o->settlement_due_at],
            $o instanceof VisaApplication => [$o->planned_departure, null],
            default => [null, null],
        };
        $open = $o && ! in_array($o->status, ['dibatalkan', 'kedaluwarsa', 'refund', 'ditolak'], true);

        return [
            'departure_date' => $depart?->format('Y-m-d'),
            'deadline' => $deadline?->format('Y-m-d'),
            'outstanding' => $o && $open ? $o->outstandingAmount() : 0,
        ];
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
