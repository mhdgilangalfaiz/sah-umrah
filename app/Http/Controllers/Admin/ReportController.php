<?php

namespace App\Http\Controllers\Admin;

use App\Exports\ArrayExport;
use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\FlightOrder;
use App\Models\Payment;
use App\Models\Refund;
use App\Models\Setting;
use App\Models\VisaApplication;
use App\Support\Audit;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Maatwebsite\Excel\Facades\Excel;

/** Laporan keuangan & pesanan per periode */
class ReportController extends Controller
{
    private function build(Request $request): array
    {
        $from = ($request->date('dari') ?? now()->startOfMonth())->startOfDay();
        $to = ($request->date('sampai') ?? now())->endOfDay();
        $labels = [Booking::class => 'Paket Umrah', FlightOrder::class => 'Tiket Pesawat', VisaApplication::class => 'Visa'];
        $layanan = in_array($request->query('layanan'), ['umrah', 'tiket', 'visa'], true) ? $request->query('layanan') : null;
        $model = ['umrah' => Booking::class, 'tiket' => FlightOrder::class, 'visa' => VisaApplication::class][$layanan] ?? null;
        $on = fn (string $key) => ! $layanan || $layanan === $key; // layanan ini ikut dihitung?

        $paid = Payment::with('user:id,name', 'payable')->where('status', 'dibayar')->whereBetween('paid_at', [$from, $to])
            ->when($model, fn ($q) => $q->where('payable_type', (new $model)->getMorphClass()))
            ->orderBy('paid_at')->get();

        return [
            'period' => ['dari' => $from->format('Y-m-d'), 'sampai' => $to->format('Y-m-d')] + ($layanan ? ['layanan' => $layanan] : []),
            'serviceLabel' => $model ? $labels[$model] : null,
            'summary' => [
                'revenue' => (int) $paid->sum('amount'),
                'transactions' => $paid->count(),
                'refunds' => (int) Refund::where('status', 'selesai')->whereBetween('updated_at', [$from, $to])
                    ->when($model, fn ($q) => $q->where('refundable_type', (new $model)->getMorphClass()))->sum('approved_amount'),
                'new_bookings' => $on('umrah') ? Booking::whereBetween('created_at', [$from, $to])->count() : 0,
                'new_flights' => $on('tiket') ? FlightOrder::whereBetween('created_at', [$from, $to])->count() : 0,
                'new_visas' => $on('visa') ? VisaApplication::whereBetween('created_at', [$from, $to])->count() : 0,
                'jamaah' => $on('umrah') ? (int) Booking::whereBetween('created_at', [$from, $to])->whereNotIn('status', ['dibatalkan', 'kedaluwarsa'])->sum('pax_count') : 0,
                // piutang = sisa tagihan pesanan yang sedang dicicil
                'receivable' => ($on('umrah') ? (int) Booking::whereIn('status', ['cicilan_berjalan'])->selectRaw('SUM(total_amount - paid_amount) s')->value('s') : 0)
                    + ($on('tiket') ? (int) FlightOrder::whereIn('status', ['cicilan_berjalan'])->selectRaw('SUM(total_amount - paid_amount) s')->value('s') : 0),
            ],
            'byService' => $paid->groupBy('payable_type')->map(fn ($g, $t) => ['service' => $labels[$t] ?? $t, 'count' => $g->count(), 'total' => (int) $g->sum('amount')])->values(),
            'byMethod' => $paid->groupBy('method_label')->map(fn ($g, $m) => ['method' => $m, 'count' => $g->count(), 'total' => (int) $g->sum('amount')])->values(),
            'daily' => $paid->groupBy(fn ($p) => $p->paid_at->format('Y-m-d'))->map(fn ($g, $d) => ['tanggal' => $d, 'total' => (int) $g->sum('amount')])->values(),
            'rows' => $paid->map(fn ($p) => [
                'tanggal' => $p->paid_at->format('d/m/Y H:i'), 'kode' => $p->code, 'pesanan' => $p->payable?->code,
                'layanan' => $labels[$p->payable_type] ?? '-', 'pelanggan' => $p->user->name, 'metode' => $p->method_label, 'nominal' => $p->amount,
            ])->values(),
        ];
    }

    public function index(Request $request)
    {
        return Inertia::render('Admin/Reports', $this->build($request));
    }

    public function export(Request $request)
    {
        $data = $this->build($request);
        $name = 'laporan-keuangan-'.$data['period']['dari'].'_'.$data['period']['sampai'];
        Audit::log('laporan.ekspor', 'Ekspor laporan keuangan '.$data['period']['dari'].' s/d '.$data['period']['sampai'].' ('.$request->query('format', 'xlsx').')');

        if ($request->query('format') === 'pdf') {
            return Pdf::loadView('pdf.report', $data + ['company' => Setting::allCached()])->setPaper('a4')->download($name.'.pdf');
        }

        $rows = collect($data['rows'])->map(fn ($r) => array_values($r))->all();
        $rows[] = ['', '', '', '', '', 'TOTAL', $data['summary']['revenue']];

        return Excel::download(new ArrayExport(['Tanggal Bayar', 'Kode Transaksi', 'Kode Pesanan', 'Layanan', 'Pelanggan', 'Metode', 'Nominal'], $rows), $name.'.xlsx');
    }
}
