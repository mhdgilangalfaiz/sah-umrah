<?php

namespace App\Http\Controllers\Admin;

use App\Exports\ArrayExport;
use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Notifications\SystemNotification;
use App\Services\BookingService;
use App\Support\Audit;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Maatwebsite\Excel\Facades\Excel;

class BookingController extends Controller
{
    private function query(Request $request)
    {
        return Booking::with(['user:id,name,email,phone,customer_code', 'departure.package:id,name'])
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->when($request->q, fn ($q, $s) => $q->where(fn ($w) => $w->where('code', 'like', "%$s%")
                ->orWhereHas('user', fn ($u) => $u->where('name', 'like', "%$s%")->orWhere('customer_code', 'like', "%$s%"))))
            ->when($request->boolean('terlambat'), fn ($q) => $q->where('status', 'cicilan_berjalan')->where('payment_deadline', '<', today()))
            ->when($request->dari, fn ($q, $d) => $q->whereDate('created_at', '>=', $d))
            ->when($request->sampai, fn ($q, $d) => $q->whereDate('created_at', '<=', $d))
            ->latest();
    }

    public function index(Request $request)
    {
        return Inertia::render('Admin/Bookings/Index', [
            'bookings' => $this->query($request)->paginate(20)->withQueryString()->through(fn ($b) => [
                'code' => $b->code, 'user' => $b->user->name, 'customer_code' => $b->user->customer_code,
                'package' => $b->departure->package->name, 'departure_date' => $b->departure->departure_date->format('Y-m-d'),
                'pax' => $b->pax_count, 'total' => $b->total_amount, 'paid' => $b->paid_amount, 'status' => $b->status,
                'scheme' => $b->payment_scheme, 'overdue' => $b->isOverdue(), 'created_at' => $b->created_at->format('d/m/Y'),
            ]),
            'filters' => $request->only('status', 'q', 'terlambat', 'dari', 'sampai'),
        ]);
    }

    public function show(Booking $booking)
    {
        $booking->load('user', 'departure.package', 'installments', 'passengers', 'invoices', 'refunds');

        return Inertia::render('Admin/Bookings/Show', [
            'booking' => $booking,
            'customer' => $booking->user->only('name', 'email', 'phone', 'customer_code', 'city'),
            'passengers' => $booking->passengers->map(fn ($p) => [
                ...$p->only('id', 'title', 'full_name', 'gender', 'nationality', 'mahram_name', 'mahram_relation'),
                'category' => $p->category ?: 'dewasa', 'price' => (int) ($p->price ?? $booking->unit_price),
                'age' => $p->birth_date?->age,
                'birth_date' => $p->birth_date?->format('d/m/Y'), 'passport_number' => $p->passport_number,
                'passport_expiry' => $p->passport_expiry?->format('d/m/Y'), 'nik' => $p->nik,
            ]),
            'payments' => $booking->payments()->get(),
            'outstanding' => $booking->outstandingAmount(),
            'overdue' => $booking->isOverdue(),
            'reminders' => \App\Models\ReminderLog::where('remindable_type', $booking->getMorphClass())->where('remindable_id', $booking->id)->latest()->take(20)->get(),
            'changes' => $booking->changes()->with('changer:id,name')->get()->map(fn ($c) => [
                'id' => $c->id, 'type' => $c->type, 'type_label' => \App\Models\BookingChange::TYPES[$c->type] ?? $c->type, 'description' => $c->description,
                'old_total' => $c->old_total, 'new_total' => $c->new_total, 'refund_amount' => $c->refund_amount,
                'by' => $c->changer?->name, 'at' => $c->created_at->format('d/m/Y H:i'),
            ]),
            'refundRequests' => $booking->refunds()->latest()->get()->map(fn ($r) => [
                'code' => $r->code, 'type' => $r->type, 'type_label' => \App\Models\Refund::TYPES[$r->type] ?? $r->type, 'status' => $r->status,
                'requested_amount' => $r->requested_amount, 'approved_amount' => $r->approved_amount, 'reason' => $r->reason,
                'passengers' => $r->passenger_ids ? $booking->passengers->whereIn('id', $r->passenger_ids)->pluck('full_name')->values() : [],
                'created_at' => $r->created_at->format('d/m/Y H:i'),
            ]),
            'categories' => \App\Models\BookingPassenger::CATEGORIES,
            'documents' => $booking->user->documents()->whereIn('jamaah_id', $booking->passengers->pluck('jamaah_id')->filter())->get()
                ->map(fn ($d) => ['id' => $d->id, 'type_label' => $d->type_label, 'file_name' => $d->file_name, 'status' => $d->status, 'url' => $d->signedUrl()]),
        ]);
    }

