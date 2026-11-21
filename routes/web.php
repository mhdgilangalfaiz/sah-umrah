<?php

use App\Http\Controllers\Admin;
use App\Http\Controllers\Auth\GoogleController;
use App\Http\Controllers\ChatController;
use App\Http\Controllers\CheckoutController;
use App\Http\Controllers\Customer;
use App\Http\Controllers\DocumentDownloadController;
use App\Http\Controllers\InvoiceController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\PublicController;
use App\Http\Controllers\WebhookController;
use App\Security\Finance\BankDecisionController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Halaman publik
|--------------------------------------------------------------------------
*/
Route::get('/', [PublicController::class, 'home'])->name('home');
Route::get('/paket-umrah', [PublicController::class, 'packages'])->name('packages.index');
Route::get('/paket-umrah/{package:slug}', [PublicController::class, 'package'])->name('packages.show');
Route::get('/tiket-pesawat', [PublicController::class, 'flights'])->name('flights.index');
Route::get('/layanan-visa', [PublicController::class, 'visa'])->name('visa.index');
Route::get('/blog', [PublicController::class, 'blog'])->name('blog.index');
Route::get('/blog/{post:slug}', [PublicController::class, 'post'])->name('blog.show');
Route::get('/kontak', [PublicController::class, 'contact'])->name('pages.contact');
Route::get('/halaman/{slug}', [PublicController::class, 'page'])->name('pages.show');

// Pusat bantuan (chatbox) — tamu dapat bertanya ke asisten otomatis; hubungi admin wajib login
Route::prefix('bantuan/chat')->middleware('throttle:40,1')->group(function () {
    Route::get('/', [ChatController::class, 'show'])->name('chat.show');
    Route::post('/', [ChatController::class, 'send'])->name('chat.send');
    Route::post('/baru', [ChatController::class, 'restart'])->name('chat.restart');
});

// Webhook payment gateway (tanpa CSRF, diverifikasi signature/callback token)
Route::post('/webhooks/payment/{gateway}', WebhookController::class)
    ->whereIn('gateway', ['xendit', 'simulator'])->middleware('throttle:120,1')->name('webhooks.payment');

// Keputusan pemilik atas perubahan rekening (tautan email bertanda tangan)
Route::middleware(['signed', 'throttle:10,1'])->group(function () {
    Route::get('/keamanan/rekening/{account}', [BankDecisionController::class, 'show'])->name('finance.bank.decision');
    Route::post('/keamanan/rekening/{account}', [BankDecisionController::class, 'store']);
});

// Login Google & captcha halaman login
Route::middleware('guest')->group(function () {
    Route::get('/captcha/login', \App\Http\Controllers\Auth\CaptchaController::class)->middleware('throttle:30,1')->name('captcha.login');
    Route::get('/auth/google', [GoogleController::class, 'redirect'])->name('auth.google');
    Route::get('/auth/google/callback', [GoogleController::class, 'callback']);
});

/*
|--------------------------------------------------------------------------
| Pengguna login (pelanggan & admin)
|--------------------------------------------------------------------------
*/
Route::middleware('auth')->group(function () {
    Route::get('/lengkapi-profil', [ProfileController::class, 'complete'])->name('profile.complete');
    Route::post('/lengkapi-profil', [ProfileController::class, 'storeComplete'])->name('profile.complete.store');
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::get('/berkas/{document}', DocumentDownloadController::class)->middleware('signed')->name('documents.download');
    Route::get('/invoice/{invoice}/pdf', [InvoiceController::class, 'pdf'])->name('invoices.pdf');

    Route::get('/notifikasi', [NotificationController::class, 'index'])->name('notifications.index');
    Route::get('/notifikasi/terbaru', [NotificationController::class, 'latest'])->name('notifications.latest');
    Route::post('/notifikasi/baca-semua', [NotificationController::class, 'readAll'])->name('notifications.read-all');
    Route::post('/notifikasi/{id}/baca', [NotificationController::class, 'read'])->name('notifications.read');
});

