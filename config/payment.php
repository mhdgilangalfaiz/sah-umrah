<?php

return [
    /*
    | Payment gateway: 'xendit' (sandbox/production) atau 'simulator' (lokal, tanpa kunci API).
    | Xendit dipilih karena mendukung VA Mandiri, BSI, Muamalat dan QRIS dalam satu integrasi.
    */
    'gateway' => env('PAYMENT_GATEWAY', 'simulator'),

    // Hanya metode ini yang diizinkan
    'methods' => ['va_mandiri', 'va_bsi', 'va_muamalat', 'qris'],

    // Kode bank Xendit untuk Fixed Virtual Account (cek ketersediaan di dashboard Xendit Anda)
    'bank_codes' => [
        'va_mandiri' => env('XENDIT_BANK_MANDIRI', 'MANDIRI'),
        'va_bsi' => env('XENDIT_BANK_BSI', 'BSI'),
        'va_muamalat' => env('XENDIT_BANK_MUAMALAT', 'MUAMALAT'),
    ],

    'xendit' => [
        'secret_key' => env('XENDIT_SECRET_KEY'),
        'callback_token' => env('XENDIT_CALLBACK_TOKEN'), // dibandingkan dengan header x-callback-token
        'base_url' => env('XENDIT_BASE_URL', 'https://api.xendit.co'),
        'is_production' => env('XENDIT_IS_PRODUCTION', false),
    ],

    'simulator' => [
        // secret untuk menandatangani webhook simulasi (HMAC-SHA256)
        'secret' => env('PAYMENT_SIMULATOR_SECRET', 'local-simulator-secret'),
    ],

    // Masa berlaku VA/QRIS (jam)
    'expiry_hours' => (int) env('PAYMENT_EXPIRY_HOURS', 24),

    // Kursi paket ditahan selama X jam menunggu deposit/pelunasan pertama
    'seat_hold_hours' => (int) env('SEAT_HOLD_HOURS', 24),

    // Tiket pesawat: batas bayar (jam)
    'flight_hold_hours' => (int) env('FLIGHT_HOLD_HOURS', 3),

    // Tiket pesawat: DP minimum pembayaran pertama (% dari total), sisa dicicil sampai lunas
    'flight_min_dp_percent' => (int) env('FLIGHT_MIN_DP_PERCENT', 30),

    // Tiket pesawat: batas pelunasan H-X sebelum keberangkatan
    'flight_settlement_days' => (int) env('FLIGHT_SETTLEMENT_DAYS', 14),

    // Deposit awal umrah dihitung per jamaah (true) atau per pesanan (false). Nominal diatur per paket (default 3jt).
    'deposit_per_pax' => (bool) env('DEPOSIT_PER_PAX', true),

    // Minimal nominal tiap pembayaran cicilan setelah deposit
    'min_installment_amount' => (int) env('MIN_INSTALLMENT_AMOUNT', 500000),

    // Batas pelunasan: H-30 sebelum keberangkatan
    'settlement_days_before_departure' => (int) env('SETTLEMENT_DAYS_BEFORE_DEPARTURE', 30),

    // Maksimal jumlah termin (di luar deposit) pada jadwal cicilan yang disarankan
    'max_terms' => 6,
];
