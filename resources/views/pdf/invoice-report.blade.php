<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <title>Laporan Invoice</title>
    @include('pdf._style')
    <style>
        @page { size: A4 landscape; }
        table.rekap { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 9.5px; }
        table.rekap th { background: #0B5D3B; color: #fff; padding: 6px 5px; text-align: center; border: 1px solid #0B5D3B; font-size: 9px; }
        table.rekap td { padding: 5px; border: 1px solid #9ca3af; }
        table.rekap td.c { text-align: center; }
        table.rekap td.rp { border-right: 0; width: 14px; }
        table.rekap td.rp + td { border-left: 0; text-align: right; }
        table.rekap tr.total td { border: 0; font-weight: bold; }
    </style>
</head>
<body>
@include('pdf._header')
@php($num = fn ($n) => number_format((int) $n, 0, ',', '.'))
<h1>LAPORAN INVOICE</h1>
<div class="muted">{{ $subtitle }}</div>

<table class="rekap">
    <thead>
        <tr>
            <th style="width:16%">INV NO</th><th>PEMBELI</th><th style="width:10%">KEBERANGKATAN</th><th style="width:7%">QTY</th>
            <th colspan="2" style="width:12%">HARGA SATUAN</th><th colspan="2" style="width:13%">TOTAL</th>
            <th style="width:11%">TANGGAL INVOICE</th><th style="width:11%">TANGGAL LUNAS</th>
        </tr>
    </thead>
    <tbody>
    @forelse($rows as $r)
        <tr>
            <td class="c">{{ $r['number'] }}</td>
            <td>{{ $r['buyer'] }}</td>
            <td class="c">{{ $r['departure'] }}</td>
            <td class="c">{{ $r['qty'] }} PAX</td>
            <td class="rp">Rp</td><td>{{ $num($r['rate']) }}</td>
            <td class="rp">Rp</td><td>{{ $num($r['total']) }}</td>
            <td class="c">{{ $r['issued'] }}</td>
            <td class="c">{{ $r['paid_off'] }}</td>
        </tr>
    @empty
        <tr><td colspan="10" class="c muted">Tidak ada invoice pada periode ini.</td></tr>
    @endforelse
    @if(count($rows))
        <tr class="total">
            <td colspan="5" style="text-align:right">TOTAL :</td>
            <td></td><td>Rp</td><td style="text-align:right">{{ $num(array_sum(array_column($rows, 'total'))) }}</td><td colspan="2"></td>
        </tr>
    @endif
    </tbody>
</table>
<div class="foot">Dicetak {{ now()->translatedFormat('d F Y H:i') }} WIB oleh {{ auth()->user()?->name }}</div>
</body>
</html>