/*
|--------------------------------------------------------------------------
| Area pelanggan (wajib login + email terverifikasi)
|--------------------------------------------------------------------------
*/
Route::middleware(['auth', 'verified', 'customer'])->group(function () {
    Route::get('/dashboard', [Customer\DashboardController::class, 'index'])->name('dashboard');

    // Checkout — wajib profil lengkap
    Route::middleware('customer:strict')->group(function () {
        Route::get('/pesan/umrah/{package:slug}', [CheckoutController::class, 'package'])->name('checkout.package');
        Route::post('/pesan/umrah', [CheckoutController::class, 'storePackage'])->middleware('throttle:10,1')->name('checkout.package.store');
        Route::get('/pesan/tiket/{flight}', [CheckoutController::class, 'flight'])->name('checkout.flight');
        Route::post('/pesan/tiket', [CheckoutController::class, 'storeFlight'])->middleware('throttle:10,1')->name('checkout.flight.store');
        Route::get('/pesan/visa', [CheckoutController::class, 'visa'])->name('checkout.visa');
        Route::post('/pesan/visa', [CheckoutController::class, 'storeVisa'])->middleware('throttle:10,1')->name('checkout.visa.store');
    });

    // Pembayaran
    Route::post('/bayar', [PaymentController::class, 'store'])->middleware('throttle:15,1')->name('payments.store');
    Route::get('/bayar/{payment}', [PaymentController::class, 'show'])->name('payments.show');
    Route::get('/bayar/{payment}/status', [PaymentController::class, 'status'])->name('payments.status');
    Route::post('/bayar/{payment}/batal', [PaymentController::class, 'cancel'])->name('payments.cancel');
    Route::post('/bayar/{payment}/simulasi', [PaymentController::class, 'simulate'])->name('payments.simulate');

    Route::prefix('akun')->name('customer.')->group(function () {
        Route::get('/umrah', [Customer\OrderController::class, 'bookings'])->name('bookings.index');
        Route::get('/umrah/{booking}', [Customer\OrderController::class, 'booking'])->name('bookings.show');
        Route::post('/umrah/{booking}/batal', [Customer\OrderController::class, 'cancelBooking'])->name('bookings.cancel');
        Route::get('/tiket', [Customer\OrderController::class, 'flightOrders'])->name('flight-orders.index');
        Route::get('/tiket/{flightOrder}', [Customer\OrderController::class, 'flightOrder'])->name('flight-orders.show');
        Route::get('/visa', [Customer\OrderController::class, 'visas'])->name('visa.index');
        Route::get('/visa/{visaApplication}', [Customer\OrderController::class, 'visa'])->name('visa.show');
        Route::post('/visa/{visaApplication}/berkas', [Customer\OrderController::class, 'uploadVisaFiles'])->middleware('throttle:10,1')->name('visa.upload');

        Route::get('/tagihan', [Customer\BillingController::class, 'index'])->name('billing');

        Route::get('/dokumen', [Customer\DocumentController::class, 'index'])->name('documents.index');
        Route::post('/dokumen', [Customer\DocumentController::class, 'store'])->middleware('throttle:20,1')->name('documents.store');
        Route::delete('/dokumen/{document}', [Customer\DocumentController::class, 'destroy'])->name('documents.destroy');

        Route::get('/jamaah', [Customer\JamaahController::class, 'index'])->name('jamaah.index');
        Route::post('/jamaah', [Customer\JamaahController::class, 'store'])->name('jamaah.store');
        Route::put('/jamaah/{jamaah}', [Customer\JamaahController::class, 'update'])->name('jamaah.update');
        Route::delete('/jamaah/{jamaah}', [Customer\JamaahController::class, 'destroy'])->name('jamaah.destroy');

        Route::get('/refund', [Customer\RefundController::class, 'index'])->name('refunds.index');
        Route::post('/refund', [Customer\RefundController::class, 'store'])->middleware('throttle:5,1')->name('refunds.store');

        Route::get('/bantuan', [Customer\SupportController::class, 'index'])->name('support.index');
    });
});

