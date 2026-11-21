<?php

namespace Tests\Feature;

use App\Models\User;
use App\Notifications\SystemNotification;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NotificationBadgeTest extends TestCase
{
    use RefreshDatabase;

    public function test_unread_notifications_are_grouped_by_path_and_marked_read_when_page_is_opened(): void
    {
        $admin = User::factory()->admin()->create();
        $admin->notifyNow(new SystemNotification('pesanan', 'Order tiket baru', 'x', url('/admin/pesanan-tiket/SAH-T-1'), null, false));
        $admin->notifyNow(new SystemNotification('pembayaran', 'Pembayaran masuk', 'x', url('/admin/pembayaran'), null, false));

        $this->actingAs($admin)->get('/admin')->assertInertia(fn ($p) => $p
            ->where('unreadByPath./admin/pesanan-tiket/SAH-T-1', 1)
            ->where('unreadByPath./admin/pembayaran', 1)
            ->where('unreadNotifications', 2));

        // membuka halaman tujuan → notifikasinya terbaca, yang lain tetap
        $this->get('/admin/pembayaran')->assertInertia(fn ($p) => $p
            ->missing('unreadByPath./admin/pembayaran')
            ->where('unreadNotifications', 1));
    }

    public function test_package_checkout_receives_preselected_room_and_pax(): void
    {
        $this->seed(DatabaseSeeder::class);
        $u = User::where('email', 'jaya.demo@gmail.com')->first();
        $pkg = \App\Models\Package::first();

        $this->actingAs($u)->get(route('checkout.package', ['package' => $pkg->slug, 'departure' => 1, 'kamar' => 'triple', 'jamaah' => 3]))
            ->assertInertia(fn ($p) => $p->component('Checkout/Package')->where('selectedRoom', 'triple')->where('selectedPax', 3));

        $this->get(route('checkout.package', ['package' => $pkg->slug, 'kamar' => 'presiden', 'jamaah' => 99]))
            ->assertInertia(fn ($p) => $p->where('selectedRoom', null)->where('selectedPax', 10));
    }
}
