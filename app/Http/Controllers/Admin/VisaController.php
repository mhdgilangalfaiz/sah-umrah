<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\VisaApplication;
use App\Notifications\SystemNotification;
use App\Services\FileStorage;
use App\Services\InvoiceService;
use App\Support\Audit;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class VisaController extends Controller
{
    public function index(Request $request)
    {
        return Inertia::render('Admin/Visa/Index', [
            'applications' => VisaApplication::with('user:id,name,customer_code', 'service:id,name')
                ->when($request->status, fn ($q, $s) => $q->where('status', $s))
                ->when($request->q, fn ($q, $s) => $q->where('code', 'like', "%$s%"))
                ->latest()->paginate(20)->withQueryString(),
            'filters' => $request->only('status', 'q'),
            'statuses' => VisaApplication::STATUSES,
        ]);
    }

    public function show(VisaApplication $visaApplication)
    {
        $v = $visaApplication->load('user', 'service', 'passengers', 'invoices', 'statusLogs.changer:id,name,role');

        return Inertia::render('Admin/Visa/Show', [
            'application' => $v,
            'customer' => $v->user->only('name', 'email', 'phone', 'customer_code'),
            'applicants' => $v->passengers->map(fn ($p) => ['id' => $p->id, 'full_name' => $p->full_name, 'passport_number' => $p->passport_number]),
            'statuses' => VisaApplication::STATUSES,
            'payments' => $v->payments()->get(),
            'documents' => $v->documents()->latest()->get()->map(fn ($d) => [
                'id' => $d->id, 'type' => $d->type, 'type_label' => $d->type_label, 'file_name' => $d->file_name, 'status' => $d->status,
                'size' => $d->size, 'rejection_note' => $d->rejection_note, 'created_at' => $d->created_at->format('d/m/Y H:i'), 'url' => $d->signedUrl(),
            ]),
        ]);
    }

    /** Terbitkan / ubah invoice: admin dapat mengubah jumlah pemesan, harga, biaya tambahan, potongan & data pemohon */
    public function invoice(Request $request, VisaApplication $visaApplication, InvoiceService $invoices)
    {
        abort_unless(in_array($visaApplication->status, ['menunggu_invoice', 'menunggu_pembayaran'], true) && (int) $visaApplication->paid_amount === 0, 422,
            'Invoice tidak dapat diubah setelah ada pembayaran.');

        $data = $request->validate([
            'pax_count' => 'required|integer|min:1|max:500',
            'unit_price' => 'required|integer|min:0',
            'extra_fee' => 'nullable|integer|min:0',
            'extra_fee_label' => 'nullable|string|max:100',
            'discount' => 'nullable|integer|min:0',
            'applicants' => 'nullable|array',
            'applicants.*.full_name' => 'required|string|max:120',
            'applicants.*.passport_number' => 'nullable|string|max:20',
            'note' => 'nullable|string|max:500',
        ]);

        $old = $visaApplication->only('pax_count', 'unit_price', 'extra_fee', 'discount', 'total_amount');
        $visaApplication->fill([
            'pax_count' => $data['pax_count'], 'unit_price' => $data['unit_price'], 'extra_fee' => $data['extra_fee'] ?? 0,
            'extra_fee_label' => $data['extra_fee_label'] ?? null, 'discount' => $data['discount'] ?? 0, 'invoice_issued_at' => now(),
        ]);
        $visaApplication->recalculateTotal();
        $visaApplication->save();

        if ($request->has('applicants')) {
            $visaApplication->passengers()->delete();
            foreach ($data['applicants'] ?? [] as $a) {
                $visaApplication->passengers()->create(['full_name' => $a['full_name'], 'passport_number' => $a['passport_number'] ? strtoupper($a['passport_number']) : null]);
            }
        }

        $invoice = $invoices->issueInvoice($visaApplication->load('service'));
        $first = $visaApplication->status === 'menunggu_invoice';
        if ($first) {
            $visaApplication->transitionTo('menunggu_pembayaran', 'Invoice '.$invoice->number.' diterbitkan. '.($data['note'] ?? ''), $request->user()->id);
        } else {
            $visaApplication->statusLogs()->create(['from_status' => 'menunggu_pembayaran', 'to_status' => 'menunggu_pembayaran', 'note' => 'Invoice diperbarui oleh admin. '.($data['note'] ?? ''), 'changed_by' => $request->user()->id]);
        }
        Audit::log('visa.invoice', ($first ? 'Menerbitkan' : 'Mengubah')." invoice visa {$visaApplication->code}", $visaApplication, $old, $visaApplication->only('pax_count', 'unit_price', 'extra_fee', 'discount', 'total_amount'));

        $visaApplication->user->notify(new SystemNotification('visa', 'Invoice Visa '.($first ? 'Terbit' : 'Diperbarui').' — '.$visaApplication->code,
            'Total tagihan visa Anda Rp'.number_format($visaApplication->total_amount, 0, ',', '.').' untuk '.$visaApplication->pax_count.' orang. Silakan lakukan pembayaran melalui sistem.',
            $visaApplication->customerUrl(), 'Bayar Sekarang'));

        return back()->with('success', 'Invoice visa '.($first ? 'diterbitkan' : 'diperbarui').'.');
    }

    /** Ubah status visa (verifikasi berkas, proses, terbit + upload visa, tolak) */
    public function status(Request $request, VisaApplication $visaApplication)
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(['menunggu_dokumen', 'diverifikasi', 'diproses', 'terbit', 'ditolak', 'dibatalkan'])],
            'note' => 'required_if:status,ditolak|nullable|string|max:1000',
            'document_id' => 'nullable|integer',
            'visa_file' => 'required_if:status,terbit|nullable|file|max:20480|mimes:pdf,jpg,jpeg,png,zip',
        ], ['visa_file.required_if' => 'Unggah file visa yang telah terbit.', 'note.required_if' => 'Tuliskan alasan penolakan.']);
        $data['note'] ??= null;

        abort_if(in_array($visaApplication->status, ['menunggu_invoice', 'menunggu_pembayaran'], true) && $data['status'] !== 'dibatalkan', 422, 'Visa belum dibayar.');

        // Verifikasi / tolak berkas yang diunggah pelanggan
        if ($data['document_id'] ?? null) {
            $doc = $visaApplication->documents()->findOrFail($data['document_id']);
            $docStatus = $data['status'] === 'menunggu_dokumen' ? 'ditolak' : 'diverifikasi';
            $doc->update(['status' => $docStatus, 'rejection_note' => $docStatus === 'ditolak' ? $data['note'] : null, 'verified_by' => $request->user()->id, 'verified_at' => now()]);
        }

        if ($data['status'] === 'terbit') {
            FileStorage::storeDocument($request->file('visa_file'), $visaApplication->user, 'visa_terbit', [
                'documentable_type' => $visaApplication->getMorphClass(), 'documentable_id' => $visaApplication->id,
            ], $request->user());
            $visaApplication->issued_at = now();
        }
        if ($data['status'] === 'ditolak') {
            $visaApplication->rejection_reason = $data['note'];
        }

        $from = $visaApplication->status;
        $visaApplication->transitionTo($data['status'], $data['note'] ?? null, $request->user()->id);
        Audit::log('visa.status', "Status visa {$visaApplication->code}: $from → {$data['status']}", $visaApplication, ['status' => $from], ['status' => $data['status']]);

        $label = VisaApplication::STATUSES[$data['status']];
        $msg = match ($data['status']) {
            'menunggu_dokumen' => 'Berkas Anda perlu diperbaiki/dilengkapi. Catatan admin: '.($data['note'] ?: '-').'. Silakan unggah ulang.',
            'terbit' => 'Alhamdulillah, visa Anda telah TERBIT dan dapat diunduh melalui dashboard.',
            'ditolak' => 'Mohon maaf, pengajuan visa ditolak. Alasan: '.($data['note'] ?: '-'),
            default => 'Status pengajuan visa Anda kini: '.$label.'.'.($data['note'] ? ' Catatan: '.$data['note'] : ''),
        };
        $visaApplication->user->notify(new SystemNotification('visa', 'Status Visa: '.$label.' — '.$visaApplication->code, $msg,
            $visaApplication->customerUrl(), 'Lihat Detail', true, false, $data['status'] === 'terbit' ? 'success' : ($data['status'] === 'ditolak' ? 'danger' : 'info')));

        return back()->with('success', 'Status visa diperbarui menjadi '.$label.'.');
    }
}
