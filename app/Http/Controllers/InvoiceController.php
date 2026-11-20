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

        return $service->pdf($invoice)->download($name);
    }
}
