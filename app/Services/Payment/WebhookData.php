<?php

namespace App\Services\Payment;

final class WebhookData
{
    /**
     * @param  string  $status  paid | expired | failed
     */
    public function __construct(
        public readonly string $eventId,
        public readonly string $paymentCode,
        public readonly string $status,
        public readonly int $amount,
        public readonly string $eventType,
        public readonly array $raw,
    ) {}
}