    private const CLOSED = ['dibatalkan', 'refund', 'selesai', 'kedaluwarsa'];

    /**
     * Batalkan seluruh pesanan. Bila ada dana dikembalikan → status pesanan "Refund" dan refund tercatat (disetujui),
     * tanpa dana dikembalikan → status "Dibatalkan".
     */
    public function cancel(Request $request, Booking $booking, BookingService $service)
    {
        $data = $request->validate([
            'reason' => 'required|string|max:300',
            'refund_amount' => 'nullable|integer|min:0|max:'.(int) $booking->paid_amount,
        ], ['refund_amount.max' => 'Dana dikembalikan maksimal sebesar total yang sudah dibayar.']);
        abort_if(in_array($booking->status, self::CLOSED, true), 422, 'Pesanan sudah ditutup.');
        $refund = (int) ($data['refund_amount'] ?? 0);

        $service->cancel($booking, $data['reason'], $request->user(), $refund > 0 ? 'refund' : 'dibatalkan');
        $record = null;
        if ($refund > 0) {
            // pengajuan pembatalan dari pelanggan (bila ada) dipakai; bila tidak, refund dibuat atas nama admin
            $record = $booking->refunds()->where('status', 'diajukan')->latest()->first();
            $record?->update(['type' => 'pembatalan', 'status' => 'disetujui', 'approved_amount' => $refund, 'reviewed_by' => $request->user()->id, 'reviewed_at' => now()]);
            $record ??= $this->adminRefund($booking, 'pembatalan', $refund, 'Pembatalan pesanan: '.$data['reason'], $request->user()->id);
        }
        $booking->refunds()->where('status', 'diajukan')->update(['status' => 'ditolak', 'admin_note' => 'Pesanan telah dibatalkan oleh admin.']);
        $booking->changes()->create(['type' => 'pembatalan', 'description' => 'Pesanan dibatalkan. Alasan: '.$data['reason'], 'old_total' => $booking->total_amount,
            'new_total' => 0, 'refund_amount' => $refund, 'refund_id' => $record?->id, 'changed_by' => $request->user()->id]);

        $booking->user->notify(new SystemNotification('pesanan', ($refund > 0 ? 'Pesanan Dibatalkan & Refund' : 'Pesanan Dibatalkan').' — '.$booking->code,
            'Pesanan Anda dibatalkan. Alasan: '.$data['reason'].'.'.($refund > 0 ? ' Dana Rp'.number_format($refund, 0, ',', '.').' akan dikembalikan ke rekening Anda.' : ''),
            $booking->customerUrl(), 'Lihat Pesanan', true, false, 'warning'));

        return back()->with('success', $refund > 0 ? 'Pesanan dibatalkan — status Refund, dana tercatat di menu Refund.' : 'Pesanan dibatalkan.');
    }

