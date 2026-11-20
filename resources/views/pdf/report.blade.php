<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <title>Laporan Keuangan</title>
    @include('pdf._style')
</head>
<body>
@include('pdf._header')
@php($rp = fn ($n) => 'Rp'.number_format((int) $n, 0, ',', '.'))
<h1>LAPORAN KEUANGAN</h1>
<div class="muted">Periode {{ \Carbon\Carbon::parse($period['dari'])->translatedFormat('d F Y') }} s/d {{ \Carbon\Carbon::parse($period['sampai'])->translatedFormat('d F Y') }}</div>

<table class="items">
    <tr><td>Total pemasukan</td><td class="right"><b>{{ $rp($summary['revenue']) }}</b></td><td>Jumlah transaksi</td><td class="right">{{ $summary['transactions'] }}</td></tr>
    <tr><td>Refund dibayarkan</td><td class="right">{{ $rp($summary['refunds']) }}</td><td>Piutang cicilan berjalan</td><td class="right">{{ $rp($summary['receivable']) }}</td></tr>
    <tr><td>Booking umrah baru</td><td class="right">{{ $summary['new_bookings'] }} ({{ $summary['jamaah'] }} jamaah)</td><td>Order tiket / visa baru</td><td class="right">{{ $summary['new_flights'] }} / {{ $summary['new_visas'] }}</td></tr>
</table>

<table style="width:100%; margin-top:10px"><tr>
    <td style="width:50%; vertical-align:top; padding-right:6px">
        <table class="items"><thead><tr><th>Layanan</th><th class="right">Trx</th><th class="right">Total</th></tr></thead>
            @foreach($byService as $s)<tr><td>{{ $s['service'] }}</td><td class="right">{{ $s['count'] }}</td><td class="right">{{ $rp($s['total']) }}</td></tr>@endforeach
        </table>
    </td>
    <td style="vertical-align:top; padding-left:6px">
        <table class="items"><thead><tr><th>Metode</th><th class="right">Trx</th><th class="right">Total</th></tr></thead>
            @foreach($byMethod as $m)<tr><td>{{ $m['method'] }}</td><td class="right">{{ $m['count'] }}</td><td class="right">{{ $rp($m['total']) }}</td></tr>@endforeach
        </table>
    </td>
</tr></table>

<p style="margin-top:12px"><b>Rincian Transaksi</b></p>
<table class="items">
    <thead><tr><th>Tanggal</th><th>Kode</th><th>Pesanan</th><th>Layanan</th><th>Pelanggan</th><th>Metode</th><th class="right">Nominal</th></tr></thead>
    @foreach($rows as $r)
        <tr><td>{{ $r['tanggal'] }}</td><td>{{ $r['kode'] }}</td><td>{{ $r['pesanan'] }}</td><td>{{ $r['layanan'] }}</td><td>{{ $r['pelanggan'] }}</td><td>{{ $r['metode'] }}</td><td class="right">{{ $rp($r['nominal']) }}</td></tr>
    @endforeach
</table>
<div class="foot">Dicetak {{ now()->translatedFormat('d F Y H:i') }} WIB oleh {{ auth()->user()?->name }}</div>
</body>
</html>
