<?php

namespace Tests\Feature;

use App\Models\Flight;
use App\Models\FlightOrder;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\User;
use App\Models\VisaApplication;
use App\Models\VisaService;
use App\Services\InvoiceService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/** Filter jenis layanan di Pembayaran & Rekap Penjualan, serta Laporan Invoice (terbaru per pesanan + riwayat). */
class AdminServiceFilterTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private FlightOrder $flightOrder;
    private VisaApplication $visa;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->admin()->create();
        $u = User::factory()->create();
        $flight = Flight::create(['airline' => 'Saudia', 'flight_number' => 'SV 1', 'origin_code' => 'CGK', 'origin_city' => 'Jakarta', 'destination_code' => 'JED', 'destination_city' => 'Jeddah',
            'depart_at' => now()->addMonth(), 'arrive_at' => now()->addMonth()->addHours(9), 'price' => 10000000, 'seats_available' => 10]);
        $this->flightOrder = FlightOrder::create(['code' => 'SAH-T-FLT1', 'user_id' => $u->id, 'flight_id' => $flight->id, 'pax_count' => 2,
            'unit_price' => 10000000, 'total_amount' => 20000000, 'paid_amount' => 5000000, 'status' => 'cicilan_berjalan']);
        $svc = VisaService::create(['name' => 'Visa Umrah', 'price' => 2500000, 'processing_days' => 7]);
        $this->visa = VisaApplication::create(['code' => 'SAH-V-VIS1', 'user_id' => $u->id, 'visa_service_id' => $svc->id, 'pax_count' => 1,
            'status' => 'menunggu_dokumen', 'unit_price' => 2500000, 'total_amount' => 2500000, 'paid_amount' => 2500000]);

        foreach ([[$this->flightOrder, 5000000], [$this->visa, 2500000]] as [$order, $amount]) {
            Payment::create(['code' => 'PAY-'.Str::random(8), 'user_id' => $u->id, 'payable_type' => $order->getMorphClass(), 'payable_id' => $order->id,
                'amount' => $amount, 'method' => 'va_bsi', 'gateway' => 'simulator', 'status' => 'dibayar', 'idempotency_key' => (string) Str::uuid(), 'paid_at' => now()]);
        }
    }

    public function test_filter_layanan_pembayaran_dan_rekap(): void
    {
        $this->actingAs($this->admin)->get(route('admin.payments.index', ['layanan' => 'tiket']))
            ->assertInertia(fn (Assert $p) => $p->has('payments.data', 1)->where('payments.data.0.order', 'SAH-T-FLT1'));
        $this->actingAs($this->admin)->get(route('admin.payments.index'))->assertInertia(fn (Assert $p) => $p->has('payments.data', 2));

        $this->actingAs($this->admin)->get(route('admin.reports.index', ['layanan' => 'visa']))
            ->assertInertia(fn (Assert $p) => $p->where('summary.revenue', 2500000)->where('serviceLabel', 'Visa')->where('summary.new_flights', 0)->has('rows', 1));
        $this->actingAs($this->admin)->get(route('admin.reports.index'))->assertInertia(fn (Assert $p) => $p->where('summary.revenue', 7500000));
        $this->actingAs($this->admin)->get(route('admin.reports.export', ['layanan' => 'tiket', 'format' => 'xlsx']))->assertOk();
    }

    public function test_laporan_invoice_hanya_terbaru_urut_nomor_dengan_riwayat(): void
    {
        $invoices = app(InvoiceService::class);
        $first = $invoices->issueInvoice($this->flightOrder->load('flight'));     // INV/…/0001
        $invoices->issueInvoice($this->visa->load('service'));                       // INV/…/0002
        $r1 = $invoices->revise($this->flightOrder, $invoices->items($this->flightOrder), 'Revisi uji', [], $this->admin); // 0001-R1

        $this->actingAs($this->admin)->get(route('admin.invoices.index'))->assertInertia(fn (Assert $p) => $p
            ->has('invoices.data', 2)
            ->where('invoices.data.0.number', $r1->number)              // urut No. Invoice: 0001-R1 lalu 0002
            ->where('invoices.data.1.number', fn ($n) => str_ends_with($n, '0002'))
            ->has('invoices.data.0.history', 2)
            ->where('invoices.data.0.history.0.number', $first->number) // riwayat: invoice awal → terbaru
            ->where('invoices.data.0.history.1.current', true));

        // ekspor rekap: urut No. Invoice, invoice terbaru per pesanan
        $rows = app(\App\Services\InvoiceReportExport::class)->rows(Invoice::with('invoiceable', 'user')->where('type', 'invoice')->where('status', '!=', 'direvisi')->orderBy('number')->get());
        $this->assertSame([$r1->number, $rows[1]['number']], array_column($rows, 'number'));
        $this->assertSame(2, $rows[0]['qty']);
        $this->assertSame(10000000, $rows[0]['rate']);
        $this->assertSame('-', $rows[0]['paid_off']);                      // tiket belum lunas
        $this->assertNotSame('-', $rows[1]['paid_off']);                   // visa lunas → tanggal pelunasan
        $this->actingAs($this->admin)->get(route('admin.invoices.export', ['format' => 'xlsx']))->assertOk()->assertDownload();
        $this->actingAs($this->admin)->get(route('admin.invoices.export', ['format' => 'pdf', 'layanan' => 'tiket']))->assertOk()->assertHeader('content-type', 'application/pdf');
        $this->actingAs(User::factory()->admin('super_admin', true)->create())->get(route('admin.invoices.export', ['format' => 'xlsx']))->assertOk();

        $this->actingAs($this->admin)->get(route('admin.invoices.index', ['layanan' => 'visa']))
            ->assertInertia(fn (Assert $p) => $p->has('invoices.data', 1)->where('invoices.data.0.service', 'Visa'));
        $this->assertSame(3, Invoice::where('type', 'invoice')->count());
    }
}