/*
|--------------------------------------------------------------------------
| Panel Admin — 2 peran:
|   admin       : kelola seluruh website (konten, gambar, paket, tiket, visa, pesanan, pembayaran, rekap penjualan)
|   super_admin : hanya melihat pembelian, laporan & invoice, serta membuat akun admin
|--------------------------------------------------------------------------
*/
Route::prefix('admin')->name('admin.')->middleware(['auth', 'admin'])->group(function () {
    Route::get('/', [Admin\DashboardController::class, 'index'])->name('dashboard');
    Route::get('/notifikasi', [NotificationController::class, 'index'])->name('notifications');

    // ---- Admin & Super Admin: lihat pembelian, pembayaran, laporan & invoice (tanpa mengubah) ----
    Route::middleware('admin:admin,super_admin')->group(function () {
        Route::get('/pesanan-umrah', [Admin\BookingController::class, 'index'])->name('bookings.index');
        Route::get('/pesanan-umrah/ekspor', [Admin\BookingController::class, 'export'])->name('bookings.export');
        Route::get('/pesanan-umrah/{booking}', [Admin\BookingController::class, 'show'])->name('bookings.show');
        Route::get('/pesanan-tiket', [Admin\FlightOrderController::class, 'index'])->name('flight-orders.index');
        Route::get('/pesanan-tiket/{flightOrder}', [Admin\FlightOrderController::class, 'show'])->name('flight-orders.show');
        Route::get('/visa', [Admin\VisaController::class, 'index'])->name('visa.index');
        Route::get('/visa/{visaApplication}', [Admin\VisaController::class, 'show'])->name('visa.show');
        Route::get('/pembayaran', [Admin\PaymentController::class, 'index'])->name('payments.index');
        Route::get('/pembayaran/rekonsiliasi', [Admin\PaymentController::class, 'reconcile'])->name('payments.reconcile');
        Route::get('/laporan', [Admin\ReportController::class, 'index'])->name('reports.index');
        Route::get('/laporan/ekspor', [Admin\ReportController::class, 'export'])->name('reports.export');
        Route::get('/invoice', [Admin\InvoiceController::class, 'index'])->name('invoices.index');
    });

    // ---- Admin: kelola seluruh isi website ----
    Route::middleware('admin:admin')->group(function () {
        // Paket, keberangkatan, penerbangan, dokumen
        Route::resource('paket', Admin\PackageController::class)->parameters(['paket' => 'package'])->names('packages')->except('show');
        Route::post('/paket/{package}/keberangkatan', [Admin\PackageController::class, 'storeDeparture'])->name('departures.store');
        Route::put('/keberangkatan/{departure}', [Admin\PackageController::class, 'updateDeparture'])->name('departures.update');
        Route::delete('/keberangkatan/{departure}', [Admin\PackageController::class, 'destroyDeparture'])->name('departures.destroy');
        Route::get('/keberangkatan', [Admin\DepartureController::class, 'index'])->name('departures.index');
        Route::get('/keberangkatan/{departure}/manifest', [Admin\DepartureController::class, 'manifest'])->name('departures.manifest');

        // Update seat & harga harian (manual dari mitra) langsung dari tabel
        Route::patch('penerbangan/{flight}/seat', [Admin\FlightController::class, 'updateSeats'])->name('flights.seats');
        Route::resource('penerbangan', Admin\FlightController::class)->parameters(['penerbangan' => 'flight'])->names('flights')->except('show');

        Route::get('/dokumen', [Admin\DocumentController::class, 'index'])->name('documents.index');
        Route::put('/dokumen/{document}', [Admin\DocumentController::class, 'update'])->name('documents.update');

        // Tindakan atas pesanan
        Route::post('/pesanan-umrah/{booking}/batal', [Admin\BookingController::class, 'cancel'])->name('bookings.cancel');
        Route::post('/pesanan-tiket/{flightOrder}/terbitkan', [Admin\FlightOrderController::class, 'issue'])->name('flight-orders.issue');
        Route::post('/visa/{visaApplication}/invoice', [Admin\VisaController::class, 'invoice'])->name('visa.invoice');
        Route::post('/visa/{visaApplication}/status', [Admin\VisaController::class, 'status'])->name('visa.status');

        // Keuangan: cek pembayaran, refund, keamanan rekening
        Route::post('/pembayaran/{payment}/cek', [Admin\PaymentController::class, 'check'])->name('payments.check');
        Route::get('/refund', [Admin\RefundController::class, 'index'])->name('refunds.index');
        Route::put('/refund/{refund}', [Admin\RefundController::class, 'update'])->name('refunds.update');
        Route::get('/refund/{refund}/bukti', [Admin\RefundController::class, 'proof'])->name('refunds.proof');
        Route::get('/keamanan-keuangan', [Admin\FinanceSecurityController::class, 'index'])->name('finance.bank.index');
        Route::post('/keamanan-keuangan', [Admin\FinanceSecurityController::class, 'store'])->middleware('throttle:5,10')->name('finance.bank.store');

        // Pusat bantuan & basis jawaban chatbot
        Route::get('/bantuan', [Admin\SupportController::class, 'index'])->name('support.index');
        Route::get('/bantuan/{ticket}', [Admin\SupportController::class, 'show'])->name('support.show');
        Route::get('/bantuan/{ticket}/pesan', [Admin\SupportController::class, 'messagesJson'])->name('support.messages');
        Route::post('/bantuan/{ticket}/balas', [Admin\SupportController::class, 'reply'])->name('support.reply');
        Route::post('/bantuan/{ticket}/status', [Admin\SupportController::class, 'status'])->name('support.status');

        // Konten: galeri, beranda (didaftarkan sebelum CRUD generik)
        Route::get('/kelola/galeri', [Admin\GalleryController::class, 'index'])->name('galeri.index');
        Route::post('/kelola/galeri', [Admin\GalleryController::class, 'store'])->name('galeri.store');
        Route::post('/kelola/galeri/{gallery}', [Admin\GalleryController::class, 'update'])->name('galeri.update');
        Route::delete('/kelola/galeri/{gallery}', [Admin\GalleryController::class, 'destroy'])->name('galeri.destroy');
        Route::get('/kelola/beranda', [Admin\LandingController::class, 'edit'])->name('landing.edit');
        Route::post('/kelola/beranda', [Admin\LandingController::class, 'update'])->name('landing.update');

        // Kelola konten sederhana (generic CRUD): testimoni, faq, chatbot, visa, blog
        Route::get('/kelola/{resource}', [Admin\CrudController::class, 'index'])->name('crud.index');
        Route::post('/kelola/{resource}', [Admin\CrudController::class, 'store'])->name('crud.store');
        Route::post('/kelola/{resource}/{id}', [Admin\CrudController::class, 'update'])->name('crud.update');
        Route::delete('/kelola/{resource}/{id}', [Admin\CrudController::class, 'destroy'])->name('crud.destroy');

        // Halaman statis, pengaturan, promo, pelanggan, audit
        Route::get('/pengguna', [Admin\UserController::class, 'index'])->name('users.index');
        Route::post('/pengguna/{user}/status', [Admin\UserController::class, 'toggle'])->name('users.toggle');
        Route::get('/audit-log', [Admin\AuditLogController::class, 'index'])->name('audit.index');
        Route::get('/halaman', [Admin\ContentController::class, 'pages'])->name('pages.index');
        Route::put('/halaman/{page}', [Admin\ContentController::class, 'updatePage'])->name('pages.update');
        Route::get('/pengaturan', [Admin\ContentController::class, 'settings'])->name('settings.index');
        Route::put('/pengaturan', [Admin\ContentController::class, 'updateSettings'])->name('settings.update');
        Route::get('/promo', [Admin\PromotionController::class, 'index'])->name('promotions.index');
        Route::post('/promo', [Admin\PromotionController::class, 'store'])->middleware('throttle:5,1')->name('promotions.store');
    });

    // ---- Super Admin: buat & kelola akun admin ----
    Route::middleware('admin:super_admin')->group(function () {
        Route::get('/akun-admin', [Admin\AdminAccountController::class, 'index'])->name('admins.index');
        Route::post('/akun-admin', [Admin\AdminAccountController::class, 'store'])->name('admins.store');
        Route::put('/akun-admin/{user}', [Admin\AdminAccountController::class, 'update'])->name('admins.update');
    });
});

require __DIR__.'/auth.php';
