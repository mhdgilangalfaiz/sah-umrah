<?php

namespace Tests\Feature;

use App\Models\Flight;
use App\Models\FlightOrder;
use App\Models\Payment;
use App\Models\User;
use App\Services\Flights\FlightManifest;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Tests\TestCase;

/** Pemesanan seat grup oleh agen: pilih jumlah seat → invoice atas nama travel → DP & cicilan → unggah manifest Excel. */
class FlightGroupOrderTest extends TestCase
{
    use RefreshDatabase;

    private User $agent;
    private Flight $flight;

    protected function setUp(): void
    {
        parent::setUp();
        Notification::fake();
        Storage::fake('local');
        config(['filesystems.private_disk' => 'local']);
        $this->agent = User::factory()->create();
        $this->flight = Flight::create([
            'airline' => 'Batik Air Malaysia', 'flight_number' => 'OD 361', 'origin_code' => 'KNO', 'origin_city' => 'Medan',
            'destination_code' => 'JED', 'destination_city' => 'Jeddah', 'depart_at' => now()->addMonths(3), 'arrive_at' => now()->addMonths(3)->addHours(13),
            'price' => 10000000, 'seats_available' => 45,
        ]);
    }

    private function order(array $override = [])
    {
        return $this->actingAs($this->agent)->post(route('checkout.flight.store'), array_merge([
            'flight_id' => $this->flight->id, 'seats' => 30, 'buyer_type' => 'agen',
            'bill_company' => 'PT. Contoh Travel Umrah', 'bill_name' => 'Budi Santoso', 'bill_address' => 'Jl. Merdeka 1, Medan',
            'contact_email' => 'ops@contoh-travel.test', 'contact_phone' => '081200000000', 'agree' => true,
        ], $override));
    }

    private function pay(FlightOrder $order, int $amount): void
    {
        $order->refresh()->applyPayment(new Payment(['amount' => $amount]));
    }

    public function test_agen_memesan_30_seat_tanpa_data_penumpang_stok_langsung_berkurang(): void
    {
        $this->order()->assertSessionHasNoErrors()->assertRedirect();

        $order = FlightOrder::firstOrFail();
        $this->assertSame(30, $order->pax_count);
        $this->assertSame(300000000, $order->total_amount);
        $this->assertSame('agen', $order->buyer_type);
        $this->assertSame(0, $order->passengers()->count());
        $this->assertSame(15, $this->flight->fresh()->seats_available); // 45 - 30 → tidak bisa dobel order
        $this->assertSame(90000000, $order->minimumPayment()); // DP 30%
        $this->assertTrue($order->allowsCustomAmount());

        // invoice atas nama travel
        $invoice = $order->activeInvoice();
        $this->assertSame('PT. Contoh Travel Umrah', $order->billTo()['company']);
        $this->actingAs($this->agent)->get(route('invoices.pdf', $invoice))->assertOk();

        // agen lain ingin 30 seat juga → sisa hanya 15, ditolak
        $this->order(['seats' => 30])->assertSessionHasErrors('seats');
        $this->assertSame(15, $this->flight->fresh()->seats_available);
        $this->assertSame(1, FlightOrder::count());
    }

    public function test_perorangan_cukup_nama_pemesan_dan_agen_wajib_nama_travel(): void
    {
        $this->order(['bill_company' => ''])->assertSessionHasErrors('bill_company');

        $this->order(['buyer_type' => 'perorangan', 'bill_company' => 'diabaikan', 'bill_name' => 'Keluarga Jaya', 'seats' => 3])->assertSessionHasNoErrors();
        $order = FlightOrder::firstOrFail();
        $this->assertNull($order->bill_company);
        $this->assertSame(3, $order->pax_count);
        $this->assertSame(42, $this->flight->fresh()->seats_available);
    }

