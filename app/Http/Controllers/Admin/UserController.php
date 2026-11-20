<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\Audit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

/** Manajemen pelanggan */
class UserController extends Controller
{
    public function index(Request $request)
    {
        return Inertia::render('Admin/Users', [
            'users' => User::customers()->withCount(['bookings', 'flightOrders', 'visaApplications'])
                ->when($request->q, fn ($q, $s) => $q->where(fn ($w) => $w->where('name', 'like', "%$s%")->orWhere('email', 'like', "%$s%")->orWhere('customer_code', 'like', "%$s%")))
                ->latest()->paginate(25)->withQueryString()
                ->through(fn ($u) => [
                    'id' => $u->id, 'customer_code' => $u->customer_code, 'name' => $u->name, 'email' => $u->email, 'phone' => $u->phone,
                    'city' => $u->city, 'is_active' => $u->is_active, 'google' => (bool) $u->google_id, 'verified' => (bool) $u->email_verified_at,
                    'profile_completed' => (bool) $u->profile_completed_at, 'orders' => $u->bookings_count + $u->flight_orders_count + $u->visa_applications_count,
                    'last_login_at' => $u->last_login_at?->diffForHumans(), 'created_at' => $u->created_at->format('d/m/Y'),
                ]),
            'filters' => $request->only('q'),
        ]);
    }

    public function toggle(User $user)
    {
        abort_if($user->isAdmin(), 422, 'Gunakan menu Akun Admin untuk akun admin.');
        $user->forceFill(['is_active' => ! $user->is_active])->save();
        if (! $user->is_active) DB::table('sessions')->where('user_id', $user->id)->delete();
        Audit::log('pengguna.'.($user->is_active ? 'aktifkan' : 'nonaktifkan'), ($user->is_active ? 'Mengaktifkan' : 'Menonaktifkan')." pelanggan {$user->customer_code}", $user);

        return back()->with('success', 'Status pengguna diperbarui.');
    }
}