    /** Pengurangan jamaah (mis. 2 tiket → 1): jamaah terpilih keluar, total & cicilan dihitung ulang, dana dikembalikan bila ada. */
    public function reduce(Request $request, Booking $booking, BookingService $service)
    {
        abort_if(in_array($booking->status, self::CLOSED, true), 422, 'Pesanan sudah ditutup.');
        $data = $request->validate([
            'passenger_ids' => 'required|array|min:1',
            'passenger_ids.*' => 'integer',
            'refund_amount' => 'required|integer|min:0',
            'reason' => 'required|string|max:300',
        ], ['passenger_ids.required' => 'Pilih jamaah yang dikurangi.']);

        // pengajuan pengurangan dari pelanggan untuk jamaah yang sama ikut diselesaikan
        $request_ = $booking->refunds()->where('status', 'diajukan')->where('type', 'pengurangan')->latest()->first();
        if ($request_ && (int) $data['refund_amount'] > 0) {
            $request_->update(['status' => 'disetujui', 'approved_amount' => (int) $data['refund_amount'], 'reviewed_by' => $request->user()->id, 'reviewed_at' => now()]);
        }
        $service->reducePassengers($booking, $data['passenger_ids'], (int) $data['refund_amount'], $data['reason'], $request->user(),
            $request_ && (int) $data['refund_amount'] > 0 ? $request_ : null);

        return back()->with('success', 'Jamaah dikurangi. Total & jadwal cicilan sudah dihitung ulang.');
    }

    /** Perubahan jamaah (mis. 2 dewasa → 1 dewasa + 1 anak): ubah kategori & harga per jamaah. */
    public function change(Request $request, Booking $booking, BookingService $service)
    {
        abort_if(in_array($booking->status, self::CLOSED, true), 422, 'Pesanan sudah ditutup.');
        $data = $request->validate([
            'passengers' => 'required|array|min:1',
            'passengers.*.id' => 'required|integer',
            'passengers.*.category' => ['required', \Illuminate\Validation\Rule::in(array_keys(\App\Models\BookingPassenger::CATEGORIES))],
            'passengers.*.price' => 'required|integer|min:0|max:1000000000',
            'refund_amount' => 'required|integer|min:0',
            'reason' => 'required|string|max:300',
        ]);
        $changes = collect($data['passengers'])->mapWithKeys(fn ($p) => [$p['id'] => ['category' => $p['category'], 'price' => (int) $p['price']]])->all();
        $service->changePassengers($booking, $changes, (int) $data['refund_amount'], $data['reason'], $request->user());

        return back()->with('success', 'Data jamaah diubah. Total & jadwal cicilan sudah dihitung ulang.');
    }

    private function adminRefund(Booking $booking, string $type, int $amount, string $reason, int $by): \App\Models\Refund
    {
        $last = \App\Models\Refund::where('user_id', $booking->user_id)->whereNotNull('bank_name')->latest()->first();

        return \App\Models\Refund::create([
            'code' => 'RF-'.now()->format('ymd').'-'.strtoupper(\Illuminate\Support\Str::random(4)),
            'type' => $type, 'user_id' => $booking->user_id,
            'refundable_type' => $booking->getMorphClass(), 'refundable_id' => $booking->id,
            'requested_amount' => $amount, 'approved_amount' => $amount, 'reason' => $reason,
            'bank_name' => $last?->bank_name, 'account_number' => $last?->account_number, 'account_holder' => $last?->account_holder,
            'status' => 'disetujui', 'reviewed_by' => $by, 'reviewed_at' => now(),
        ]);
    }

    public function export(Request $request)
    {
        $rows = $this->query($request)->get()->map(fn ($b) => [
            $b->code, $b->created_at->format('d/m/Y'), $b->user->name, $b->user->customer_code, $b->user->phone,
            $b->departure->package->name, $b->departure->departure_date->format('d/m/Y'), $b->pax_count, strtoupper($b->room_type),
            $b->payment_scheme, $b->total_amount, $b->paid_amount, $b->outstandingAmount(), $b->status,
        ])->all();
        Audit::log('pesanan.ekspor', 'Ekspor data pesanan umrah ('.count($rows).' baris)');

        return Excel::download(new ArrayExport(['Kode', 'Tanggal', 'Pemesan', 'Kode Pelanggan', 'HP', 'Paket', 'Berangkat', 'Pax', 'Kamar', 'Skema', 'Total', 'Dibayar', 'Sisa', 'Status'], $rows),
            'pesanan-umrah-'.now()->format('d-m-y').'.xlsx');
    }
}
