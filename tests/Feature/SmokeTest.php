<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Flight;
use App\Models\Invoice;
use App\Models\Package;
use App\Models\Payment;
use App\Models\Post;
use App\Models\SupportTicket;
use App\Models\User;
use App\Models\VisaApplication;
use App\Models\VisaService;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

/** Merender seluruh halaman dengan data seeder — memastikan tidak ada error server & komponen halaman ada. */
class SmokeTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    private function ok(string $url, ?string $component = null): void
    {
        $res = $this->get($url);
        $this->assertSame(200, $res->status(), "GET $url → {$res->status()}");
        if ($component) {
            $res->assertInertia(fn ($page) => $page->component($component));
        }
    }

    public function test_halaman_publik(): void
    {
        $pkg = Package::first();
        $post = Post::first();
        $this->ok('/', 'landing');
        $this->ok('/paket-umrah', 'Public/Packages');
        $this->ok('/paket-umrah?durasi=12&jenis=hemat&urut=termahal', 'Public/Packages');
        $this->ok('/paket-umrah/'.$pkg->slug, 'Public/PackageShow');
        $this->ok('/tiket-pesawat', 'Public/Flights');
        $this->ok('/tiket-pesawat?asal=KNO&tujuan=JED&penumpang=2', 'Public/Flights');
        $this->ok('/layanan-visa', 'Public/Visa');
        $this->ok('/blog', 'Public/Blog');
        $this->ok('/blog/'.$post->slug, 'Public/PostShow');
        $this->ok('/kontak', 'Public/Contact');
        foreach (['tentang-kami', 'syarat-ketentuan', 'kebijakan-privasi', 'kebijakan-refund'] as $s) $this->ok('/halaman/'.$s, 'Public/Page');
        $this->ok('/login', 'Auth/AuthScreen');
        $this->ok('/register', 'Auth/AuthScreen');
        $this->ok('/forgot-password', 'Auth/ForgotPassword');
        $this->getJson('/bantuan/chat')->assertOk();
        // checkout wajib login
        $this->get('/pesan/umrah/'.$pkg->slug)->assertRedirect('/login');
    }

    public function test_halaman_pelanggan(): void
    {
        $u = User::where('email', 'jaya.demo@gmail.com')->first();
        $this->actingAs($u);
        $pkg = Package::first();
        $dep = $pkg->upcomingDepartures()->first();

        // buat pesanan umrah, tiket, visa
        $this->post('/pesan/umrah', ['departure_id' => $dep->id, 'room_type' => 'double', 'scheme' => 'cicilan', 'agree' => true,
            'passengers' => [['jamaah_id' => $u->jamaah()->first()->id], ['full_name' => 'Anak', 'gender' => 'P', 'birth_date' => '2015-01-01', 'save' => true]]])->assertSessionHasNoErrors();
        $b = Booking::first();
        $flight = Flight::where('depart_at', '>', now()->addDay())->first();
        $this->post('/pesan/tiket', ['flight_id' => $flight->id, 'contact_email' => $u->email, 'contact_phone' => '0812', 'agree' => true,
            'passengers' => [['jamaah_id' => $u->jamaah()->first()->id, 'title' => 'Bapak']]])->assertSessionHasNoErrors();
        $this->post('/pesan/visa', ['visa_service_id' => VisaService::first()->id, 'pax_count' => 2, 'agree' => true, 'applicants' => [['full_name' => 'Jaya', 'passport_number' => 'C1234567']]])->assertSessionHasNoErrors();
        $this->post('/bayar', ['payable_type' => 'booking', 'code' => $b->code, 'method' => 'va_bsi', 'amount' => 6000000, 'idempotency_key' => (string) Str::uuid()])->assertSessionHasNoErrors();
        $pay = Payment::first();

        $this->ok('/dashboard', 'Customer/Dashboard');
        $this->ok('/pesan/umrah/'.$pkg->slug.'?departure='.$dep->id, 'Checkout/Package');
        $this->ok('/pesan/tiket/'.$flight->id.'?penumpang=2', 'Checkout/Flight');
        $this->ok('/pesan/visa', 'Checkout/Visa');
        $this->ok('/akun/umrah', 'Customer/Bookings');
        $this->ok('/akun/umrah/'.$b->code, 'Customer/BookingShow');
        $this->ok('/akun/tiket', 'Customer/FlightOrders');
        $this->ok('/akun/tiket/'.\App\Models\FlightOrder::first()->code, 'Customer/FlightOrderShow');
        $this->ok('/akun/visa', 'Customer/Visas');
        $this->ok('/akun/visa/'.VisaApplication::first()->code, 'Customer/VisaShow');
        $this->ok('/akun/tagihan', 'Customer/Billing');
        $this->ok('/akun/dokumen', 'Customer/Documents');
        $this->ok('/akun/jamaah', 'Customer/Jamaah');
        $this->ok('/akun/refund', 'Customer/Refunds');
        $this->ok('/akun/bantuan', 'Customer/Support');
        $this->ok('/notifikasi', 'Customer/Notifications');
        $this->ok('/profile', 'Profile/Edit');
        $this->ok('/bayar/'.$pay->code, 'Payment/Show');
        $this->getJson('/bayar/'.$pay->code.'/status')->assertJson(['status' => 'menunggu_pembayaran']);
        $this->getJson('/notifikasi/terbaru')->assertOk();

        // simulasi bayar lalu unduh invoice & kwitansi PDF
        $this->post('/bayar/'.$pay->code.'/simulasi', ['status' => 'PAID'])->assertRedirect();
        $this->assertSame('dibayar', $pay->fresh()->status);
        foreach (Invoice::where('user_id', $u->id)->get() as $inv) {
            $this->get('/invoice/'.$inv->id.'/pdf')->assertOk()->assertHeader('content-type', 'application/pdf');
        }
        // admin tidak boleh masuk area pelanggan
        $this->actingAs(User::where('email', 'admin@sah.co.id')->first())->get('/dashboard')->assertRedirect('/admin');
    }

    public function test_halaman_admin(): void
    {
        // data pendukung
        $u = User::where('email', 'jaya.demo@gmail.com')->first();
        $this->actingAs($u)->post('/pesan/umrah', ['departure_id' => Package::first()->upcomingDepartures()->first()->id, 'room_type' => 'quad', 'scheme' => 'cicilan', 'agree' => true,
            'passengers' => [['full_name' => 'Jaya', 'gender' => 'L', 'birth_date' => '1990-01-01']]]);
        $b = Booking::first();
        $this->actingAs($u)->post('/bayar', ['payable_type' => 'booking', 'code' => $b->code, 'method' => 'qris', 'amount' => 3000000, 'idempotency_key' => (string) Str::uuid()]);
        $this->actingAs($u)->post('/bayar/'.Payment::first()->code.'/simulasi', ['status' => 'PAID']);
        $this->actingAs($u)->post('/pesan/visa', ['visa_service_id' => VisaService::first()->id, 'pax_count' => 1, 'agree' => true]);
        $this->actingAs($u)->postJson('/bantuan/chat', ['message' => 'Hubungkan saya dengan Admin']);
        $flight = Flight::where('depart_at', '>', now()->addDay())->first();
        $this->actingAs($u)->post('/pesan/tiket', ['flight_id' => $flight->id, 'contact_email' => $u->email, 'contact_phone' => '0812', 'agree' => true,
            'passengers' => [['full_name' => 'Jaya', 'title' => 'Bapak', 'gender' => 'L', 'birth_date' => '1990-01-01', 'passport_number' => 'C1234567', 'passport_expiry' => now()->addYears(3)->toDateString()]]]);

        $admin = User::where('email', 'admin@sah.co.id')->first();
        $this->actingAs($admin);
        $pkg = Package::first();

        $pages = [
            '/admin' => 'Admin/Dashboard', '/admin/notifikasi' => 'Admin/Notifications',
            '/admin/paket' => 'Admin/Packages/Index', '/admin/paket/create' => 'Admin/Packages/Form', "/admin/paket/{$pkg->id}/edit" => 'Admin/Packages/Form',
            '/admin/keberangkatan' => 'Admin/Departures', '/admin/keberangkatan?rentang=lalu' => 'Admin/Departures',
            '/admin/pesanan-umrah' => 'Admin/Bookings/Index', '/admin/pesanan-umrah?terlambat=1&status=cicilan_berjalan' => 'Admin/Bookings/Index', "/admin/pesanan-umrah/{$b->code}" => 'Admin/Bookings/Show',
            '/admin/penerbangan' => 'Admin/Flights/Index', '/admin/penerbangan/create' => 'Admin/Flights/Form', "/admin/penerbangan/{$flight->id}/edit" => 'Admin/Flights/Form',
            '/admin/pesanan-tiket' => 'Admin/FlightOrders/Index', '/admin/pesanan-tiket/'.\App\Models\FlightOrder::first()->code => 'Admin/FlightOrders/Show',
            '/admin/visa' => 'Admin/Visa/Index', '/admin/visa/'.VisaApplication::first()->code => 'Admin/Visa/Show',
            '/admin/dokumen' => 'Admin/Documents', '/admin/pembayaran' => 'Admin/Payments/Index', '/admin/pembayaran/rekonsiliasi' => 'Admin/Payments/Reconcile',
            '/admin/refund' => 'Admin/Refunds', '/admin/laporan' => 'Admin/Reports', '/admin/keamanan-keuangan' => 'Admin/FinanceSecurity',
            '/admin/bantuan' => 'Admin/Support/Index', '/admin/bantuan/'.SupportTicket::first()->code => 'Admin/Support/Show',
            '/admin/pengguna' => 'Admin/Users', '/admin/audit-log' => 'Admin/AuditLogs', '/admin/halaman' => 'Admin/Pages',
            '/admin/pengaturan' => 'Admin/Settings', '/admin/promo' => 'Admin/Promotions',
            '/profile' => 'Profile/Edit',
        ];
        foreach (['visa', 'chatbot', 'testimoni', 'faq', 'blog'] as $r) $pages["/admin/kelola/$r"] = 'Admin/Crud';
        $pages['/admin/kelola/galeri'] = 'Admin/Gallery';
        foreach ($pages as $url => $component) $this->ok($url, $component);

        // akun admin hanya untuk Super Admin
        $this->get('/admin/akun-admin')->assertForbidden();
        $this->actingAs(User::where('role', User::ROLE_SUPER_ADMIN)->first());
        $this->ok('/admin/akun-admin', 'Admin/Admins');
        $this->actingAs($admin);

        // ekspor
        $dep = $b->departure;
        $this->get("/admin/keberangkatan/{$dep->id}/manifest?format=xlsx")->assertOk();
        $this->get("/admin/keberangkatan/{$dep->id}/manifest?format=pdf")->assertOk()->assertHeader('content-type', 'application/pdf');
        $this->get('/admin/laporan/ekspor?format=xlsx')->assertOk();
        $this->get('/admin/laporan/ekspor?format=pdf')->assertOk()->assertHeader('content-type', 'application/pdf');
        $this->get('/admin/pesanan-umrah/ekspor')->assertOk();

        // aksi admin: ubah harga paket tercatat sebagai harga_ubah di audit log
        $this->put("/admin/paket/{$pkg->id}", array_merge($pkg->only('name', 'type', 'duration_days', 'departure_city', 'hotel_makkah_star', 'hotel_madinah_star', 'price_triple', 'price_double', 'min_deposit'), ['price_quad' => 33000000, 'is_active' => true, 'is_featured' => true]))
            ->assertSessionHasNoErrors();
        $this->assertDatabaseHas('audit_logs', ['action' => 'paket.harga_ubah', 'user_id' => $admin->id]);

        // perintah terjadwal berjalan tanpa error
        $this->artisan('reminders:installments')->assertSuccessful();
        $this->artisan('reminders:departures')->assertSuccessful();
        $this->artisan('orders:expire')->assertSuccessful();
        $this->artisan('finance:verify-integrity')->assertSuccessful();
    }
}
