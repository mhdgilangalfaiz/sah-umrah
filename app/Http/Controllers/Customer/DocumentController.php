<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\Document;
use App\Services\FileStorage;
use App\Support\AdminNotifier;
use App\Support\Audit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

/** Dokumen jamaah: paspor, foto, KTP, KK, buku nikah, dll — status verifikasi oleh admin */
class DocumentController extends Controller
{
    private const USER_TYPES = ['paspor', 'foto', 'ktp', 'kk', 'buku_nikah', 'vaksin', 'lainnya'];

    public function index(Request $request)
    {
        $u = $request->user();

        return Inertia::render('Customer/Documents', [
            'jamaah' => $u->jamaah()->orderBy('full_name')->get(['id', 'full_name', 'relation']),
            'documents' => $u->documents()->with('jamaah:id,full_name')->whereIn('type', self::USER_TYPES)->latest()->get()
                ->map(fn ($d) => [
                    'id' => $d->id, 'type' => $d->type, 'type_label' => $d->type_label, 'file_name' => $d->file_name,
                    'jamaah' => $d->jamaah?->full_name, 'jamaah_id' => $d->jamaah_id, 'status' => $d->status,
                    'rejection_note' => $d->rejection_note, 'size' => $d->size, 'created_at' => $d->created_at->format('d/m/Y'),
                    'url' => $d->signedUrl(),
                ]),
            'types' => collect(self::USER_TYPES)->mapWithKeys(fn ($t) => [$t => Document::TYPES[$t]]),
        ]);
    }

    public function store(Request $request)
    {
        $u = $request->user();
        $data = $request->validate([
            'type' => ['required', Rule::in(self::USER_TYPES)],
            'jamaah_id' => ['nullable', Rule::exists('jamaah', 'id')->where('user_id', $u->id)],
            'file' => 'required|file|max:5120|mimes:jpg,jpeg,png,pdf',
        ], ['file.max' => 'Ukuran file maksimal 5 MB.', 'file.mimes' => 'Format file harus JPG, PNG, atau PDF.']);

        // Penamaan: {jenis}_{nama-jamaah-atau-pengguna}.ext
        $owner = $u;
        $doc = FileStorage::storeDocument($request->file('file'), $owner, $data['type'], ['jamaah_id' => $data['jamaah_id'] ?? null]);
        Audit::log('dokumen.unggah', "Unggah dokumen {$doc->type_label} ({$doc->file_name})", $doc);
        AdminNotifier::notify('dokumen', 'Dokumen baru menunggu verifikasi', $u->name.' — '.$doc->type_label, route('admin.documents.index'));

        return back()->with('success', 'Dokumen berhasil diunggah dan menunggu verifikasi admin.');
    }

    public function destroy(Request $request, Document $document)
    {
        $this->ensureOwner($document);
        abort_if($document->status === 'diverifikasi', 422, 'Dokumen yang sudah diverifikasi tidak dapat dihapus.');
        Storage::disk($document->disk)->delete($document->path);
        Audit::log('dokumen.hapus', "Menghapus dokumen {$document->file_name}", $document);
        $document->delete();

        return back()->with('success', 'Dokumen dihapus.');
    }
}
