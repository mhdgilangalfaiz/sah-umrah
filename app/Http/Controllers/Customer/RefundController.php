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
            ->concat(Booking::where('user_id', $uid)->where('paid_amount', '>', 0)->whereNotIn('status', ['dibatalkan', 'selesai'])->get()->map(fn ($o) => ['type' => 'booking', 'code' => $o->code, 'label' => 'Umrah '.$o->code, 'paid' => $o->paid_amount]))
            ->concat(FlightOrder::where('user_id', $uid)->where('paid_amount', '>', 0)->whereNotIn('status', ['dibatalkan'])->get()->map(fn ($o) => ['type' => 'flight', 'code' => $o->code, 'label' => 'Tiket '.$o->code, 'paid' => $o->paid_amount]))
            ->concat(VisaApplication::where('user_id', $uid)->where('paid_amount', '>', 0)->whereNotIn('status', ['terbit', 'dibatalkan'])->get()->map(fn ($o) => ['type' => 'visa', 'code' => $o->code, 'label' => 'Visa '.$o->code, 'paid' => $o->paid_amount]));

        return Inertia::render('Customer/Refunds', [
            'refunds' => Refund::with('refundable')->where('user_id', $uid)->latest()->get()->map(fn ($r) => [
                'code' => $r->code, 'order' => $r->refundable?->code, 'requested_amount' => $r->requested_amount,
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
            'amount' => 'required|integer|min:10000',
            'reason' => 'required|string|min:20|max:2000',
            'bank_name' => 'required|string|max:60',
            'account_number' => 'required|digits_between:6,20',
            'account_holder' => 'required|string|max:120',
            'proof' => 'required|file|max:5120|mimes:jpg,jpeg,png,pdf',
        ], ['proof.required' => 'Foto/berkas bukti wajib diunggah sebagai dasar pengajuan refund.', 'reason.min' => 'Jelaskan alasan refund minimal 20 karakter.']);

        $order = self::TYPES[$data['order_type']]::where('code', $data['order_code'])->where('user_id', $request->user()->id)->firstOrFail();
        abort_if($data['amount'] > $order->paid_amount, 422, 'Nominal refund melebihi jumlah yang telah dibayar.');
        abort_if($order->refunds()->whereIn('status', ['diajukan', 'disetujui'])->exists(), 422, 'Masih ada pengajuan refund yang sedang diproses untuk pesanan ini.');

        $refund = Refund::create([
            'code' => 'RF-'.now()->format('ymd').'-'.strtoupper(Str::random(4)),
            'user_id' => $request->user()->id,
            'refundable_type' => $order->getMorphClass(), 'refundable_id' => $order->id,
            'requested_amount' => $data['amount'],
            'reason' => $data['reason'],
            'bank_name' => $data['bank_name'],
            'account_number' => $data['account_number'],
            'account_holder' => $data['account_holder'],
            'proof_path' => FileStorage::storePrivate($request->file('proof'), 'refunds/'.$request->user()->id, 'bukti_refund'),
        ]);
        Audit::log('refund.diajukan', "Pengajuan refund {$refund->code} Rp".number_format($refund->requested_amount, 0, ',', '.')." untuk {$order->code}", $refund);
        AdminNotifier::notify('refund', 'Pengajuan refund '.$refund->code, $request->user()->name.' — '.$order->code, route('admin.refunds.index'), true);

        return back()->with('success', 'Pengajuan refund terkirim. Tim Finance akan meninjau sesuai kebijakan refund.');
    }
}
