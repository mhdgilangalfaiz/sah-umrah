<?php

return [
    // Email pemilik yang menerima peringatan perubahan rekening (HANYA dari .env, tidak dapat diubah via web)
    'owner_email' => env('FINANCE_OWNER_EMAIL', 'owner@example.com'),
    // Kunci HMAC untuk segel integritas data rekening
    'integrity_key' => env('FINANCE_INTEGRITY_KEY', ''),
    // Batas waktu persetujuan (jam) sebelum otomatis diblokir
    'approval_hours' => (int) env('FINANCE_APPROVAL_HOURS', 24),
];
