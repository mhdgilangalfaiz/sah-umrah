<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\VisaApplication;
use App\Models\VisaService;
use App\Notifications\SystemNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

/** Visa ditolak → pelanggan ajukan ulang → admin periksa lagi; lonceng pelanggan hilang setelah daftar notifikasi dibuka. */
class ResubmitAndNotificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_customer_can_resubmit_rejected_visa_and_admin_reviews_again(): void
    {
        $customer = User::factory()->create();
        $admin = User::factory()->admin()->create();
        $service = VisaService::create(['name' => 'Visa Umrah', 'price' => 2_000_000, 'processing_days' => 7, 'is_active' => true]);
        $visa = VisaApplication::create(['code' => 'SAH-V-ULANG', 'user_id' => $customer->id, 'visa_service_id' => $service->id, 'pax_count' => 1,
            'status' => 'ditolak', 'rejection_reason' => 'Paspor kedaluwarsa', 'unit_price' => 2_000_000, 'total_amount' => 2_000_000, 'paid_amount' => 2_000_000]);

        $this->actingAs($customer)->get(route('customer.visa.show', $visa))->assertInertia(fn ($p) => $p->where('canUpload', true));
        $this->post(route('customer.visa.upload', $visa), ['file' => UploadedFile::fake()->create('baru.zip', 50, 'application/zip')])->assertSessionHasNoErrors();

        $visa->refresh();
        $this->assertSame('menunggu_dokumen', $visa->status);
        $this->assertNull($visa->rejection_reason);
        $this->assertStringContainsString('Pengajuan ulang', $visa->statusLogs()->first()->note);
        $this->assertSame(1, $visa->documents()->where('status', 'menunggu')->count());
        $this->assertStringStartsWith('Pengajuan ulang visa', $admin->notifications()->first()->data['title']);

        // admin dapat membuka kembali visa yang ditolak (minta berkas ulang)
        $visa->update(['status' => 'ditolak']);
        $this->actingAs($admin)->post(route('admin.visa.status', $visa), ['status' => 'menunggu_dokumen', 'note' => 'Silakan unggah paspor baru'])->assertSessionHasNoErrors();
        $this->assertSame('menunggu_dokumen', $visa->fresh()->status);
    }

    public function test_customer_bell_clears_after_opening_notifications_but_admin_does_not(): void
    {
        $customer = User::factory()->create();
        $customer->notifyNow(new SystemNotification('info', 'A', 'x', url('/akun/umrah'), null, false));
        $customer->notifyNow(new SystemNotification('info', 'B', 'x', url('/bayar/PAY-1'), null, false));

        $this->actingAs($customer)->get(route('notifications.index'))->assertInertia(fn ($p) => $p
            ->where('notifications.data.0.read_at', null)   // tetap tampil tersorot sebagai "baru"
            ->where('unreadNotifications', 0));             // angka lonceng hilang

        $admin = User::factory()->admin()->create();
        $admin->notifyNow(new SystemNotification('pesanan', 'C', 'x', url('/admin/pesanan-tiket/SAH-T-1'), null, false));
        $this->actingAs($admin)->get(route('admin.notifications'));
        $this->assertSame(1, $admin->unreadNotifications()->count());
    }
}
