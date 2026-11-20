<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex">
    <title>Keamanan Rekening — {{ config('app.name') }}</title>
    <style>
        body { font-family: system-ui, -apple-system, Segoe UI, sans-serif; background: #f4f6f4; margin: 0; padding: 24px 16px; color: #1f2937; }
        .card { max-width: 480px; margin: 0 auto; background: #fff; border-radius: 16px; padding: 28px; box-shadow: 0 10px 30px rgba(0,0,0,.06); }
        img { height: 56px; }
        h1 { font-size: 20px; margin: 18px 0 6px; }
        dl { display: grid; grid-template-columns: 120px 1fr; gap: 6px 10px; font-size: 14px; background: #f9fafb; padding: 14px; border-radius: 10px; }
        dt { color: #6b7280; }
        button { width: 100%; padding: 14px; border: 0; border-radius: 10px; font-size: 15px; font-weight: 600; cursor: pointer; margin-top: 18px; color: #fff; }
        .danger { background: #b91c1c; } .ok { background: #0B5D3B; }
        .result { padding: 14px; border-radius: 10px; background: #ecfdf5; color: #065f46; margin-top: 16px; }
        .warn { background: #fef2f2; color: #991b1b; }
    </style>
</head>
<body>
<div class="card">
    <img src="{{ asset('images/logo-sah.png') }}" alt="SAH">
    <h1>Konfirmasi Perubahan Rekening Bank</h1>
    <dl>
        <dt>Bank</dt><dd>{{ $account->bank_name }}</dd>
        <dt>No. Rekening</dt><dd>{{ $account->masked_number }}</dd>
        <dt>Atas nama</dt><dd>{{ $account->account_holder }}</dd>
        <dt>Diajukan oleh</dt><dd>{{ $account->requester?->name }} ({{ $account->requested_ip }})</dd>
        <dt>Status</dt><dd><b>{{ $account->status }}</b></dd>
    </dl>

    @if($result)
        <div class="result {{ str_contains($result, 'DIBLOKIR') || str_contains($result, 'DIBATALKAN') || str_contains($result, 'tidak valid') ? 'warn' : '' }}">{{ $result }}</div>
    @elseif($account->status === 'pending_verification')
        <form method="POST" action="{{ $action }}">
            @csrf
            @if($decision === 'approve')
                <p>Anda akan <b>MENYETUJUI</b> rekening ini sebagai rekening resmi perusahaan.</p>
                <button class="ok" type="submit">Ya, saya setujui</button>
            @else
                <p>Anda akan <b>MEMBATALKAN</b> perubahan ini. Rekening baru akan langsung diblokir & dimatikan, dan akun admin pengaju dinonaktifkan.</p>
                <button class="danger" type="submit">Batalkan & Blokir Sekarang</button>
            @endif
        </form>
    @else
        <div class="result">Permintaan ini sudah diproses sebelumnya.</div>
    @endif
</div>
</body>
</html>
