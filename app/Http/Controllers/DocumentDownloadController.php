<?php

namespace App\Http\Controllers;

use App\Models\Document;
use App\Services\FileStorage;
use App\Support\Audit;

/** Unduhan file privat: wajib login + signed URL berbatas waktu + pemilik/admin. Konten didekripsi on-the-fly. */
class DocumentDownloadController extends Controller
{
    public function __invoke(Document $document)
    {
        $this->ensureOwner($document);
        $content = FileStorage::readPrivate($document->path, $document->is_encrypted, $document->disk);

        if (auth()->user()->isAdmin()) {
            Audit::log('dokumen.unduh', "Mengunduh dokumen {$document->file_name}", $document);
        }

        return response($content, 200, [
            'Content-Type' => $document->mime ?: 'application/octet-stream',
            'Content-Disposition' => 'attachment; filename="'.$document->file_name.'"',
            'Cache-Control' => 'private, no-store',
        ]);
    }
}
