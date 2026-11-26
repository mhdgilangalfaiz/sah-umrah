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
    /**
     * Daftar pesanan tiket berurutan No. Invoice (invoice berlaku, terbaru di atas).
     * Kolom: No. Invoice · Pemesan · Jadwal (22JUL/30JUL) · Jumlah beli · Total tagihan · Status.
     */
    public function index(Request $request)
    {
        $invoiceNo = \App\Models\Invoice::activeNumberQuery(FlightOrder::class, 'flight_orders');
        $day = fn ($d) => $d ? strtoupper($d->locale('en')->format('dM')) : null;

        return Inertia::render('Admin/FlightOrders/Index', [
            'orders' => FlightOrder::with('user:id,name,customer_code', 'flight')
                ->addSelect(['flight_orders.*', 'invoice_number' => $invoiceNo])
                ->when($request->status, fn ($q, $s) => $q->where('status', $s))
                ->when($request->q, fn ($q, $s) => $q->where(fn ($w) => $w->where('code', 'like', "%$s%")->orWhere('bill_company', 'like', "%$s%")->orWhere('bill_name', 'like', "%$s%")
                    ->orWhereHas('invoices', fn ($i) => $i->where('number', 'like', "%$s%"))))
                ->orderByDesc('invoice_number')->latest('id')
                ->paginate(20)->withQueryString()
                ->through(fn (FlightOrder $o) => [
                    'id' => $o->id, 'code' => $o->code, 'invoice_number' => $o->invoice_number,
                    'buyer' => $o->bill_company ?: ($o->bill_name ?: $o->user->name),
                    'buyer_sub' => $o->bill_company ? $o->bill_name : $o->user->customer_code,
                    'airline' => $o->flight?->airline,
                    'schedule' => implode('/', array_filter([$day($o->flight?->depart_at), $day($o->flight?->return_depart_at)])),
                    'pax_count' => $o->pax_count, 'total_amount' => (int) $o->total_amount, 'outstanding' => $o->outstandingAmount(),
                    'status' => $o->status,
                ]),
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
            // Keterangan baris tiket (format lama "Tiket …" diganti format jadwal per segmen) & S&K yang berlaku
            'ticketDescription' => ($d = $active?->items[0]['description'] ?? '') && ! str_starts_with($d, 'Tiket ') ? $d : $flightOrder->ticketDescription(),
            'terms' => $flightOrder->invoiceTerms(),
            'defaultTerms' => \App\Support\InvoiceTerms::FLIGHT_DEFAULT,
            'seatsAvailable' => (int) $flightOrder->flight->seats_available,
            'invoices' => $flightOrder->invoices->where('type', 'invoice')->values()->map(fn ($i) => [
                'id' => $i->id, 'number' => $i->number, 'status' => $i->display_status, 'amount' => $i->amount,
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
            'documents' => $flightOrder->documents()->latest()->get()->map(fn ($d) => ['id' => $d->id, 'type' => $d->type, 'type_label' => $d->type_label, 'file_name' => $d->file_name, 'original_name' => $d->original_name, 'created_at' => $d->created_at->format('d/m/Y H:i'), 'url' => $d->signedUrl()]),
            'billTo' => $flightOrder->billTo(),
            'manifest' => [
                'uploaded_at' => $flightOrder->manifest_uploaded_at?->format('d/m/Y H:i'),
                'warnings' => $flightOrder->manifest_warnings ?? [],
                'accepted_at' => $flightOrder->manifest_accepted_at?->format('d/m/Y H:i'),
                'accepted_by' => $flightOrder->manifest_accepted_by ? \App\Models\User::find($flightOrder->manifest_accepted_by)?->name : null,
                'revision_note' => $flightOrder->manifest_revision_note,
            ],
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
            'extras.*.description' => 'required|string|max:1000',
            'ticket_description' => 'nullable|string|max:2000',
            'terms' => 'nullable|string|max:15000',
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

    /** Admin menerima manifest dari pembeli → pembeli tidak bisa mengganti lagi; data diajukan ke maskapai di luar sistem */
    public function acceptManifest(Request $request, FlightOrder $flightOrder)
    {
        abort_unless($flightOrder->manifest_uploaded_at && ! $flightOrder->manifest_accepted_at, 422, 'Belum ada manifest baru untuk diterima.');
        $flightOrder->update(['manifest_accepted_at' => now(), 'manifest_accepted_by' => $request->user()->id, 'manifest_revision_note' => null]);
        Audit::log('tiket.manifest_diterima', "Manifest {$flightOrder->code} diterima admin", $flightOrder);

        $flightOrder->user->notify(new SystemNotification('pesanan', 'Manifest Diterima — '.$flightOrder->code,
            'Manifest penumpang Anda sudah kami terima dan sedang kami ajukan ke maskapai. Kami kabari kembali setelah e-ticket terbit.',
            $flightOrder->customerUrl(), 'Lihat Pesanan', true, false, 'success'));

        return back()->with('success', 'Manifest diterima. Pembeli sudah diberi tahu.');
    }

    /** Admin meminta pembeli memperbaiki & mengunggah ulang manifest */
    public function rejectManifest(Request $request, FlightOrder $flightOrder)
    {
        abort_unless($flightOrder->manifest_uploaded_at && $flightOrder->status === 'dibayar', 422, 'Manifest tidak dapat diminta perbaikan.');
        $data = $request->validate(['note' => 'required|string|min:5|max:1000'], [], ['note' => 'catatan perbaikan']);
        $flightOrder->update(['manifest_accepted_at' => null, 'manifest_accepted_by' => null, 'manifest_revision_note' => trim($data['note'])]);
        Audit::log('tiket.manifest_perbaikan', "Manifest {$flightOrder->code} diminta perbaikan: {$data['note']}", $flightOrder);

        $flightOrder->user->notify(new SystemNotification('pesanan', 'Perbaiki Manifest — '.$flightOrder->code,
            'Manifest penumpang perlu diperbaiki: '.trim($data['note']).' Silakan unggah ulang file manifest.',
            $flightOrder->customerUrl(), 'Unggah Ulang', true, false, 'warning'));

        return back()->with('success', 'Permintaan perbaikan dikirim ke pembeli.');
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
