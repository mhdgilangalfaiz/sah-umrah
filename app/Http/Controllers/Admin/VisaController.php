<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\VisaApplication;
use App\Notifications\SystemNotification;
use App\Services\FileStorage;
use App\Services\InvoiceService;
use App\Models\Document;
use App\Support\Audit;
use App\Support\BerkasArchive;
use Illuminate\Validation\ValidationException;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class VisaController extends Controller
{
    public function index(Request $request)
    {
        return Inertia::render('Admin/Visa/Index', [
            'applications' => VisaApplication::with('user:id,name,customer_code', 'service:id,name')
                ->addSelect(['visa_applications.*', 'invoice_number' => \App\Models\Invoice::activeNumberQuery(VisaApplication::class, 'visa_applications')])
                ->when($request->status, fn ($q, $s) => $q->where('status', $s))
                ->when($request->q, fn ($q, $s) => $q->where(fn ($w) => $w->where('code', 'like', "%$s%")
                    ->orWhereHas('invoices', fn ($i) => $i->where('number', 'like', "%$s%"))
                    ->orWhereHas('user', fn ($u) => $u->where('name', 'like', "%$s%"))))
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
            'usdRate' => \App\Models\VisaService::currentRate(),
            'payments' => $v->payments()->get(),
            'documents' => $v->documents()->latest()->get()->map(fn ($d) => [
                'id' => $d->id, 'type' => $d->type, 'type_label' => $d->type_label, 'file_name' => $d->file_name, 'status' => $d->status,
                'size' => $d->size, 'rejection_note' => $d->rejection_note, 'created_at' => $d->created_at->format('d/m/Y H:i'), 'url' => $d->signedUrl(),
                'review' => $d->review,
                // isi ZIP dibaca hanya untuk berkas yang masih menunggu pemeriksaan
                'entries' => $d->type === 'berkas_visa' && $d->status === 'menunggu' ? BerkasArchive::entries($d) : null,
                'is_zip' => $d->isZip(),
            ]),
            'requirements' => $v->service?->requirements ?? [],
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
            'exchange_rate' => 'nullable|numeric|min:1000|max:100000',
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
            'pax_count' => $data['pax_count'], 'unit_price' => $data['unit_price'],
            'exchange_rate' => $visaApplication->unit_price_usd ? ($data['exchange_rate'] ?? $visaApplication->exchange_rate) : null, 'extra_fee' => $data['extra_fee'] ?? 0,
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

    /** Buka satu file di dalam berkas ZIP (inline) agar admin bisa memeriksanya tanpa mengekstrak sendiri */
    public function berkasFile(Request $request, VisaApplication $visaApplication, Document $document)
    {
        $this->ensureBerkas($visaApplication, $document);
        $name = (string) $request->query('nama');
        $file = BerkasArchive::read($document, $name);
        abort_unless($file, 404, 'File tidak ditemukan di dalam berkas.');
        Audit::log('dokumen.lihat', "Melihat {$name} di berkas {$document->file_name}", $document);

        return response($file[0], 200, [
            'Content-Type' => $file[1],
            'Content-Disposition' => ($file[1] === 'application/octet-stream' ? 'attachment' : 'inline').'; filename="'.addslashes(basename($name)).'"',
            'Cache-Control' => 'private, no-store',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    /**
     * Hasil pemeriksaan berkas per dokumen.
     *  - Semua sesuai   -> berkas diverifikasi, status visa naik ke "Diverifikasi".
     *  - Ada yang salah -> berkas ditolak, pelanggan diberi tahu dokumen mana saja yang salah & alasannya,
     *                      status tetap "Menunggu Dokumen" agar pelanggan mengunggah ulang.
     */
    public function reviewBerkas(Request $request, VisaApplication $visaApplication, Document $document)
    {
        $this->ensureBerkas($visaApplication, $document);
        abort_unless($visaApplication->status === 'menunggu_dokumen' && $document->status === 'menunggu', 422, 'Berkas ini sudah diperiksa.');

        $data = $request->validate([
            'items' => 'required|array|min:1|max:200',
            'items.*.name' => 'required|string|max:255',
            'items.*.ok' => 'required|boolean',
            'items.*.note' => 'nullable|string|max:300',
        ], ['items.required' => 'Periksa minimal satu dokumen.', 'items.*.name.required' => 'Nama dokumen wajib diisi.']);

        $items = collect($data['items'])->map(fn ($i) => [
            'name' => $i['name'], 'ok' => (bool) $i['ok'], 'note' => $i['ok'] ? null : trim((string) ($i['note'] ?? '')),
        ]);
        $bad = $items->where('ok', false)->values();
        $noReason = $bad->where('note', '')->pluck('name');
        if ($noReason->isNotEmpty()) {
            throw ValidationException::withMessages(['items' => 'Tuliskan alasan untuk dokumen yang tidak sesuai: '.$noReason->map(fn ($n) => basename($n))->implode(', ').'.']);
        }

        $summary = $bad->map(fn ($i) => basename($i['name']).': '.$i['note'])->implode('; ');
        $document->update([
            'review' => $items->all(),
            'status' => $bad->isEmpty() ? 'diverifikasi' : 'ditolak',
            'rejection_note' => $bad->isEmpty() ? null : $summary,
            'verified_by' => $request->user()->id, 'verified_at' => now(),
        ]);

        if ($bad->isEmpty()) {
            $visaApplication->transitionTo('diverifikasi', 'Semua '.$items->count().' dokumen dalam berkas '.$document->file_name.' sesuai.', $request->user()->id);
            $msg = 'Berkas visa Anda telah diverifikasi ('.$items->count().' dokumen sesuai). Pengajuan segera diproses.';
        } else {
            $visaApplication->statusLogs()->create([
                'from_status' => 'menunggu_dokumen', 'to_status' => 'menunggu_dokumen', 'changed_by' => $request->user()->id,
                'note' => $bad->count().' dari '.$items->count().' dokumen perlu diperbaiki: '.$summary,
            ]);
            $msg = 'Ada '.$bad->count().' dokumen yang perlu diperbaiki: '.$summary.'. Silakan unggah ulang berkas lengkap (zip/rar).';
        }
        Audit::log('visa.berkas_periksa', "Memeriksa berkas {$document->file_name} ({$visaApplication->code}): ".($bad->isEmpty() ? 'semua sesuai' : $bad->count().' tidak sesuai'), $visaApplication);

        $visaApplication->user->notify(new SystemNotification('visa', ($bad->isEmpty() ? 'Berkas Visa Diverifikasi' : 'Berkas Visa Perlu Diperbaiki').' — '.$visaApplication->code,
            $msg, $visaApplication->customerUrl(), 'Lihat Detail', true, false, $bad->isEmpty() ? 'success' : 'warning'));

        return back()->with('success', $bad->isEmpty() ? 'Berkas diverifikasi — status visa kini Diverifikasi.' : 'Hasil pemeriksaan dikirim ke pelanggan ('.$bad->count().' dokumen perlu diperbaiki).');
    }

    private function ensureBerkas(VisaApplication $visaApplication, Document $document): void
    {
        abort_unless($document->documentable_type === $visaApplication->getMorphClass()
            && (int) $document->documentable_id === $visaApplication->id && $document->type === 'berkas_visa', 404);
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
        // Alur berurutan: berkas diverifikasi lewat pemeriksaan per dokumen (reviewBerkas), lalu diproses -> terbit.
        $allowed = [
            'menunggu_dokumen' => ['ditolak', 'dibatalkan'],
            'diverifikasi' => ['diproses', 'menunggu_dokumen', 'ditolak', 'dibatalkan'],
            'diproses' => ['terbit', 'ditolak', 'dibatalkan'],
            // ditolak: buka kembali agar pelanggan mengunggah berkas baru, atau batalkan bila penolakan final
            'ditolak' => ['menunggu_dokumen', 'dibatalkan'],
        ][$visaApplication->status] ?? ['dibatalkan'];
        if (! in_array($data['status'], $allowed, true) && ! ($data['document_id'] ?? null)) {
            throw ValidationException::withMessages(['status' => 'Status "'.VisaApplication::STATUSES[$data['status']].'" tidak bisa dipilih dari tahap "'.VisaApplication::STATUSES[$visaApplication->status].'".']);
        }

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
        } elseif ($data['status'] === 'menunggu_dokumen') {
            $visaApplication->rejection_reason = null; // dibuka kembali → pelanggan mengunggah berkas baru
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
