<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <title>{{ $invoice->number }}</title>
    @include('pdf._style')
</head>
<body>
@include('pdf._header')
@php($rp = fn ($n) => 'Rp'.number_format((int) $n, 0, ',', '.'))
<table style="width:100%">
    <tr>
        <td style="width:55%; vertical-align:top">
            <h1>{{ $invoice->type === 'kwitansi' ? 'KWITANSI' : 'INVOICE' }}</h1>
            <div class="muted">No. <b>{{ $invoice->number }}</b></div>
            <div class="muted">Tanggal: {{ $invoice->issued_at->translatedFormat('d F Y H:i') }} WIB</div>
            @if($payable)<div class="muted">Kode Pesanan: <b>{{ $payable->code }}</b></div>@endif
            @if($invoice->payment)<div class="muted">Kode Transaksi: {{ $invoice->payment->code }} ({{ $invoice->payment->method_label }})</div>@endif
        </td>
        <td style="vertical-align:top">
            <div class="box">
                <div class="muted" style="font-size:9px">DITAGIHKAN KEPADA</div>
                @php($bill = $payable && method_exists($payable, 'billTo') ? $payable->billTo() : null)
                @if($bill)
                    @if($bill['company'])
                        <b>{{ $bill['company'] }}</b><br>
                        u.p. {{ $bill['name'] }}<br>
                    @else
                        <b>{{ $bill['name'] }}</b><br>
                    @endif
                    @if($bill['address']){{ $bill['address'] }}<br>@endif
                    Kode Pelanggan: {{ $invoice->user->customer_code }}<br>
                    {{ $bill['email'] }}<br>
                    {{ $bill['phone'] }}
                @else
                    <b>{{ $invoice->user->name }}</b><br>
                    Kode Pelanggan: {{ $invoice->user->customer_code }}<br>
                    {{ $invoice->user->email }}<br>
                    {{ $invoice->user->phone }}
                @endif
            </div>
        </td>
    </tr>
</table>

@if($invoice->type === 'invoice' && ($invoice->revision > 0 || $invoice->notes))
    <div class="box" style="margin-top:10px; border-color:#C9A24B; background:#FFFBEB">
        <b>{{ $invoice->revision > 0 ? 'INVOICE REVISI KE-'.$invoice->revision : 'CATATAN INVOICE' }}</b>
        @if($invoice->replaces) — menggantikan invoice No. {{ $invoice->replaces->number }} @endif
        @if($invoice->notes)<br>Keterangan: {{ $invoice->notes }}@endif
        @if(isset($invoice->details['seats_before']) && $invoice->details['seats_before'] !== $invoice->details['seats_after'])
            <br>Seat terpakai: {{ $invoice->details['seats_before'] }} → <b>{{ $invoice->details['seats_after'] }} seat</b>
        @endif
        @if(($invoice->details['refund'] ?? 0) > 0)
            <br>Kelebihan bayar dikembalikan: <b>{{ $rp($invoice->details['refund']) }}</b>
        @endif
    </div>
@endif

@if(! empty($invoice->details['flight']))
    @php($fl = $invoice->details['flight'])
    <p style="margin:12px 0 4px"><b>Detail Penerbangan</b></p>
    <table class="items">
        <thead><tr><th>Maskapai</th><th>No. Flight</th><th>Rute</th><th>Berangkat</th><th>Kembali</th><th>PNR</th></tr></thead>
        <tr>
            <td>{{ $fl['airline'] ?? '-' }}</td><td>{{ $fl['flight_number'] ?? '-' }}</td><td>{{ $fl['route'] ?? '-' }}</td>
            <td>{{ $fl['depart'] ?? '-' }}</td><td>{{ $fl['return'] ?? '-' }}</td><td>{{ $fl['pnr'] ?? '-' }}</td>
        </tr>
    </table>
@endif

<table class="items">
    <thead><tr><th style="width:5%">No</th><th>Keterangan</th><th class="right" style="width:8%">Qty</th><th class="right" style="width:18%">Harga</th><th class="right" style="width:18%">Jumlah</th></tr></thead>
    <tbody>
    @foreach($invoice->items ?? [] as $i => $item)
        <tr>
            <td>{{ $i + 1 }}</td>
            <td>{{ $item['description'] }}</td>
            <td class="right">{{ $item['qty'] }}</td>
            <td class="right">{{ $rp($item['price']) }}</td>
            <td class="right">{{ $rp($item['total']) }}</td>
        </tr>
    @endforeach
    <tr><td colspan="4" class="right"><b>{{ $invoice->type === 'kwitansi' ? 'TELAH DITERIMA' : 'TOTAL TAGIHAN' }}</b></td><td class="right"><b>{{ $rp($invoice->amount) }}</b></td></tr>
    @if($invoice->type === 'invoice' && $payable)
        <tr><td colspan="4" class="right">Total dibayar</td><td class="right">{{ $rp($paid) }}</td></tr>
        <tr><td colspan="4" class="right gold"><b>Sisa tagihan</b></td><td class="right gold"><b>{{ $rp($outstanding) }}</b></td></tr>
    @endif
    </tbody>
</table>

@if($invoice->type === 'kwitansi')
    <p style="margin-top:14px">Terbilang: <i>{{ ucwords(\App\Support\Terbilang::make((int) $invoice->amount)) }} Rupiah</i></p>
@endif

@if($payable instanceof \App\Models\Booking && $payable->installments->count() > 1)
    <p style="margin-top:14px"><b>Jadwal Cicilan</b> (batas pelunasan {{ $payable->payment_deadline?->translatedFormat('d F Y') }})</p>
    <table class="items">
        <thead><tr><th>Termin</th><th>Jatuh Tempo</th><th class="right">Nominal</th><th class="right">Dibayar</th><th>Status</th></tr></thead>
        @foreach($payable->installments as $inst)
            <tr><td>{{ $inst->label }}</td><td>{{ $inst->due_date->translatedFormat('d M Y') }}</td><td class="right">{{ $rp($inst->amount) }}</td><td class="right">{{ $rp($inst->paid_amount) }}</td><td>{{ ucwords(str_replace('_', ' ', $inst->status)) }}</td></tr>
        @endforeach
    </table>
@endif

<table style="width:100%; margin-top:26px">
    <tr>
        <td style="width:60%; font-size:9px" class="muted">
            Pembayaran hanya melalui sistem resmi (Virtual Account Mandiri/BSI/Muamalat atau QRIS) yang diterbitkan di akun Anda.
            PT. Sumatera Andalan Haramain tidak pernah meminta transfer ke rekening pribadi.
        </td>
        <td style="text-align:center">
            @if($invoice->status === 'lunas')<span class="stamp paid">LUNAS</span>
            @elseif($invoice->status === 'batal')<span class="stamp void">BATAL</span>
            @elseif($invoice->status === 'direvisi')<span class="stamp void">DIREVISI</span>
            @else<span class="stamp unpaid">BELUM LUNAS</span>@endif
        </td>
    </tr>
</table>

<div class="foot">Dokumen ini dibuat otomatis oleh sistem {{ $company['company_name'] }} dan sah tanpa tanda tangan basah.</div>
</body>
</html>
