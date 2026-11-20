<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Services\InvoiceService;
use Illuminate\Support\Str;

class InvoiceController extends Controller
{
    public function pdf(Invoice $invoice, InvoiceService $service)
    {
        $this->ensureOwner($invoice);
        $name = ($invoice->type === 'kwitansi' ? 'kwitansi_' : 'invoice_').Str::slug(str_replace('/', '-', $invoice->number)).'.pdf';

        // Ditampilkan inline di tab baru (penampil PDF browser), bukan dipaksa unduh.
        // Chrome memblokir unduhan otomatis dari situs HTTP ("file may have been tampered with");
        // dari penampil PDF, pengguna tetap bisa menyimpan/mencetak dengan nama file yang sama.
        return $service->pdf($invoice)->stream($name);
    }
}
