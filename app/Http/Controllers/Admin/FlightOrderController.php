<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\FlightOrder;
use App\Notifications\SystemNotification;
use App\Services\FileStorage;
use App\Support\Audit;
use Illuminate\Http\Request;
use Inertia\Inertia;

class FlightOrderController extends Controller
{
    public function index(Request $request)
    {
        return Inertia::render('Admin/FlightOrders/Index', [
            'orders' => FlightOrder::with('user:id,name,customer_code', 'flight')
                ->when($request->status, fn ($q, $s) => $q->where('status', $s))
                ->when($request->q, fn ($q, $s) => $q->where('code', 'like', "%$s%"))
                ->latest()->paginate(20)->withQueryString(),
            'filters' => $request->only('status', 'q'),
        ]);
    }

    public function show(FlightOrder $flightOrder)
    {
        $flightOrder->load('user', 'flight', 'passengers', 'invoices');

        return Inertia::render('Admin/FlightOrders/Show', [
            'order' => $flightOrder,
            'passengers' => $flightOrder->passengers->map(fn ($p) => [
                ...$p->only('id', 'title', 'full_name', 'gender', 'nationality'),
                'birth_date' => $p->birth_date?->format('d/m/Y'), 'passport_number' => $p->passport_number,
                'passport_expiry' => $p->passport_expiry?->format('d/m/Y'),
            ]),
            'payments' => $flightOrder->payments()->get(),
            'documents' => $flightOrder->documents()->get()->map(fn ($d) => ['id' => $d->id, 'type_label' => $d->type_label, 'file_name' => $d->file_name, 'url' => $d->signedUrl()]),
        ]);
    }

    /** Terbitkan e-ticket: unggah file + PNR → dikirim ke email & tersedia di dashboard */
    public function issue(Request $request, FlightOrder $flightOrder)
    {
        abort_unless(in_array($flightOrder->status, ['dibayar', 'tiket_terbit'], true), 422, 'E-ticket hanya dapat diterbitkan setelah pembayaran lunas.');
        $data = $request->validate(['pnr' => 'required|string|max:20', 'file' => 'required|file|max:10240|mimes:pdf,jpg,jpeg,png']);

        $doc = FileStorage::storeDocument($request->file('file'), $flightOrder->user, 'eticket', [
            'documentable_type' => $flightOrder->getMorphClass(), 'documentable_id' => $flightOrder->id,
        ], $request->user());
        $flightOrder->update(['pnr' => strtoupper($data['pnr']), 'status' => 'tiket_terbit', 'issued_at' => now()]);
        Audit::log('tiket.terbit', "Menerbitkan e-ticket {$flightOrder->code} PNR {$flightOrder->pnr}", $flightOrder);

        $flightOrder->user->notify(new SystemNotification('tiket', 'E-Ticket Terbit — '.$flightOrder->code,
            'E-ticket Anda telah terbit dengan kode booking (PNR) '.$flightOrder->pnr.'. Silakan unduh melalui dashboard.',
            $flightOrder->customerUrl(), 'Unduh E-Ticket', true, false, 'success'));

        return back()->with('success', 'E-ticket diterbitkan dan dikirim ke pelanggan.');
    }
}
