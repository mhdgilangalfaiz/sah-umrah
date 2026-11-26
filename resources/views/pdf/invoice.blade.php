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
                    <b>{{ $bill['company'] ?: $bill['name'] }}</b><br>
                    @if($bill['address']){{ $bill['address'] }}<br>@endif
                    {{ $bill['email'] }}<br>
                    {{ $bill['phone'] }}
                @else
                    <b>{{ $invoice->user->name }}</b><br>
                    {{ $invoice->user->email }}<br>
                    {{ $invoice->user->phone }}
                @endif
            </div>
        </td>
    </tr>
</table>

<table class="items">
    <thead><tr><th class="center" style="width:5%">No</th><th class="center">Keterangan</th><th class="center" style="width:8%">Qty</th><th class="center" style="width:18%">Harga</th><th class="center" style="width:18%">Jumlah</th></tr></thead>
    <tbody>
    @foreach($invoice->items ?? [] as $i => $item)
        <tr>
            <td>{{ $i + 1 }}</td>
            <td style="line-height:1.45">{!! nl2br(e($item['description'])) !!}</td>
            <td class="right">{{ $item['qty'] }}</td>
            <td class="right">{{ $rp($item['price']) }}</td>
            <td class="right">{{ $rp($item['total']) }}</td>
        </tr>
    @endforeach
    <tr><td colspan="4" class="right"><b>{{ $invoice->type === 'kwitansi' ? 'TELAH DITERIMA' : 'TOTAL TAGIHAN' }}</b></td><td class="right"><b>{{ $rp($invoice->amount) }}</b></td></tr>
    </tbody>
</table>

@if($invoice->type === 'invoice' && $payable)
    @php($received = array_sum(array_column($history, 'amount')))
    @php($percent = $invoice->amount > 0 ? min(100, (int) round($received / $invoice->amount * 100)) : 0)
    @php($num = fn ($n) => number_format((int) $n, 0, ',', '.'))
    <p style="margin:16px 0 4px"><b>RIWAYAT PEMBAYARAN</b></p>
    <table class="grid">
        <thead><tr><th style="width:20%">Tanggal Pembayaran</th><th style="width:27%">Jenis Pembayaran</th><th>Keterangan</th><th colspan="2" style="width:24%">Total Pembayaran</th></tr></thead>
        <tbody>
        @forelse($history as $h)
            <tr><td class="center">{{ $h['date'] }}</td><td class="center">{{ mb_strtoupper($h['type']) }}</td><td class="center">{{ mb_strtoupper($h['info']) }}</td><td class="rp">Rp</td><td class="right">{{ $num($h['amount']) }}</td></tr>
        @empty
            <tr><td colspan="5" class="center muted">Belum ada pembayaran.</td></tr>
        @endforelse
        </tbody>
    </table>
    <table style="width:100%; margin-top:6px">
        <tr><td class="right" style="width:76%"><b>TOTAL :</b></td><td class="rp" style="border:0"><b>Rp</b></td><td class="right" style="width:18%"><b>{{ $num($received) }}</b></td></tr>
        <tr><td class="right"><b>PERSENTASE :</b></td><td></td><td class="right"><b>{{ $percent }}%</b></td></tr>
    </table>

    <table class="grid summary">
        <tr><td class="label">TOTAL TAGIHAN</td><td class="rp">Rp</td><td class="right">{{ $num($invoice->amount) }}</td></tr>
        <tr><td class="label">TOTAL DIBAYAR</td><td class="rp">Rp</td><td class="right">{{ $num($received) }}</td></tr>
        <tr class="due"><td class="label">SISA TAGIHAN</td><td class="rp"><b>Rp</b></td><td class="right"><b>{{ $num(max(0, $invoice->amount - $received)) }}</b></td></tr>
    </table>
@endif

@if($invoice->type === 'invoice' && ($invoice->revision > 0 || $invoice->notes))
    <div class="box" style="margin-top:12px; border-color:#C9A24B; background:#FFFBEB">
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

@if($payable instanceof \App\Models\Booking && $payable->payment_scheme === 'cicilan' && $payable->payment_deadline && $invoice->type === 'invoice')
    <p style="margin-top:12px">Cicilan bebas (kapan saja &amp; berapa kali saja). <b>Batas pelunasan: {{ $payable->payment_deadline->translatedFormat('d F Y') }}</b>
        (H-{{ (int) config('payment.settlement_days_before_departure', 40) }} sebelum keberangkatan {{ $payable->departure->departure_date->translatedFormat('d F Y') }}).</p>
@endif

<table style="width:100%; margin-top:26px">
    <tr>
        <td style="width:60%"></td>
        <td style="text-align:center">
            @if($invoice->display_status === 'lunas')<span class="stamp paid">LUNAS</span>
            @elseif($invoice->display_status === 'batal')<span class="stamp void">BATAL</span>
            @else<span class="stamp unpaid">BELUM LUNAS</span>@endif
        </td>
    </tr>
</table>

@if($invoice->type === 'invoice' && count($terms ?? []))
    <div class="terms">
        @foreach($terms as $t)
            @if($t['kind'] === 'blank')<div style="height:5px"></div>
            @elseif($t['kind'] === 'heading')<div class="terms-h">{{ $t['text'] }}</div>
            @elseif($t['kind'] === 'bullet')<div class="terms-b">&bull; {{ $t['text'] }}</div>
            @else<div>{{ $t['text'] }}</div>@endif
        @endforeach
    </div>
@endif

</body>
</html>
