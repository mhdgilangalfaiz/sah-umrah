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

            // Setiap orang yang dipesankan selalu tercatat di Data Jamaah pemilik akun (dipantau admin).
            // Orang yang sama (nama + tanggal lahir) dipakai ulang agar tidak dobel; paspor yang baru diisi ikut dilengkapi.
            if (! $j) {
                $j = $request->user()->jamaah()->whereRaw('LOWER(full_name) = ?', [mb_strtolower(trim($row['full_name']))])
                    ->whereDate('birth_date', $row['birth_date'])->first();
                if ($j) {
                    $j->fill(array_filter(['passport_number' => $row['passport_number'], 'passport_expiry' => $row['passport_expiry'], 'nik' => $row['nik']]))->save();
                } else {
                    $j = $request->user()->jamaah()->create([
                        'full_name' => trim($row['full_name']), 'gender' => $row['gender'], 'birth_date' => $row['birth_date'],
                        'nik' => $row['nik'], 'passport_number' => $row['passport_number'], 'passport_expiry' => $row['passport_expiry'],
                        'relation' => $p['relation'] ?? 'lainnya', 'mahram_relation' => $row['mahram_relation'],
                    ]);
                }
                $row['jamaah_id'] = $j->id;
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
            'passengers.*.title' => 'nullable|in:Bapak,Ibu,Abang,Kakak',
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
            // Dari halaman detail paket: kamar & jumlah jamaah sudah dipilih → langsung ke langkah Data Jamaah
            'selectedRoom' => array_key_exists($request->query('kamar'), Package::ROOM_TYPES) ? $request->query('kamar') : null,
            'selectedPax' => $request->filled('jamaah') ? max(1, min(10, $request->integer('jamaah'))) : null,
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
    /**
     * Pesan seat: pembeli (agen travel atau perorangan) menentukan jumlah seat sendiri dan data penerima invoice.
     * Data penumpang TIDAK diisi di sini — manifest (Excel) diunggah setelah tagihan lunas.
     */
    public function flight(Request $request, Flight $flight)
    {
        abort_unless($flight->is_active && $flight->depart_at->isFuture(), 404);
        $u = $request->user();
        $last = FlightOrder::where('user_id', $u->id)->whereNotNull('bill_name')->latest()->first();

        return Inertia::render('Checkout/Flight', [
            'flight' => $flight,
            'seats' => max(1, min(max(1, $flight->seats_available), $request->integer('penumpang', 1))),
            // isian awal: data penerima invoice pesanan sebelumnya (agen biasanya memesan berulang)
            'billing' => [
                'buyer_type' => $last?->buyer_type ?? 'perorangan',
                'bill_company' => $last?->bill_company ?? '',
                'bill_name' => $last?->bill_name ?? $u->name,
                'bill_address' => $last?->bill_address ?? ($u->address ?? ''),
                'contact_email' => $last?->contact_email ?? $u->email,
                'contact_phone' => $last?->contact_phone ?? ($u->phone ?? ''),
            ],
            'holdHours' => config('payment.flight_hold_hours'),
            'dpPercent' => (int) config('payment.flight_min_dp_percent', 30),
            'settlementDue' => $this->flightSettlementDue($flight)->translatedFormat('d M Y'),
        ]);
    }

    private function flightSettlementDue(Flight $flight): \Carbon\Carbon
    {
        $due = $flight->depart_at->copy()->subDays((int) config('payment.flight_settlement_days', 14))->endOfDay();

        return $due->isPast() ? now()->addHours((int) config('payment.flight_hold_hours', 3)) : $due;
    }

    public function storeFlight(Request $request, InvoiceService $invoices)
    {
        $data = $request->validate([
            'flight_id' => 'required|integer|exists:flights,id',
            'seats' => 'required|integer|min:1|max:999',
            'buyer_type' => ['required', Rule::in(array_keys(FlightOrder::BUYER_TYPES))],
            'bill_company' => 'nullable|required_if:buyer_type,agen|string|max:150',
            'bill_name' => 'required|string|max:150',
            'bill_address' => 'nullable|string|max:500',
            'contact_email' => 'required|email|max:150',
            'contact_phone' => 'required|string|max:20',
            'agree' => 'accepted',
        ], [
            'bill_company.required_if' => 'Nama travel / perusahaan wajib diisi untuk pembelian agen.',
        ], [
            'seats' => 'jumlah seat', 'bill_company' => 'nama travel / perusahaan', 'bill_name' => 'nama penanggung jawab',
            'bill_address' => 'alamat', 'contact_email' => 'email', 'contact_phone' => 'no. HP',
        ]);
        $seats = (int) $data['seats'];

        $order = DB::transaction(function () use ($request, $data, $seats, $invoices) {
            // kunci baris penerbangan → dua pembeli tidak bisa mengambil seat yang sama (anti double order)
            $f = Flight::lockForUpdate()->findOrFail($data['flight_id']);
            if (! $f->is_active || $f->depart_at->isPast()) {
                throw ValidationException::withMessages(['seats' => 'Penerbangan ini sudah tidak tersedia.']);
            }
            if ($f->seats_available < $seats) {
                throw ValidationException::withMessages(['seats' => "Seat tidak mencukupi, sisa {$f->seats_available} seat."]);
            }
            $f->decrement('seats_available', $seats); // langsung berkurang dari stok, ditahan selama batas bayar DP

            $order = FlightOrder::create([
                'code' => FlightOrder::generateCode('T'),
                'user_id' => $request->user()->id,
                'flight_id' => $f->id,
                'buyer_type' => $data['buyer_type'],
                'bill_company' => $data['buyer_type'] === 'agen' ? trim($data['bill_company']) : null,
                'bill_name' => trim($data['bill_name']),
                'bill_address' => $data['bill_address'] ?? null,
                'pax_count' => $seats,
                'unit_price' => $f->price,
                'total_amount' => $f->price * $seats,
                'status' => 'menunggu_pembayaran',
                'contact_email' => $data['contact_email'],
                'contact_phone' => $data['contact_phone'],
                'expires_at' => now()->addHours((int) config('payment.flight_hold_hours', 3)),
                'settlement_due_at' => $this->flightSettlementDue($f),
            ]);
            $invoices->issueInvoice($order->load('flight'));
            Audit::log('pesanan.tiket_dibuat', "Membuat order tiket {$order->code} ({$seats} seat".($order->bill_company ? ", {$order->bill_company}" : '').')', $order);

            return $order;
        });

        $request->user()->notify(new SystemNotification('pesanan', 'Pesanan Tiket Dibuat — '.$order->code,
            $order->pax_count.' seat ditahan sampai '.$order->expires_at->translatedFormat('d M Y H:i').' WIB. Bayar DP minimal Rp'.number_format($order->minimumPayment(), 0, ',', '.').' untuk mengunci seat, sisanya dapat dicicil sampai lunas.',
            $order->customerUrl(), 'Bayar Sekarang'));
        AdminNotifier::notify('pesanan', 'Order tiket baru '.$order->code,
            ($order->bill_company ?: $order->bill_name).' — '.$order->pax_count.' seat', route('admin.flight-orders.show', $order));

        return redirect()->route('customer.flight-orders.show', $order)->with('success', 'Pesanan seat dibuat dan invoice terbit. Silakan bayar DP untuk mengunci seat.');
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
                'unit_price' => $service->price, // Rupiah dengan kurs saat pengajuan (estimasi; final di invoice)
                'unit_price_usd' => $service->price_usd,
                'exchange_rate' => $service->price_usd ? VisaService::currentRate() : null,
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
        AdminNotifier::notify('visa', 'Pengajuan visa baru '.$app->code, $request->user()->name.' — '.$app->pax_count.' orang. Terbitkan invoice.', route('admin.visa.show', $app), true);

        return redirect()->route('customer.visa.show', $app)->with('success', 'Pengajuan visa terkirim. Mohon tunggu invoice dari admin.');
    }
}
