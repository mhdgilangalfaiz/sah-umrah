<?php

namespace App\Services\Payment;

final class ChargeResult
{
    public function __construct(
        public readonly ?string $gatewayId,
        public readonly ?string $vaNumber = null,
        public readonly ?string $qrString = null,
        public readonly array $raw = [],
    ) {}
}
