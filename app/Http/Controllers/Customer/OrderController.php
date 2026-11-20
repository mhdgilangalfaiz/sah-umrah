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
            'pending' => $pending ? ['code' => $pending->code, 'amount' => $pending->amount, 'method_label' => $pending->method_label, 'expires_at' => $pending->expires_at->toIso8601String()] : null,
        ];
    }

    private static function documentsOf($model)
    {
        return $model->documents()->latest()->get()->map(fn ($d) => [
            'id' => $d->id, 'type' => $d->type, 'type_label' => $d->type_label, 'file_name' => $d->file_name, 'status' => $d->status,
            'rejection_note' => $d->rejection_note, 'created_at' => $d->created_at->format('d/m/Y H:i'), 'url' => $d->signedUrl(),
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
        ]);
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

        return Inertia::render('Customer/FlightOrderShow', [
            'order' => $flightOrder,
            'payments' => $flightOrder->payments()->get(),
            'documents' => self::documentsOf($flightOrder),
            'payBox' => self::payBox($flightOrder, 'flight'),
        ]);
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
        AdminNotifier::notify(['operasional'], 'dokumen', 'Berkas visa masuk — '.$visaApplication->code, 'Mohon verifikasi berkas '.$doc->file_name, route('admin.visa.show', $visaApplication));

        return back()->with('success', 'Berkas berhasil diunggah. Admin akan segera memverifikasi.');
    }
}
