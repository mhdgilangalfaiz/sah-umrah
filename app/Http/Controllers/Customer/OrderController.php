<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\FlightOrder;
use App\Models\Payment;
use App\Models\VisaApplication;
use App\Services\BookingService;
use App\Services\FileStorage;
use App\Support\AdminNotifier;
use App\Support\Audit;
use Illuminate\Http\Request;
use Inertia\Inertia;

class OrderController extends Controller
{
    /** Data form pembayaran untuk komponen <PayBox> */
    public static function payBox($payable, string $type): array
    {
        $pending = $payable->pendingPayment();

        return [
            'type' => $type,
            'code' => $payable->code,
            'can_pay' => $payable->canBePaid(),
            'outstanding' => $payable->outstandingAmount(),
            'minimum' => $payable->canBePaid() ? $payable->minimumPayment() : 0,
            'custom_amount' => $payable->allowsCustomAmount(),
            'methods' => collect(config('payment.methods'))->map(fn ($m) => ['value' => $m, 'label' => Payment::METHODS[$m]])->values(),
            'missing_proofs' => $payable->payments()->where('status', 'dibayar')->whereNull('proof_path')->get()
                ->map(fn ($p) => ['code' => $p->code, 'amount' => $p->amount, 'paid_at' => $p->paid_at?->format('d/m/Y H:i')])->values(),
            'pending' => $pending ? ['code' => $pending->code, 'amount' => $pending->amount, 'method_label' => $pending->method_label, 'expires_at' => $pending->expires_at->toIso8601String()] : null,
        ];
    }

    private static function documentsOf($model)
    {
        return $model->documents()->latest()->get()->map(fn ($d) => [
            'id' => $d->id, 'type' => $d->type, 'type_label' => $d->type_label, 'file_name' => $d->file_name, 'status' => $d->status,
            'rejection_note' => $d->rejection_note, 'review' => $d->review, 'size' => $d->size,
            'created_at' => $d->created_at->format('d/m/Y H:i'), 'url' => $d->signedUrl(),
        ]);
    }

    public function bookings(Request $request)
    {
        return Inertia::render('Customer/Bookings', [
            'bookings' => Booking::with('departure.package:id,name,slug,cover_image')->where('user_id', $request->user()->id)->latest()->paginate(10),
        ]);
    }

    public function booking(Booking $booking)
    {
        $this->ensureOwner($booking);
        $booking->load('departure.package', 'installments', 'passengers', 'invoices', 'refunds');

        return Inertia::render('Customer/BookingShow', [
            'booking' => $booking,
            'outstanding' => $booking->outstandingAmount(),
            'overdue' => $booking->isOverdue(),
            'deposit' => $booking->requiredDeposit(),
            'payments' => $booking->payments()->get(),
            'payBox' => self::payBox($booking, 'booking'),
            'canCancel' => $booking->status === 'menunggu_pembayaran' && (int) $booking->paid_amount === 0,
            // pesanan yang sudah dibayar: pelanggan mengajukan pembatalan / pengurangan jamaah, diputuskan admin
            'canRequest' => (int) $booking->paid_amount > 0 && ! in_array($booking->status, ['dibatalkan', 'refund', 'selesai', 'kedaluwarsa'], true)
                && $booking->refunds->whereIn('status', ['diajukan'])->isEmpty(),
            'requests' => $booking->refunds->sortByDesc('id')->values()->map(fn ($r) => [
                'code' => $r->code, 'type_label' => \App\Models\Refund::TYPES[$r->type] ?? $r->type, 'status' => $r->status,
                'requested_amount' => $r->requested_amount, 'approved_amount' => $r->approved_amount, 'admin_note' => $r->admin_note,
                'created_at' => $r->created_at->format('d/m/Y H:i'),
            ]),
            'changes' => $booking->changes()->get(['id', 'type', 'description', 'old_total', 'new_total', 'refund_amount', 'created_at'])
                ->map(fn ($c) => $c->only('id', 'description', 'old_total', 'new_total', 'refund_amount') + ['type_label' => \App\Models\BookingChange::TYPES[$c->type] ?? $c->type, 'at' => $c->created_at->format('d/m/Y H:i')]),
            'categories' => \App\Models\BookingPassenger::CATEGORIES,
            // pembayaran tunai di kantor (kwitansi diunggah, menunggu verifikasi / ditolak)
            'canPayCash' => $booking->canBePaid(),
            'cashPayments' => $booking->payments()->where('method', 'tunai')->whereIn('status', ['menunggu_verifikasi', 'ditolak'])->get()
                ->map(fn ($p) => ['code' => $p->code, 'amount' => (int) $p->amount, 'status' => $p->status, 'review_note' => $p->review_note,
                    'paid_at' => $p->paid_at?->format('d/m/Y'), 'proof_url' => $p->proof_url]),
            'settlementDays' => (int) config('payment.settlement_days_before_departure', 40),
        ]);
    }

