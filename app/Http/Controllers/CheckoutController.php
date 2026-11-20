<?php

namespace App\Http\Controllers;

use App\Models\Flight;
use App\Models\FlightOrder;
use App\Models\Jamaah;
use App\Models\Package;
use App\Models\PackageDeparture;
use App\Models\VisaApplication;
use App\Models\VisaService;
use App\Notifications\SystemNotification;
use App\Services\BookingService;
use App\Services\InvoiceService;
use App\Support\AdminNotifier;
use App\Support\Audit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class CheckoutController extends Controller
{
    private function savedJamaah(Request $request)
    {
        return $request->user()->jamaah()->orderBy('full_name')->get()->map(fn ($j) => [
            'id' => $j->id, 'full_name' => $j->full_name, 'gender' => $j->gender, 'relation' => $j->relation,
            'birth_date' => $j->birth_date?->format('Y-m-d'), 'passport_expiry' => $j->passport_expiry?->format('Y-m-d'),
            'masked_passport' => $j->masked_passport, 'has_passport' => (bool) $j->passport_number, 'has_nik' => (bool) $j->nik,
            'mahram_name' => $j->mahram?->full_name, 'mahram_relation' => $j->mahram_relation,
        ]);
    }

    /** Validasi data penumpang & isi dari jamaah tersimpan bila dipilih */
    private function passengers(Request $request, array $rows, bool $passportRequired, ?string $travelDate = null): array
    {
        $out = [];
        foreach ($rows as $i => $p) {
            $j = null;
            if (! empty($p['jamaah_id'])) {
                $j = Jamaah::where('user_id', $request->user()->id)->findOrFail($p['jamaah_id']);
            }
            $passport = $p['passport_number'] ?? $j?->passport_number;
            $expiry = $p['passport_expiry'] ?? $j?->passport_expiry?->format('Y-m-d');

            if ($passportRequired && (! $passport || ! $expiry)) {
                throw ValidationException::withMessages(["passengers.$i.passport_number" => 'Nomor & masa berlaku paspor wajib diisi sesuai paspor.']);
            }
            if ($expiry && $travelDate && \Carbon\Carbon::parse($expiry)->lt(\Carbon\Carbon::parse($travelDate)->addMonths(6))) {
                throw ValidationException::withMessages(["passengers.$i.passport_expiry" => 'Paspor harus berlaku minimal 6 bulan dari tanggal keberangkatan.']);
            }

            $row = [
                'jamaah_id' => $j?->id,
                'title' => $p['title'] ?? null,
                'full_name' => $p['full_name'] ?? $j?->full_name,
                'gender' => $p['gender'] ?? $j?->gender,
                'birth_date' => $p['birth_date'] ?? $j?->birth_date?->format('Y-m-d'),
                'nik' => $p['nik'] ?? $j?->nik,
                'passport_number' => $passport ? strtoupper($passport) : null,
                'passport_expiry' => $expiry,
                'nationality' => $p['nationality'] ?? 'Indonesia',
                'mahram_name' => $p['mahram_name'] ?? $j?->mahram?->full_name,
                'mahram_relation' => $p['mahram_relation'] ?? $j?->mahram_relation,
            ];

            // simpan sebagai jamaah baru jika diminta
            if (! $j && ! empty($p['save'])) {
                $new = $request->user()->jamaah()->create([
                    'full_name' => $row['full_name'], 'gender' => $row['gender'], 'birth_date' => $row['birth_date'],
                    'nik' => $row['nik'], 'passport_number' => $row['passport_number'], 'passport_expiry' => $row['passport_expiry'],
                    'relation' => $p['relation'] ?? 'lainnya', 'mahram_relation' => $row['mahram_relation'],
                ]);
                $row['jamaah_id'] = $new->id;
            }
            $out[] = $row;
        }

        return $out;
    }

    private function passengerRules(bool $passport): array
    {
        return [
            'passengers' => 'required|array|min:1|max:10',
            'passengers.*.jamaah_id' => 'nullable|integer',
            'passengers.*.title' => 'nullable|in:Tn,Ny,Nn,An',
            'passengers.*.full_name' => 'required_without:passengers.*.jamaah_id|nullable|string|max:120',
            'passengers.*.gender' => 'required_without:passengers.*.jamaah_id|nullable|in:L,P',
            'passengers.*.birth_date' => 'required_without:passengers.*.jamaah_id|nullable|date|before:today',
            'passengers.*.nik' => 'nullable|digits:16',
            'passengers.*.passport_number' => 'nullable|string|max:20|regex:/^[A-Za-z0-9]+$/',
            'passengers.*.passport_expiry' => 'nullable|date|after:today',
            'passengers.*.mahram_name' => 'nullable|string|max:120',
            'passengers.*.mahram_relation' => 'nullable|string|max:30',
            'passengers.*.save' => 'nullable|boolean',
        ];
    }

    // ---------------- Paket Umrah ----------------
    public function package(Request $request, Package $package)
    {
        abort_unless($package->is_active, 404);

        return Inertia::render('Checkout/Package', [
            'package' => $package->load('upcomingDepartures'),
            'selectedDeparture' => $request->integer('departure') ?: null,
            'roomTypes' => Package::ROOM_TYPES,
            'jamaah' => $this->savedJamaah($request),
            'config' => [
                'deposit_per_pax' => config('payment.deposit_per_pax'),
                'min_installment' => config('payment.min_installment_amount'),
                'settlement_days' => config('payment.settlement_days_before_departure'),
                'hold_hours' => config('payment.seat_hold_hours'),
            ],
        ]);
    }

    public function storePackage(Request $request, BookingService $bookings)
    {
        $data = $request->validate([
            'departure_id' => 'required|integer|exists:package_departures,id',
            'room_type' => ['required', Rule::in(array_keys(Package::ROOM_TYPES))],
            'scheme' => 'required|in:lunas,cicilan',
            'notes' => 'nullable|string|max:1000',
            'agree' => 'accepted',
        ] + $this->passengerRules(false), ['agree.accepted' => 'Anda harus menyetujui syarat & ketentuan serta kebijakan refund.']);

        $departure = PackageDeparture::findOrFail($data['departure_id']);
        $passengers = DB::transaction(fn () => $this->passengers($request, $data['passengers'], false, $departure->departure_date->format('Y-m-d')));
        $booking = $bookings->create($request->user(), $departure, $data['room_type'], $passengers, $data['scheme'], $data['notes'] ?? null);

        return redirect()->route('customer.bookings.show', $booking)->with('success', 'Pesanan berhasil dibuat. Silakan lakukan pembayaran untuk mengamankan kursi Anda.');
    }

    // ---------------- Tiket Pesawat ----------------
    public function flight(Request $request, Flight $flight)
    {
        abort_unless($flight->is_active && $flight->depart_at->isFuture(), 404);

        return Inertia::render('Checkout/Flight', [
            'flight' => $flight,
            'pax' => max(1, min(9, $request->integer('penumpang', 1))),
            'jamaah' => $this->savedJamaah($request),
            'holdHours' => config('payment.flight_hold_hours'),
        ]);
    }

    public function storeFlight(Request $request, InvoiceService $invoices)
    {
        $data = $request->validate([
            'flight_id' => 'required|integer|exists:flights,id',
            'contact_email' => 'required|email',
            'contact_phone' => 'required|string|max:20',
            'agree' => 'accepted',
        ] + $this->passengerRules(true));

        $flight = Flight::findOrFail($data['flight_id']);
        $passengers = $this->passengers($request, $data['passengers'], true, $flight->depart_at->format('Y-m-d'));
        $pax = count($passengers);

        $order = DB::transaction(function () use ($request, $data, $passengers, $pax, $invoices) {
            $f = Flight::lockForUpdate()->findOrFail($data['flight_id']);
            if (! $f->is_active || $f->seats_available < $pax) {
                throw ValidationException::withMessages(['flight_id' => 'Kursi tidak mencukupi. Silakan pilih penerbangan lain.']);
            }
            $f->decrement('seats_available', $pax); // ditahan selama batas bayar

            $order = FlightOrder::create([
                'code' => FlightOrder::generateCode('T'),
                'user_id' => $request->user()->id,
                'flight_id' => $f->id,
                'pax_count' => $pax,
                'unit_price' => $f->price,
                'total_amount' => $f->price * $pax,
                'status' => 'menunggu_pembayaran',
                'contact_email' => $data['contact_email'],
                'contact_phone' => $data['contact_phone'],
                'expires_at' => now()->addHours((int) config('payment.flight_hold_hours', 3)),
            ]);
            foreach ($passengers as $p) $order->passengers()->create($p);
            $invoices->issueInvoice($order->load('flight'));
            Audit::log('pesanan.tiket_dibuat', "Membuat order tiket {$order->code} ({$pax} penumpang)", $order);

            return $order;
        });

        $request->user()->notify(new SystemNotification('pesanan', 'Pesanan Tiket Dibuat — '.$order->code,
            'Kursi Anda ditahan sampai '.$order->expires_at->translatedFormat('d M Y H:i').' WIB. Segera selesaikan pembayaran.',
            $order->customerUrl(), 'Bayar Sekarang'));
        AdminNotifier::notify(['operasional'], 'pesanan', 'Order tiket baru '.$order->code, $request->user()->name.' — '.$pax.' penumpang', route('admin.flight-orders.show', $order));

        return redirect()->route('customer.flight-orders.show', $order)->with('success', 'Pesanan tiket dibuat. Silakan lakukan pembayaran.');
    }

    // ---------------- Visa ----------------
    public function visa(Request $request)
    {
        return Inertia::render('Checkout/Visa', [
            'services' => VisaService::where('is_active', true)->get(),
            'selected' => $request->integer('layanan') ?: null,
            'jamaah' => $this->savedJamaah($request),
        ]);
    }

    public function storeVisa(Request $request)
    {
        $data = $request->validate([
            'visa_service_id' => 'required|exists:visa_services,id',
            'pax_count' => 'required|integer|min:1|max:200',
            'planned_departure' => 'nullable|date|after:today',
            'notes' => 'nullable|string|max:2000',
            'applicants' => 'nullable|array|max:200',
            'applicants.*.full_name' => 'required|string|max:120',
            'applicants.*.passport_number' => 'nullable|string|max:20|regex:/^[A-Za-z0-9]+$/',
            'agree' => 'accepted',
        ]);
        $service = VisaService::findOrFail($data['visa_service_id']);

        $app = DB::transaction(function () use ($request, $data, $service) {
            $app = VisaApplication::create([
                'code' => VisaApplication::generateCode('V'),
                'user_id' => $request->user()->id,
                'visa_service_id' => $service->id,
                'pax_count' => $data['pax_count'],
                'planned_departure' => $data['planned_departure'] ?? null,
                'notes' => $data['notes'] ?? null,
                'unit_price' => $service->price,
                'status' => 'menunggu_invoice',
            ]);
            $app->recalculateTotal();
            $app->save();
            foreach ($data['applicants'] ?? [] as $a) {
                $app->passengers()->create(['full_name' => $a['full_name'], 'passport_number' => isset($a['passport_number']) ? strtoupper($a['passport_number']) : null]);
            }
            $app->statusLogs()->create(['to_status' => 'menunggu_invoice', 'note' => 'Pengajuan diterima, menunggu invoice dari admin.', 'changed_by' => $request->user()->id]);
            Audit::log('visa.diajukan', "Pengajuan visa {$app->code} ({$app->pax_count} orang)", $app);

            return $app;
        });

        $request->user()->notify(new SystemNotification('visa', 'Pengajuan Visa Diterima — '.$app->code,
            'Pengajuan visa untuk '.$app->pax_count.' orang telah kami terima. Admin akan menerbitkan invoice, kemudian Anda dapat melakukan pembayaran.',
            $app->customerUrl(), 'Lihat Pengajuan'));
        AdminNotifier::notify(['operasional'], 'visa', 'Pengajuan visa baru '.$app->code, $request->user()->name.' — '.$app->pax_count.' orang. Terbitkan invoice.', route('admin.visa.show', $app), true);

        return redirect()->route('customer.visa.show', $app)->with('success', 'Pengajuan visa terkirim. Mohon tunggu invoice dari admin.');
    }
}
