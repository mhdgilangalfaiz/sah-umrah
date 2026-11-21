<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\Audit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;

/**
 * Akun admin — HANYA Super Admin yang dapat membuat/mengubah akun Admin.
 * Akun yang dibuat dari sini selalu berperan Admin; akun Super Admin tidak dapat diubah dari panel.
 */
class AdminAccountController extends Controller
{
    public function index()
    {
        return Inertia::render('Admin/Admins', [
            'admins' => User::admins()->orderByRaw("role = 'super_admin' desc")->orderBy('name')->get()->map(fn ($u) => [
                'id' => $u->id, 'name' => $u->name, 'email' => $u->email, 'phone' => $u->phone, 'role' => $u->role, 'role_label' => $u->roleLabel(),
                'is_super_admin' => $u->isSuperAdmin(), 'is_active' => $u->is_active,
                'last_login_at' => $u->last_login_at?->format('d/m/Y H:i'), 'last_login_ip' => $u->last_login_ip,
            ]),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:120',
            'email' => 'required|email|max:255|unique:users,email', // admin tidak wajib @gmail.com
            'phone' => 'nullable|string|max:20',
            'password' => ['required', 'confirmed', Password::min(10)->letters()->numbers()->mixedCase()],
            'my_password' => 'required|current_password',
        ], ['my_password.current_password' => 'Kata sandi Anda (Super Admin) salah.']);

        $admin = new User(['name' => $data['name'], 'email' => strtolower($data['email']), 'phone' => $data['phone'] ?? null, 'password' => $data['password']]);
        $admin->forceFill(['role' => User::ROLE_ADMIN, 'is_primary_admin' => false, 'is_active' => true, 'email_verified_at' => now()])->save();
        Audit::log('admin.tambah', "Menambah akun admin {$admin->email} ({$admin->roleLabel()})", $admin, [], ['role' => $admin->role]);

        return back()->with('success', 'Akun admin baru berhasil dibuat.');
    }

    public function update(Request $request, User $user)
    {
        abort_unless($user->isAdmin(), 404);
        abort_if($user->isSuperAdmin(), 422, 'Akun Super Admin tidak dapat diubah dari sini.');

        $data = $request->validate([
            'is_active' => 'required|boolean',
            'password' => ['nullable', 'confirmed', Password::min(10)->letters()->numbers()->mixedCase()],
        ]);
        $old = $user->only('role', 'is_active');
        $user->forceFill(['is_active' => $data['is_active']]);
        if (! empty($data['password'])) $user->password = $data['password'];
        $user->save();
        if (! $user->is_active) DB::table('sessions')->where('user_id', $user->id)->delete();
        Audit::log('admin.ubah', "Mengubah akun admin {$user->email}".(! empty($data['password']) ? ' (reset kata sandi)' : ''), $user, $old, $user->only('role', 'is_active'));

        return back()->with('success', 'Akun admin diperbarui.');
    }
}