    /** Pembayaran tunai di kantor: unggah kwitansi resmi kantor → menunggu verifikasi admin */
    public function payCash(Request $request, Booking $booking, \App\Services\Payment\CashPaymentService $cash)
    {
        $this->ensureOwner($booking);
        abort_unless($booking->canBePaid(), 422, 'Pesanan ini tidak dapat dibayar.');
        $data = $request->validate([
            'amount' => 'required|integer|min:10000',
            'paid_date' => 'required|date|before_or_equal:today|after_or_equal:'.$booking->created_at->toDateString(),
            'receipt' => 'required|file|max:5120|mimes:jpg,jpeg,png,webp,pdf',
            'note' => 'nullable|string|max:500',
        ], [], ['amount' => 'nominal', 'paid_date' => 'tanggal bayar', 'receipt' => 'kwitansi', 'note' => 'catatan']);

        $cash->submit($booking, $request->user(), (int) $data['amount'], \Carbon\Carbon::parse($data['paid_date'])->setTimeFrom(now()), $request->file('receipt'), $data['note'] ?? null);

        return back()->with('success', 'Kwitansi terkirim. Pembayaran akan tercatat di invoice setelah diverifikasi admin.');
    }

    public function cancelBooking(Request $request, Booking $booking, BookingService $service)
    {
        $this->ensureOwner($booking);
        abort_unless($booking->status === 'menunggu_pembayaran' && (int) $booking->paid_amount === 0, 422,
            'Pesanan yang sudah dibayar dibatalkan melalui pengajuan refund.');
        $service->cancel($booking, 'Dibatalkan oleh pelanggan', $request->user());

        return redirect()->route('customer.bookings.index')->with('success', 'Pesanan dibatalkan dan kursi telah dilepas.');
    }

    public function flightOrders(Request $request)
    {
        return Inertia::render('Customer/FlightOrders', [
            'orders' => FlightOrder::with('flight')->where('user_id', $request->user()->id)->latest()->paginate(10),
        ]);
    }

    public function flightOrder(FlightOrder $flightOrder)
    {
        $this->ensureOwner($flightOrder);
        $flightOrder->load('flight', 'passengers', 'invoices');

        $active = $flightOrder->activeInvoice();

        return Inertia::render('Customer/FlightOrderShow', [
            'order' => $flightOrder,
            // Detail penerbangan & catatan revisi terbaru (bila admin merevisi invoice)
            'flightDetails' => $active?->details['flight'] ?? null,
            'revisionNote' => $active && $active->revision > 0 ? ['number' => $active->number, 'notes' => $active->notes, 'at' => $active->issued_at->format('d/m/Y H:i')] : null,
            'payments' => $flightOrder->payments()->get(),
            'documents' => self::documentsOf($flightOrder),
            'payBox' => self::payBox($flightOrder, 'flight'),
            'billTo' => $flightOrder->billTo(),
            'deposit' => (int) $flightOrder->paid_amount === 0 ? $flightOrder->minimumPayment() : 0,
            'manifest' => [
                'can_upload' => $flightOrder->canUploadManifest(),
                'uploaded_at' => $flightOrder->manifest_uploaded_at?->format('d/m/Y H:i'),
                'accepted_at' => $flightOrder->manifest_accepted_at?->format('d/m/Y H:i'),
                'revision_note' => $flightOrder->manifest_revision_note,
                'warnings' => $flightOrder->manifest_warnings ?? [],
                'count' => $flightOrder->passengers->count(),
            ],
        ]);
    }

