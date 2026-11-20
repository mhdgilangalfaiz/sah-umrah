<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Document;
use App\Notifications\SystemNotification;
use App\Support\Audit;
use Illuminate\Http\Request;
use Inertia\Inertia;

/** Verifikasi dokumen jamaah (paspor, foto, KK, buku nikah, dll) */
class DocumentController extends Controller
{
    public function index(Request $request)
    {
        $status = $request->string('status', 'menunggu')->toString();

        return Inertia::render('Admin/Documents', [
            'documents' => Document::with('user:id,name,customer_code', 'jamaah:id,full_name', 'verifier:id,name')
                ->whereNotIn('type', ['eticket', 'visa_terbit'])
                ->when($status !== 'semua', fn ($q) => $q->where('status', $status))
                ->when($request->q, fn ($q, $s) => $q->whereHas('user', fn ($u) => $u->where('name', 'like', "%$s%")->orWhere('customer_code', 'like', "%$s%")))
                ->latest()->paginate(25)->withQueryString()
                ->through(fn ($d) => [
                    'id' => $d->id, 'type_label' => $d->type_label, 'file_name' => $d->file_name, 'status' => $d->status,
                    'user' => $d->user->name, 'customer_code' => $d->user->customer_code, 'jamaah' => $d->jamaah?->full_name,
                    'size' => $d->size, 'mime' => $d->mime, 'rejection_note' => $d->rejection_note, 'verifier' => $d->verifier?->name,
                    'created_at' => $d->created_at->format('d/m/Y H:i'), 'url' => $d->signedUrl(),
                ]),
            'filters' => ['status' => $status, 'q' => $request->q],
        ]);
    }

    public function update(Request $request, Document $document)
    {
        $data = $request->validate([
            'status' => 'required|in:diverifikasi,ditolak',
            'rejection_note' => 'required_if:status,ditolak|nullable|string|max:500',
        ], ['rejection_note.required_if' => 'Tuliskan alasan penolakan agar pelanggan dapat memperbaiki.']);

        $document->update([
            'status' => $data['status'], 'rejection_note' => $data['status'] === 'ditolak' ? $data['rejection_note'] : null,
            'verified_by' => $request->user()->id, 'verified_at' => now(),
        ]);
        Audit::log('dokumen.'.($data['status'] === 'ditolak' ? 'tolak' : 'verifikasi'), ucfirst($data['status'])." dokumen {$document->file_name}", $document);

        if ($data['status'] === 'ditolak') {
            $document->user->notify(new SystemNotification('dokumen', 'Dokumen Perlu Diperbaiki',
                "Dokumen {$document->type_label} ({$document->file_name}) ditolak. Alasan: {$data['rejection_note']}. Mohon unggah ulang.",
                route('customer.documents.index'), 'Unggah Ulang', true, false, 'warning'));
        } else {
            $document->user->notify(new SystemNotification('dokumen', 'Dokumen Terverifikasi',
                "Dokumen {$document->type_label} telah diverifikasi.", route('customer.documents.index'), 'Lihat Dokumen', false, false, 'success'));
        }

        return back()->with('success', 'Status dokumen diperbarui.');
    }
}
