<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\Audit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;

/**
 * Akun admin — HANYA Admin Utama (is_primary_admin) yang dapat menambah/mengubah akun admin.
 * Admin baru tidak pernah menjadi admin utama, sehingga tidak dapat menambah admin lain.
 */
class AdminAccountController extends Controller
{
    private const ROLES = ['super_admin', 'finance', 'operasional', 'cs'];

    public function index()
    {
        return Inertia::render('Admin/Admins', [
            'admins' => User::admins()->orderByDesc('is_primary_admin')->orderBy('name')->get()->map(fn ($u) => [
                'id' => $u->id, 'name' => $u->name, 'email' => $u->email, 'phone' => $u->phone, 'role' => $u->role, 'role_label' => $u->roleLabel(),
                'is_primary_admin' => $u->is_primary_admin, 'is_active' => $u->is_active,
                'last_login_at' => $u->last_login_at?->format('d/m/Y H:i'), 'last_login_ip' => $u->last_login_ip,
            ]),
            'roles' => collect(self::ROLES)->mapWithKeys(fn ($r) => [$r => User::ROLE_LABELS[$r]]),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:120',
            'email' => 'required|email|max:255|unique:users,email', // admin tidak wajib @gmail.com
            'phone' => 'nullable|string|max:20',
            'role' => ['required', Rule::in(self::ROLES)],
            'password' => ['required', 'confirmed', Password::min(10)->letters()->numbers()->mixedCase()],
            'my_password' => 'required|current_password',
        ], ['my_password.current_password' => 'Kata sandi Anda (admin utama) salah.']);

        $admin = new User(['name' => $data['name'], 'email' => strtolower($data['email']), 'phone' => $data['phone'] ?? null, 'password' => $data['password']]);
        $admin->forceFill(['role' => $data['role'], 'is_primary_admin' => false, 'is_active' => true, 'email_verified_at' => now()])->save();
        Audit::log('admin.tambah', "Menambah akun admin {$admin->email} ({$admin->roleLabel()})", $admin, [], ['role' => $admin->role]);

        return back()->with('success', 'Akun admin baru berhasil dibuat.');
    }

    public function update(Request $request, User $user)
    {
        abort_unless($user->isAdmin(), 404);
        abort_if($user->is_primary_admin, 422, 'Akun admin utama tidak dapat diubah dari sini.');

        $data = $request->validate([
            'role' => ['required', Rule::in(self::ROLES)],
            'is_active' => 'required|boolean',
            'password' => ['nullable', 'confirmed', Password::min(10)->letters()->numbers()->mixedCase()],
        ]);
        $old = $user->only('role', 'is_active');
        $user->forceFill(['role' => $data['role'], 'is_active' => $data['is_active']]);
        if (! empty($data['password'])) $user->password = $data['password'];
        $user->save();
        if (! $user->is_active) DB::table('sessions')->where('user_id', $user->id)->delete();
        Audit::log('admin.ubah', "Mengubah akun admin {$user->email}".(! empty($data['password']) ? ' (reset kata sandi)' : ''), $user, $old, $user->only('role', 'is_active'));

        return back()->with('success', 'Akun admin diperbarui.');
    }
}
