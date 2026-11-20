<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Refund;
use App\Notifications\SystemNotification;
use App\Services\BookingService;
use App\Services\FileStorage;
use App\Support\Audit;
use Illuminate\Http\Request;
use Inertia\Inertia;

/** Refund & pembatalan — persetujuan admin Finance */
class RefundController extends Controller
{
    public function index(Request $request)
    {
        return Inertia::render('Admin/Refunds', [
            'refunds' => Refund::with('user:id,name,customer_code,phone', 'refundable', 'reviewer:id,name')
                ->when($request->status, fn ($q, $s) => $q->where('status', $s))
                ->latest()->paginate(20)->withQueryString()
                ->through(fn ($r) => [
                    'id' => $r->id, 'code' => $r->code, 'user' => $r->user->name, 'customer_code' => $r->user->customer_code,
                    'order' => $r->refundable?->code, 'order_status' => $r->refundable?->status, 'paid' => $r->refundable?->paid_amount,
                    'requested_amount' => $r->requested_amount, 'approved_amount' => $r->approved_amount, 'reason' => $r->reason,
                    'bank_name' => $r->bank_name, 'account_number' => $r->account_number, 'account_holder' => $r->account_holder,
                    'status' => $r->status, 'admin_note' => $r->admin_note, 'reviewer' => $r->reviewer?->name,
                    'has_proof' => (bool) $r->proof_path, 'created_at' => $r->created_at->format('d/m/Y H:i'),
                    'is_booking' => $r->refundable instanceof Booking,
                ]),
            'filters' => $request->only('status'),
        ]);
    }

    public function proof(Refund $refund)
    {
        abort_unless($refund->proof_path, 404);
        Audit::log('refund.lihat_bukti', "Melihat bukti refund {$refund->code}", $refund);
        $ext = pathinfo($refund->proof_path, PATHINFO_EXTENSION);

        return response(FileStorage::readPrivate($refund->proof_path), 200, [
            'Content-Type' => match (strtolower($ext)) { 'pdf' => 'application/pdf', 'png' => 'image/png', default => 'image/jpeg' },
            'Content-Disposition' => 'inline; filename="'.basename($refund->proof_path).'"',
            'Cache-Control' => 'private, no-store',
        ]);
    }

    public function update(Request $request, Refund $refund, BookingService $bookings)
    {
        $data = $request->validate([
            'action' => 'required|in:setujui,tolak,selesai',
            'approved_amount' => 'required_if:action,setujui|nullable|integer|min:0',
            'admin_note' => 'nullable|string|max:1000',
            'cancel_order' => 'boolean',
            'transfer_proof' => 'required_if:action,selesai|nullable|file|max:5120|mimes:jpg,jpeg,png,pdf',
        ]);
        $old = $refund->only('status', 'approved_amount');

        switch ($data['action']) {
            case 'setujui':
                abort_unless($refund->status === 'diajukan', 422);
                abort_if($data['approved_amount'] > ($refund->refundable?->paid_amount ?? 0) && ! str_contains($refund->reason, 'ganda'), 422, 'Nominal melebihi total dibayar.');
                $refund->update(['status' => 'disetujui', 'approved_amount' => $data['approved_amount'], 'admin_note' => $data['admin_note'] ?? null, 'reviewed_by' => $request->user()->id, 'reviewed_at' => now()]);
                if (($data['cancel_order'] ?? false) && $refund->refundable instanceof Booking) {
                    $bookings->cancel($refund->refundable, 'Refund '.$refund->code.' disetujui', $request->user());
                }
                $msg = 'Pengajuan refund '.$refund->code.' DISETUJUI sebesar Rp'.number_format($refund->approved_amount, 0, ',', '.').'. Dana akan ditransfer ke rekening Anda.';
                break;
            case 'tolak':
                abort_unless($refund->status === 'diajukan', 422);
                $refund->update(['status' => 'ditolak', 'admin_note' => $data['admin_note'] ?? null, 'reviewed_by' => $request->user()->id, 'reviewed_at' => now()]);
                $msg = 'Pengajuan refund '.$refund->code.' ditolak. Catatan: '.($data['admin_note'] ?? '-');
                break;
            default: // selesai (dana sudah ditransfer)
                abort_unless($refund->status === 'disetujui', 422);
                $path = FileStorage::storePrivate($request->file('transfer_proof'), 'refunds/'.$refund->user_id, 'bukti-transfer-refund');
                $refund->update(['status' => 'selesai', 'transfer_proof_path' => $path, 'admin_note' => $data['admin_note'] ?? $refund->admin_note]);
                $msg = 'Dana refund '.$refund->code.' sebesar Rp'.number_format($refund->approved_amount, 0, ',', '.').' telah ditransfer.';
        }

        Audit::log('refund.'.$data['action'], "Refund {$refund->code}: {$data['action']}", $refund, $old, $refund->only('status', 'approved_amount'));
        $refund->user->notify(new SystemNotification('refund', 'Update Refund — '.$refund->code, $msg, route('customer.refunds.index'), 'Lihat Refund',
            true, false, $data['action'] === 'tolak' ? 'warning' : 'success'));

        return back()->with('success', 'Refund diperbarui.');
    }
}
