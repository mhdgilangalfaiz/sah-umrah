<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\FileStorage;
use App\Support\Audit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;

/** Manajemen pelanggan */
class UserController extends Controller
{
    public function index(Request $request)
    {
        return Inertia::render('Admin/Users', [
            'users' => User::customers()->withCount(['bookings', 'flightOrders', 'visaApplications', 'jamaah'])
                ->when($request->q, fn ($q, $s) => $q->where(fn ($w) => $w->where('name', 'like', "%$s%")->orWhere('email', 'like', "%$s%")->orWhere('customer_code', 'like', "%$s%")))
                ->latest()->paginate(25)->withQueryString()
                ->through(fn ($u) => [
                    'id' => $u->id, 'customer_code' => $u->customer_code, 'name' => $u->name, 'email' => $u->email, 'phone' => $u->phone, 'jamaah' => $u->jamaah_count,
                    'city' => $u->city, 'is_active' => $u->is_active, 'google' => (bool) $u->google_id, 'verified' => (bool) $u->email_verified_at,
                    'profile_completed' => (bool) $u->profile_completed_at, 'orders' => $u->bookings_count + $u->flight_orders_count + $u->visa_applications_count,
                    'last_login_at' => $u->last_login_at?->diffForHumans(), 'created_at' => $u->created_at->format('d/m/Y'),
                ]),
            'filters' => $request->only('q'),
        ]);
    }

    /** Aturan email pelanggan sama dengan pendaftaran mandiri: wajib @gmail.com (selain itu tidak bisa login). */
    private function rules(?User $user = null): array
    {
        return [
            'name' => 'required|string|max:120',
            'email' => ['required', 'email', 'max:255', 'regex:/@gmail\.com$/i', Rule::unique('users', 'email')->ignore($user?->id)],
            'phone' => 'nullable|string|max:20',
            'is_active' => 'boolean',
            'password' => [$user ? 'nullable' : 'required', 'confirmed', Password::min(8)->letters()->numbers()],
        ];
    }

    private const MESSAGES = [
        'email.regex' => 'Akun pelanggan wajib memakai alamat @gmail.com.',
        'email.unique' => 'Email ini sudah dipakai akun lain.',
    ];

    public function store(Request $request)
    {
        $request->merge(['email' => strtolower(trim((string) $request->email))]);
        $data = $request->validate($this->rules(), self::MESSAGES);

        $user = new User(['name' => $data['name'], 'email' => $data['email'], 'phone' => $data['phone'] ?? null, 'password' => $data['password']]);
        // dibuat admin → email dianggap terverifikasi; pelanggan tetap diminta melengkapi profil saat login pertama
        $user->forceFill(['role' => User::ROLE_CUSTOMER, 'is_active' => $request->boolean('is_active', true), 'email_verified_at' => now(), 'pdp_consent_at' => null])->save();
        Audit::log('pengguna.tambah', "Menambah pelanggan {$user->customer_code}", $user);

        return back()->with('success', "Akun {$user->name} dibuat. Kode pelanggan: {$user->customer_code}.");
    }

    public function update(Request $request, User $user)
    {
        abort_if($user->isAdmin(), 422, 'Gunakan menu Akun Admin untuk akun admin.');
        $request->merge(['email' => strtolower(trim((string) $request->email))]);
        $data = $request->validate($this->rules($user), self::MESSAGES);

        $user->fill(['name' => $data['name'], 'email' => $data['email'], 'phone' => $data['phone'] ?? null]);
        if (! empty($data['password'])) {
            $user->password = $data['password'];
        }
        $user->is_active = $request->boolean('is_active');
        $user->save();
        if (! $user->is_active || ! empty($data['password'])) {
            DB::table('sessions')->where('user_id', $user->id)->delete(); // paksa login ulang
        }
        Audit::changes('pengguna.ubah', "Mengubah pelanggan {$user->customer_code}", $user);

        return back()->with('success', 'Data pengguna diperbarui.');
    }

    public function destroy(User $user)
    {
        abort_if($user->isAdmin(), 422, 'Gunakan menu Akun Admin untuk akun admin.');
        if ($user->bookings()->exists() || $user->flightOrders()->exists() || $user->visaApplications()->exists() || $user->documents()->exists()) {
            return back()->with('error', 'Akun ini sudah memiliki pesanan atau dokumen, jadi tidak dapat dihapus demi catatan keuangan. Nonaktifkan saja.');
        }
        Audit::log('pengguna.hapus', "Menghapus pelanggan {$user->customer_code} ({$user->email})", $user);
        DB::table('sessions')->where('user_id', $user->id)->delete();
        $avatar = $user->avatar;
        $user->delete(); // data jamaah ikut terhapus (cascade)
        FileStorage::deletePublic($avatar);

        return back()->with('success', 'Akun pengguna dihapus.');
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