    public function test_dp_mengunci_seat_cicilan_sampai_lunas_lalu_manifest(): void
    {
        $this->order();
        $order = FlightOrder::firstOrFail();
        $url = route('customer.flight-orders.manifest', $order);
        $file = $this->manifestFile($order, 30);

        // manifest belum bisa diunggah sebelum lunas
        $this->actingAs($this->agent)->post($url, ['file' => $file])->assertSessionHas('error');

        $this->pay($order, 90000000); // DP
        $this->assertSame('cicilan_berjalan', $order->fresh()->status);
        $this->assertTrue($order->fresh()->canBePaid());
        $this->assertSame(500000, $order->fresh()->minimumPayment());

        // batas tahan DP lewat → pesanan yang sudah DP tidak ikut dibatalkan
        $order->update(['expires_at' => now()->subHour()]);
        $this->artisan('orders:expire')->assertSuccessful();
        $this->assertSame('cicilan_berjalan', $order->fresh()->status);
        $this->assertSame(15, $this->flight->fresh()->seats_available);

        $this->pay($order, 100000000);
        $this->pay($order, 110000000); // lunas
        $this->assertSame('dibayar', $order->fresh()->status);
        $this->assertTrue($order->fresh()->canUploadManifest());

        // template berisi 30 baris
        $this->actingAs($this->agent)->get(route('customer.flight-orders.manifest.template', $order))->assertOk();

        $this->actingAs($this->agent)->post($url, ['file' => $this->manifestFile($order, 30)])->assertSessionHasNoErrors()->assertSessionHas('success');
        $order->refresh();
        $this->assertNotNull($order->manifest_uploaded_at);
        $this->assertSame(30, $order->passengers()->count());
        $this->assertSame([], $order->manifest_warnings ?? []);
        $p = $order->passengers()->first();
        $this->assertSame('PENUMPANG 1', $p->full_name);
        $this->assertSame('L', $p->gender);
        $this->assertSame('X1000001', $p->passport_number);
        $this->assertSame(1, $order->documents()->where('type', 'manifest')->count());

        // ganti manifest dengan 28 nama → data lama terganti, ada catatan jumlah tidak sesuai
        $this->actingAs($this->agent)->post($url, ['file' => $this->manifestFile($order, 28)])->assertSessionHasNoErrors();
        $this->assertSame(28, $order->fresh()->passengers()->count());
        $this->assertStringContainsString('28 orang', $order->fresh()->manifest_warnings[0]);

        $this->actingAs($this->agent)->get(route('customer.flight-orders.show', $order))->assertOk();
        $admin = User::factory()->admin()->create();
        $this->actingAs($admin)->get(route('admin.flight-orders.show', $order))->assertOk();
    }

    public function test_manifest_format_agen_sendiri_tetap_terbaca(): void
    {
        $this->order(['seats' => 2]);
        $order = FlightOrder::firstOrFail();
        $this->pay($order, $order->total_amount);

        // format bebas: judul kolom berbahasa Inggris, urutan berbeda, tanggal teks, NIK angka
        $csv = "Passport No,Name,Sex,Date of Birth,Expired Date,NIK\n"
            ."A 123 4567,siti aminah,F,12/03/1985,01-01-2027,1271000000000001\n"
            ."B7654321,Ahmad,M,1990-05-05,2031-01-01,\n";
        $file = UploadedFile::fake()->createWithContent('manifest-agen.csv', $csv);

        $this->actingAs($this->agent)->post(route('customer.flight-orders.manifest', $order), ['file' => $file])->assertSessionHasNoErrors();
        $rows = $order->passengers()->orderBy('id')->get();
        $this->assertSame('SITI AMINAH', $rows[0]->full_name);
        $this->assertSame('P', $rows[0]->gender);
        $this->assertSame('A1234567', $rows[0]->passport_number);
        $this->assertSame('1985-03-12', $rows[0]->birth_date->toDateString());
        $this->assertSame('1271000000000001', $rows[0]->nik);
        // paspor Siti habis < 6 bulan setelah berangkat → catatan
        $this->assertTrue(collect($order->fresh()->manifest_warnings)->contains(fn ($w) => str_contains($w, '6 bulan') && str_contains($w, 'SITI')));
    }

    /** Isi template resmi dengan $n penumpang */
    private function manifestFile(FlightOrder $order, int $n): UploadedFile
    {
        $book = IOFactory::load(app(FlightManifest::class)->template($order->fresh()));
        $sheet = $book->getActiveSheet();
        for ($i = 1; $i <= $n; $i++) {
            $r = 5 + $i;
            $sheet->setCellValue('B'.$r, 'Tn');
            $sheet->setCellValue('C'.$r, 'Penumpang '.$i);
            $sheet->setCellValue('D'.$r, 'L');
            $sheet->setCellValue('E'.$r, '01/02/1980');
            $sheet->setCellValueExplicit('F'.$r, 'X'.(1000000 + $i), \PhpOffice\PhpSpreadsheet\Cell\DataType::TYPE_STRING);
            $sheet->setCellValue('G'.$r, '01/02/2032');
        }
        for ($r = 5 + $n + 1; $r <= 5 + $order->pax_count; $r++) {
            $sheet->setCellValue('A'.$r, null);
        }
        $path = tempnam(sys_get_temp_dir(), 'mf').'.xlsx';
        (new Xlsx($book))->save($path);

        return new UploadedFile($path, 'manifest.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', null, true);
    }
}
