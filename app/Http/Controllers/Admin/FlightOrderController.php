<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\FlightOrder;
use App\Notifications\SystemNotification;
use App\Services\FileStorage;
use App\Services\FlightOrderRevisionService;
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
        $flightOrder->load('user', 'flight', 'passengers', 'invoices.reviser:id,name');
        $active = $flightOrder->activeInvoice();

        return Inertia::render('Admin/FlightOrders/Show', [
            'order' => $flightOrder,
            'outstanding' => $flightOrder->outstandingAmount(),
            'flightDetails' => $flightOrder->flightDetails(),
            // Baris tambahan (biaya/potongan) invoice yang berlaku → dipakai sebagai isian awal form revisi
            'extras' => array_values(array_slice($active?->items ?? [], 1)),
            'seatsAvailable' => (int) $flightOrder->flight->seats_available,
            'invoices' => $flightOrder->invoices->where('type', 'invoice')->values()->map(fn ($i) => [
                'id' => $i->id, 'number' => $i->number, 'status' => $i->status, 'amount' => $i->amount,
                'revision' => $i->revision, 'notes' => $i->notes, 'by' => $i->reviser?->name,
                'issued_at' => $i->issued_at->format('d/m/Y H:i'),
                'seats_before' => $i->details['seats_before'] ?? null, 'seats_after' => $i->details['seats_after'] ?? null,
                'refund' => $i->details['refund'] ?? 0,
            ]),
            'closed' => in_array($flightOrder->status, FlightOrderRevisionService::CLOSED, true),
            'passengers' => $flightOrder->passengers->map(fn ($p) => [
                ...$p->only('id', 'title', 'full_name', 'gender', 'nationality'),
                'birth_date' => $p->birth_date?->format('d/m/Y'), 'passport_number' => $p->passport_number,
                'passport_expiry' => $p->passport_expiry?->format('d/m/Y'),
            ]),
            'payments' => $flightOrder->payments()->get(),
            'documents' => $flightOrder->documents()->get()->map(fn ($d) => ['id' => $d->id, 'type_label' => $d->type_label, 'file_name' => $d->file_name, 'url' => $d->signedUrl()]),
        ]);
    }

    /**
     * Revisi invoice: ubah seat terpakai, harga, baris biaya/potongan, dan detail penerbangan.
     * Invoice baru (-R{n}) terbit; kelebihan bayar otomatis tercatat di menu Refund.
     */
    public function revise(Request $request, FlightOrder $flightOrder, FlightOrderRevisionService $service)
    {
        $data = $request->validate([
            'seats' => 'required|integer|min:1|max:999',
            'unit_price' => 'required|integer|min:0|max:1000000000',
            'extras' => 'array|max:10',
            'extras.*.description' => 'required|string|max:150',
            'extras.*.qty' => 'required|integer|min:1|max:999',
            'extras.*.price' => 'required|integer|min:-1000000000|max:1000000000',
            'flight' => 'array',
            'flight.airline' => 'nullable|string|max:60',
            'flight.flight_number' => 'nullable|string|max:40',
            'flight.route' => 'nullable|string|max:120',
            'flight.depart' => 'nullable|string|max:60',
            'flight.return' => 'nullable|string|max:60',
            'flight.pnr' => 'nullable|string|max:20',
            'reason' => 'required|string|min:5|max:500',
            'adjust_stock' => 'boolean',
        ], [], [
            'seats' => 'seat terpakai', 'unit_price' => 'harga per seat', 'reason' => 'alasan revisi',
            'extras.*.description' => 'keterangan', 'extras.*.qty' => 'qty', 'extras.*.price' => 'harga',
        ]);

        $invoice = $service->revise($flightOrder, $data, $request->user());

        return back()->with('success', "Invoice {$invoice->number} terbit dan dikirim ke pelanggan.");
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
