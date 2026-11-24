<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\FlightOrder;
use App\Models\Page;
use App\Models\Refund;
use App\Models\VisaApplication;
use App\Services\FileStorage;
use App\Support\AdminNotifier;
use App\Support\Audit;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

/** Pengajuan refund/pembatalan — wajib unggah foto bukti, diproses dengan persetujuan admin Finance */
class RefundController extends Controller
{
    private const TYPES = ['booking' => Booking::class, 'flight' => FlightOrder::class, 'visa' => VisaApplication::class];

    public function index(Request $request)
    {
        $uid = $request->user()->id;
        $eligible = collect()
            ->concat(Booking::with('passengers')->where('user_id', $uid)->where('paid_amount', '>', 0)->whereNotIn('status', ['dibatalkan', 'refund', 'selesai', 'kedaluwarsa'])->get()->map(fn ($o) => ['type' => 'booking', 'code' => $o->code, 'label' => 'Umrah '.$o->code, 'paid' => $o->paid_amount,
                'total' => $o->total_amount, 'passengers' => $o->passengers->map(fn ($p) => ['id' => $p->id, 'name' => $p->full_name, 'price' => (int) ($p->price ?? $o->unit_price)])->values()]))
            ->concat(FlightOrder::where('user_id', $uid)->where('paid_amount', '>', 0)->whereNotIn('status', ['dibatalkan'])->get()->map(fn ($o) => ['type' => 'flight', 'code' => $o->code, 'label' => 'Tiket '.$o->code, 'paid' => $o->paid_amount]))
            ->concat(VisaApplication::where('user_id', $uid)->where('paid_amount', '>', 0)->whereNotIn('status', ['terbit', 'dibatalkan'])->get()->map(fn ($o) => ['type' => 'visa', 'code' => $o->code, 'label' => 'Visa '.$o->code, 'paid' => $o->paid_amount]));

        return Inertia::render('Customer/Refunds', [
            'refunds' => Refund::with('refundable')->where('user_id', $uid)->latest()->get()->map(fn ($r) => [
                'code' => $r->code, 'type_label' => Refund::TYPES[$r->type] ?? $r->type, 'order' => $r->refundable?->code, 'requested_amount' => $r->requested_amount,
                'approved_amount' => $r->approved_amount, 'status' => $r->status, 'reason' => $r->reason,
                'admin_note' => $r->admin_note, 'created_at' => $r->created_at->format('d/m/Y'),
            ]),
            'eligible' => $eligible->values(),
            'policy' => Page::where('slug', 'kebijakan-refund')->value('content'),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'order_type' => ['required', Rule::in(array_keys(self::TYPES))],
            'order_code' => 'required|string',
            // pembatalan = batalkan seluruh pesanan, pengurangan = kurangi sebagian jamaah (umrah), refund = kembalikan dana saja
            'type' => ['nullable', Rule::in(['pembatalan', 'pengurangan', 'refund'])],
            'passenger_ids' => 'required_if:type,pengurangan|nullable|array|min:1',
            'passenger_ids.*' => 'integer',
            'amount' => 'required|integer|min:0',
            'reason' => 'required|string|min:20|max:2000',
            'bank_name' => 'required_unless:amount,0|nullable|string|max:60',
            'account_number' => 'required_unless:amount,0|nullable|digits_between:6,20',
            'account_holder' => 'required_unless:amount,0|nullable|string|max:120',
            'proof' => 'required_if:type,refund|nullable|file|max:5120|mimes:jpg,jpeg,png,pdf',
        ], [
            'proof.required_if' => 'Foto/berkas bukti wajib diunggah untuk pengajuan pengembalian dana.', 'reason.min' => 'Jelaskan alasan minimal 20 karakter.',
            'passenger_ids.required_if' => 'Pilih jamaah yang ingin dibatalkan.', 'bank_name.required_unless' => 'Nama bank wajib diisi.',
            'account_number.required_unless' => 'Nomor rekening wajib diisi.', 'account_holder.required_unless' => 'Nama pemilik rekening wajib diisi.',
        ]);
        $data['type'] ??= 'refund';
        if ($data['type'] === 'refund' && $data['amount'] < 10000) {
            throw \Illuminate\Validation\ValidationException::withMessages(['amount' => 'Nominal pengembalian dana minimal Rp10.000.']);
        }

        $order = self::TYPES[$data['order_type']]::where('code', $data['order_code'])->where('user_id', $request->user()->id)->firstOrFail();
        if ($data['type'] === 'pengurangan') {
            abort_unless($order instanceof Booking, 422, 'Pengurangan jamaah hanya untuk pesanan umrah.');
            $ids = $order->passengers()->whereIn('id', $data['passenger_ids'])->pluck('id');
            if ($ids->isEmpty() || $ids->count() >= $order->pax_count) {
                throw \Illuminate\Validation\ValidationException::withMessages(['passenger_ids' => 'Pilih jamaah yang dibatalkan (minimal 1 jamaah tetap berangkat). Untuk membatalkan semua, pilih Batalkan seluruh pesanan.']);
            }
            $data['passenger_ids'] = $ids->all();
        }
        if ($data['amount'] > $order->paid_amount) {
            throw \Illuminate\Validation\ValidationException::withMessages(['amount' => 'Nominal melebihi jumlah yang telah dibayar (Rp'.number_format($order->paid_amount, 0, ',', '.').').']);
        }
        // hanya pengajuan yang belum diputuskan admin yang menghalangi; refund "disetujui" tinggal ditransfer admin
        if ($pending = $order->refunds()->where('status', 'diajukan')->first()) {
            throw \Illuminate\Validation\ValidationException::withMessages(['order_code' => 'Masih ada pengajuan '.$pending->code.' yang sedang ditinjau admin untuk pesanan ini. Tunggu keputusannya terlebih dahulu.']);
        }

        $refund = Refund::create([
            'code' => 'RF-'.now()->format('ymd').'-'.strtoupper(Str::random(4)),
            'type' => $data['type'],
            'passenger_ids' => $data['type'] === 'pengurangan' ? $data['passenger_ids'] : null,
            'user_id' => $request->user()->id,
            'refundable_type' => $order->getMorphClass(), 'refundable_id' => $order->id,
            'requested_amount' => $data['amount'],
            'reason' => $data['reason'],
            'bank_name' => $data['bank_name'],
            'account_number' => $data['account_number'],
            'account_holder' => $data['account_holder'],
            'proof_path' => $request->hasFile('proof') ? FileStorage::storePrivate($request->file('proof'), 'refunds/'.$request->user()->id, 'bukti_refund') : null,
        ]);
        Audit::log('refund.diajukan', "Pengajuan refund {$refund->code} Rp".number_format($refund->requested_amount, 0, ',', '.')." untuk {$order->code}", $refund);
        AdminNotifier::notify('refund', 'Pengajuan '.strtolower(Refund::TYPES[$refund->type]).' '.$refund->code, $request->user()->name.' — '.$order->code, // umrah: pengajuan tampil di detail pesanan (bisa langsung diproses); tiket/visa: di menu Refund
            $order instanceof Booking ? route('admin.bookings.show', $order) : route('admin.refunds.index', ['q' => $refund->code]), true);

        return back()->with('success', 'Pengajuan '.strtolower(Refund::TYPES[$refund->type]).' terkirim. Admin akan meninjau sesuai kebijakan refund.');
    }
}
