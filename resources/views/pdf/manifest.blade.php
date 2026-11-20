<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <title>Manifest</title>
    @include('pdf._style')
    <style>table.items td, table.items th { font-size: 8.5px; padding: 5px 4px; }</style>
</head>
<body>
@include('pdf._header')
<h1>MANIFEST JAMAAH</h1>
<div class="muted">{{ $departure->package->name }} — Berangkat {{ $departure->departure_date->translatedFormat('l, d F Y') }}, Pulang {{ $departure->return_date->translatedFormat('d F Y') }}
    · Maskapai {{ $departure->package->airline }} · Total {{ count($rows) }} jamaah</div>
<table class="items">
    <thead><tr>@foreach($headings as $h)<th>{{ $h }}</th>@endforeach</tr></thead>
    <tbody>
    @foreach($rows as $r)
        <tr>@foreach($r as $c)<td>{{ $c }}</td>@endforeach</tr>
    @endforeach
    </tbody>
</table>
<div class="foot">Dicetak {{ now()->translatedFormat('d F Y H:i') }} WIB — Dokumen rahasia, berisi data pribadi jamaah (UU PDP).</div>
</body>
</html>
