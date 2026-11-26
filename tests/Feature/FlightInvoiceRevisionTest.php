<?php

namespace Tests\Feature;

use App\Models\Flight;
use App\Models\FlightOrder;
use App\Models\Invoice;
use App\Models\Refund;
use App\Models\User;
use App\Services\InvoiceService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

/** Revisi invoice pesanan tiket oleh admin (seat terpakai berkurang/bertambah, detail flight berubah). */
class FlightInvoiceRevisionTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $customer;
    private Flight $flight;

    protected function setUp(): void
    {
        parent::setUp();
        Notification::fake();
        $this->admin = User::factory()->admin()->create();
        $this->customer = User::factory()->create();
        $this->flight = Flight::create([
            'airline' => 'Batik Air Malaysia', 'flight_number' => 'OD 361', 'origin_code' => 'KNO', 'origin_city' => 'Medan',
            'destination_code' => 'JED', 'destination_city' => 'Jeddah', 'depart_at' => now()->addMonth(), 'arrive_at' => now()->addMonth()->addHours(13),
            'price' => 1000000, 'seats_available' => 10,
        ]);
    }

    /** Pesanan 30 seat @ Rp1.000.000 yang sudah lunas, dengan invoice otomatis */
    private function paidOrder(string $status = 'dibayar'): FlightOrder
    {
        $order = FlightOrder::create([
            'code' => FlightOrder::generateCode('T'), 'user_id' => $this->customer->id, 'flight_id' => $this->flight->id,
            'pax_count' => 30, 'unit_price' => 1000000, 'total_amount' => 30000000, 'paid_amount' => 30000000, 'status' => $status,
        ]);
        app(InvoiceService::class)->issueInvoice($order)->update(['status' => 'lunas']);

        return $order;
    }

    private function payload(array $override = []): array
    {
        return array_merge([
            'seats' => 28, 'unit_price' => 1000000, 'extras' => [],
            'flight' => ['airline' => 'Batik Air Malaysia', 'flight_number' => 'OD 361', 'route' => 'KNO → JED', 'depart' => '29 Nov 2026 08:10', 'return' => '', 'pnr' => ''],
            'reason' => '2 seat dibatalkan karena alasan mendesak.', 'adjust_stock' => true,
        ], $override);
    }

    public function test_seat_berkurang_setelah_lunas_terbit_invoice_revisi_dan_refund(): void
    {
        $order = $this->paidOrder();
        $old = $order->activeInvoice();

        $this->actingAs($this->admin)->post(route('admin.flight-orders.revise', $order), $this->payload())->assertSessionHasNoErrors();

        $order->refresh();
        $this->assertSame(28, $order->pax_count);
        $this->assertSame(28000000, $order->total_amount);
        $this->assertSame(28000000, $order->paid_amount); // kelebihan Rp2 juta dikembalikan
        $this->assertSame(0, $order->outstandingAmount());

        // invoice lama tetap ada sebagai riwayat, invoice baru bernomor -R1
        $this->assertSame('direvisi', $old->fresh()->status);
        $new = $order->activeInvoice();
        $this->assertSame($old->number.'-R1', $new->number);
        $this->assertSame(1, $new->revision);
        $this->assertSame('lunas', $new->status);
        $this->assertSame(28000000, $new->amount);
        $this->assertSame($old->id, $new->replaces_id);
        $this->assertSame(28, $new->items[0]['qty']);

        // refund tercatat (disetujui) & seat batal kembali ke stok penerbangan
        $refund = Refund::where('refundable_id', $order->id)->first();
        $this->assertSame(2000000, (int) $refund->approved_amount);
        $this->assertSame('disetujui', $refund->status);
        $this->assertSame(12, $this->flight->fresh()->seats_available);

        // revisi kedua → -R2, nomor invoice berikutnya tidak terganggu nomor revisi
        $this->actingAs($this->admin)->post(route('admin.flight-orders.revise', $order), $this->payload(['seats' => 27]))->assertSessionHasNoErrors();
        $this->assertSame($old->number.'-R2', $order->activeInvoice()->number);
        $this->assertStringEndsWith('0002', Invoice::nextNumber('invoice'));
    }

    public function test_tambah_seat_setelah_tiket_terbit_sisa_tagihan_bisa_dibayar_tanpa_turun_status(): void
    {
        $order = $this->paidOrder('tiket_terbit');

        $this->actingAs($this->admin)->post(route('admin.flight-orders.revise', $order), $this->payload([
            'seats' => 31, 'adjust_stock' => false, 'extras' => [['description' => 'Biaya reissue', 'qty' => 1, 'price' => 250000]],
        ]))->assertSessionHasNoErrors();

        $order->refresh();
        $this->assertSame(31250000, $order->total_amount);
        $this->assertSame(1250000, $order->outstandingAmount());
        $this->assertTrue($order->canBePaid());
        $this->assertSame('belum_lunas', $order->activeInvoice()->status);
        $this->assertSame(10, $this->flight->fresh()->seats_available); // stok tidak disentuh

        // pelunasan sisa tagihan tidak menurunkan status tiket_terbit
        $order->applyPayment(new \App\Models\Payment(['amount' => 1250000]));
        $this->assertSame('tiket_terbit', $order->fresh()->status);
        $this->assertSame(0, $order->fresh()->outstandingAmount());
    }

    public function test_detail_flight_berubah_tampil_di_invoice_dan_pdf(): void
    {
        $order = $this->paidOrder();

        $this->actingAs($this->admin)->post(route('admin.flight-orders.revise', $order), $this->payload([
            'seats' => 30, 'flight' => ['airline' => 'Batik Air Malaysia', 'flight_number' => 'OD 363', 'route' => 'KNO → KUL → JED', 'depart' => '30 Nov 2026 10:00', 'return' => '', 'pnr' => 'abc123'],
            'reason' => 'Jadwal diubah maskapai ke OD 363.',
        ]))->assertSessionHasNoErrors();

        $order->refresh();
        $details = $order->flightDetails();
        $this->assertSame('OD 363', $details['flight_number']);
        $this->assertSame('ABC123', $order->pnr);
        $this->assertSame('OD 361', $this->flight->fresh()->flight_number); // jadwal mitra tidak berubah
        $this->assertSame(30000000, $order->total_amount);
        $this->assertSame(0, Refund::count());

        $this->actingAs($this->admin)->get(route('invoices.pdf', $order->activeInvoice()))->assertOk();
        $this->actingAs($this->admin)->get(route('admin.flight-orders.show', $order))->assertOk();
    }

    public function test_keterangan_tiket_dan_syarat_ketentuan_bisa_diubah(): void
    {
        $order = $this->paidOrder();

        // invoice awal: keterangan format jadwal tiket & S&K bawaan
        $first = $order->activeInvoice();
        $this->assertMatchesRegularExpression('/^OD361 \d{2}[A-Z]{3} KNOJED \d{4} \d{4}$/', $first->items[0]['description']);
        $this->assertStringContainsString('Ketentuan Booking', $order->invoiceTerms());

        $this->actingAs($this->admin)->post(route('admin.flight-orders.revise', $order), $this->payload([
            'seats' => 30,
            'ticket_description' => "OD323 04AUG KNOKUL 1025 1235\nOD705 04AUG KULJED 1820 2315\nPNR : YWQLLY / 17 PAX",
            'extras' => [['description' => "OD357 04AUG BTHKUL 1100 1310\nPNR : QFNCBN / 09 PAX", 'qty' => 10, 'price' => 1000000]],
            'terms' => "SYARAT & KETENTUAN\nA. Ketentuan Uji\n1. Contoh ketentuan.\n- butir",
            'reason' => 'Tambah grup kedua & ubah S&K.',
        ]))->assertSessionHasNoErrors();

        $inv = $order->fresh()->activeInvoice();
        $this->assertStringStartsWith('OD323 04AUG', $inv->items[0]['description']);
        $this->assertStringContainsString("\nPNR : QFNCBN", $inv->items[1]['description']);
        $this->assertSame("SYARAT & KETENTUAN\nA. Ketentuan Uji\n1. Contoh ketentuan.\n- butir", $inv->details['terms']);
        $this->assertSame(['heading', 'heading', 'text', 'bullet'], array_column(\App\Support\InvoiceTerms::lines($inv->details['terms']), 'kind'));
        $this->actingAs($this->admin)->get(route('invoices.pdf', $inv))->assertOk();

        // revisi berikutnya tanpa mengirim S&K → S&K terakhir tetap dipakai
        $this->actingAs($this->admin)->post(route('admin.flight-orders.revise', $order), array_diff_key($this->payload(['seats' => 30]), ['terms' => 1]))->assertSessionHasNoErrors();
        $this->assertStringContainsString('Ketentuan Uji', $order->fresh()->invoiceTerms());
    }

    public function test_validasi_dan_hak_akses(): void
    {
        $order = $this->paidOrder();
        $url = route('admin.flight-orders.revise', $order);

        // Super Admin hanya melihat, tidak bisa merevisi
        $this->actingAs(User::factory()->admin('super_admin', true)->create())->post($url, $this->payload())->assertForbidden();
        // pelanggan tidak bisa
        $this->actingAs($this->customer)->post($url, $this->payload())->assertForbidden();
        // alasan wajib; potongan tidak boleh membuat total negatif
        $this->actingAs($this->admin)->post($url, $this->payload(['reason' => '']))->assertSessionHasErrors('reason');
        $this->actingAs($this->admin)->post($url, $this->payload(['extras' => [['description' => 'Potongan', 'qty' => 1, 'price' => -30000000]]]))->assertSessionHasErrors('extras');
        // menambah seat melebihi stok penerbangan ditolak
        $this->actingAs($this->admin)->post($url, $this->payload(['seats' => 45]))->assertSessionHasErrors('seats');

        $this->assertSame(30, $order->fresh()->pax_count);
        $this->assertSame(1, Invoice::count());
    }
}
