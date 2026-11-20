<?php

namespace App\Http\Controllers\Admin;

use App\Exports\ArrayExport;
use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\PackageDeparture;
use App\Models\Setting;
use App\Support\Audit;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Maatwebsite\Excel\Facades\Excel;

/**
 * Monitor keberangkatan: dibedakan warna berdasarkan kedekatan (H-1 merah, H-7 oranye, H-30 kuning)
 * + manifest jamaah (Excel/PDF).
 */
class DepartureController extends Controller
{
    public function index(Request $request)
    {
        $range = $request->string('rentang', 'mendatang')->toString();
        $q = PackageDeparture::with('package:id,name,airline')->withCount(['bookings as active_bookings' => fn ($b) => $b->whereIn('status', ['cicilan_berjalan', 'lunas'])]);
        $range === 'lalu' ? $q->where('departure_date', '<', today())->orderByDesc('departure_date') : $q->where('departure_date', '>=', today())->orderBy('departure_date');

        return Inertia::render('Admin/Departures', [
            'departures' => $q->paginate(20)->withQueryString()->through(function ($d) {
                $days = (int) today()->diffInDays($d->departure_date, false);
                $unpaid = Booking::where('package_departure_id', $d->id)->where('status', 'cicilan_berjalan')->count();

                return [
                    'id' => $d->id, 'package' => $d->package->name, 'airline' => $d->package->airline,
                    'departure_date' => $d->departure_date->format('Y-m-d'), 'return_date' => $d->return_date->format('Y-m-d'),
                    'days_left' => $days,
                    'urgency' => match (true) { $days < 0 => 'past', $days <= 1 => 'h1', $days <= 7 => 'h7', $days <= 30 => 'h30', default => 'normal' },
                    'quota' => $d->quota, 'booked' => $d->booked, 'held' => $d->held, 'remaining' => $d->remaining,
                    'status' => $d->status, 'active_bookings' => $d->active_bookings, 'unpaid' => $unpaid,
                ];
            }),
            'range' => $range,
        ]);
    }

    public function manifest(Request $request, PackageDeparture $departure)
    {
        $departure->load('package');
        $bookings = Booking::with(['passengers', 'user:id,name,phone,email'])
            ->where('package_departure_id', $departure->id)->whereIn('status', ['cicilan_berjalan', 'lunas', 'selesai'])->get();

        $rows = [];
        $n = 1;
        foreach ($bookings as $b) {
            foreach ($b->passengers as $p) {
                $rows[] = [
                    $n++, $p->full_name, $p->gender, $p->birth_date?->format('d/m/Y'), $p->passport_number, $p->passport_expiry?->format('d/m/Y'),
                    $p->mahram_name ? $p->mahram_name.' ('.$p->mahram_relation.')' : '-', strtoupper($b->room_type), $b->code,
                    $b->user->name, $b->user->phone, $b->status === 'lunas' ? 'LUNAS' : 'Sisa Rp'.number_format($b->outstandingAmount(), 0, ',', '.'),
                ];
            }
        }
        $headings = ['No', 'Nama Jamaah', 'L/P', 'Tgl Lahir', 'No. Paspor', 'Exp. Paspor', 'Mahram', 'Kamar', 'Kode Booking', 'Pemesan', 'HP Pemesan', 'Pembayaran'];
        $name = 'manifest-'.$departure->departure_date->format('d-m-y').'-'.\Str::slug($departure->package->name);
        Audit::log('manifest.ekspor', "Ekspor manifest {$departure->package->name} {$departure->departure_date->format('d/m/Y')}", $departure);

        if ($request->query('format') === 'pdf') {
            return Pdf::loadView('pdf.manifest', [
                'departure' => $departure, 'headings' => $headings, 'rows' => $rows, 'company' => Setting::allCached(),
            ])->setPaper('a4', 'landscape')->download($name.'.pdf');
        }

        return Excel::download(new ArrayExport($headings, $rows), $name.'.xlsx');
    }
}