    /** Template Excel manifest (berisi baris sebanyak seat yang dibeli) */
    public function manifestTemplate(FlightOrder $flightOrder, \App\Services\Flights\FlightManifest $manifest)
    {
        $this->ensureOwner($flightOrder);

        return response()->download($manifest->template($flightOrder), 'Manifest-'.$flightOrder->code.'.xlsx')->deleteFileAfterSend();
    }

    /** Unggah manifest penumpang (Excel) — hanya setelah tagihan lunas & sebelum e-ticket terbit */
    public function uploadManifest(Request $request, FlightOrder $flightOrder, \App\Services\Flights\FlightManifest $manifest)
    {
        $this->ensureOwner($flightOrder);
        if (! $flightOrder->canUploadManifest()) {
            return back()->with('error', match (true) {
                $flightOrder->status === 'tiket_terbit' => 'E-ticket sudah terbit. Hubungi admin bila ada perubahan data penumpang.',
                (bool) $flightOrder->manifest_accepted_at => 'Manifest sudah diterima admin. Hubungi admin bila ada perubahan data penumpang.',
                default => 'Manifest dapat diunggah setelah tagihan lunas.',
            });
        }
        $request->validate(['file' => 'required|file|max:10240|mimes:xlsx,xls,csv'], [], ['file' => 'file manifest']);

        $result = $manifest->store($flightOrder, $request->file('file'), $request->user());

        return back()->with('success', "Manifest diterima: {$result['count']} penumpang."
            .($result['warnings'] ? ' Mohon cek catatan di bawah.' : ' Tim kami akan memproses penerbitan tiket.'));
    }

    public function visas(Request $request)
    {
        return Inertia::render('Customer/Visas', [
            'applications' => VisaApplication::with('service:id,name')->where('user_id', $request->user()->id)->latest()->paginate(10),
            'statuses' => VisaApplication::STATUSES,
        ]);
    }

    public function visa(VisaApplication $visaApplication)
    {
        $this->ensureOwner($visaApplication);
        $v = $visaApplication->load('service', 'passengers', 'invoices', 'statusLogs.changer:id,name,role');

        return Inertia::render('Customer/VisaShow', [
            'application' => $v,
            'statuses' => VisaApplication::STATUSES,
            'payments' => $v->payments()->get(),
            'documents' => self::documentsOf($v),
            'payBox' => self::payBox($v, 'visa'),
            'canUpload' => in_array($v->status, ['menunggu_dokumen'], true),
        ]);
    }

    /** Unggah berkas visa (ZIP/RAR) setelah invoice lunas */
    public function uploadVisaFiles(Request $request, VisaApplication $visaApplication)
    {
        $this->ensureOwner($visaApplication);
        abort_unless($visaApplication->status === 'menunggu_dokumen', 422, 'Berkas hanya dapat diunggah setelah invoice lunas.');

        $request->validate([
            'file' => ['required', 'file', 'max:51200', 'mimes:zip,rar', 'mimetypes:application/zip,application/x-zip-compressed,application/x-rar-compressed,application/vnd.rar,application/x-rar,application/octet-stream'],
        ], ['file.mimes' => 'Berkas harus berformat .zip atau .rar', 'file.max' => 'Ukuran berkas maksimal 50 MB.']);

        $doc = FileStorage::storeDocument($request->file('file'), $request->user(), 'berkas_visa', [
            'documentable_type' => $visaApplication->getMorphClass(), 'documentable_id' => $visaApplication->id,
        ]);
        $visaApplication->statusLogs()->create([
            'from_status' => 'menunggu_dokumen', 'to_status' => 'menunggu_dokumen',
            'note' => 'Berkas '.$doc->file_name.' diunggah, menunggu verifikasi admin.', 'changed_by' => $request->user()->id,
        ]);
        Audit::log('visa.berkas_unggah', "Unggah berkas visa {$doc->file_name} untuk {$visaApplication->code}", $visaApplication);
        AdminNotifier::notify('dokumen', 'Berkas visa masuk — '.$visaApplication->code, 'Mohon verifikasi berkas '.$doc->file_name, route('admin.visa.show', $visaApplication));

        return back()->with('success', 'Berkas berhasil diunggah. Admin akan segera memverifikasi.');
    }
}
