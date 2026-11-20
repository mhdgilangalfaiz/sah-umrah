<?php

namespace App\Http\Controllers;

use App\Support\Audit;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    private function profileRules(): array
    {
        return [
            'name' => 'required|string|max:120',
            'phone' => ['required', 'string', 'max:20', 'regex:/^(\+62|62|0)8[0-9]{7,12}$/'],
            'nik' => 'required|digits:16',
            'birth_place' => 'required|string|max:80',
            'birth_date' => 'required|date|before:today',
            'gender' => 'required|in:L,P',
            'address' => 'required|string|max:500',
            'city' => 'required|string|max:80',
        ];
    }

    private function profileMessages(): array
    {
        return ['phone.regex' => 'Nomor HP tidak valid (contoh: 081234567890).', 'nik.digits' => 'NIK harus 16 digit.'];
    }

    private function profileData($user): array
    {
        return [
            'name' => $user->name, 'phone' => $user->phone, 'nik' => $user->nik, 'birth_place' => $user->birth_place,
            'birth_date' => $user->birth_date?->format('Y-m-d'), 'gender' => $user->gender, 'address' => $user->address, 'city' => $user->city,
        ];
    }

    /** Wajib setelah login Google / sebelum checkout pertama */
    public function complete(Request $request): Response|RedirectResponse
    {
        $user = $request->user();
        if ($user->isAdmin()) return redirect()->route('admin.dashboard');

        return Inertia::render('Profile/Complete', [
            'profile' => $this->profileData($user),
            'needsConsent' => is_null($user->pdp_consent_at),
        ]);
    }

    public function storeComplete(Request $request): RedirectResponse
    {
        $user = $request->user();
        $rules = $this->profileRules();
        if (is_null($user->pdp_consent_at)) $rules['consent'] = 'accepted';
        $data = $request->validate($rules, $this->profileMessages() + ['consent.accepted' => 'Persetujuan pemrosesan data pribadi (UU PDP) wajib dicentang.']);
        unset($data['consent']);

        $user->fill($data);
        $user->profile_completed_at = now();
        $user->pdp_consent_at ??= now();
        $user->save();

        // jadikan pemilik akun sebagai jamaah tersimpan pertama
        if (! $user->jamaah()->where('relation', 'diri_sendiri')->exists()) {
            $user->jamaah()->create([
                'full_name' => $user->name, 'relation' => 'diri_sendiri', 'nik' => $user->nik, 'gender' => $user->gender,
                'birth_place' => $user->birth_place, 'birth_date' => $user->birth_date, 'phone' => $user->phone,
            ]);
        }
        Audit::log('akun.profil_lengkap', 'Melengkapi data profil', $user);

        return redirect()->intended(route('dashboard'))->with('success', 'Terima kasih, data profil Anda telah lengkap.');
    }

    public function edit(Request $request): Response
    {
        return Inertia::render('Profile/Edit', [
            'mustVerifyEmail' => true,
            'status' => session('status'),
            'profile' => $this->profileData($request->user()) + ['email' => $request->user()->email],
            'hasPassword' => (bool) $request->user()->password,
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $user = $request->user();
        if ($user->isAdmin()) {
            $data = $request->validate(['name' => 'required|string|max:120', 'phone' => 'nullable|string|max:20']);
        } else {
            $data = $request->validate($this->profileRules() + [
                'email' => ['required', 'email', 'max:255', 'regex:/@gmail\.com$/i', Rule::unique('users')->ignore($user->id)],
            ], $this->profileMessages() + ['email.regex' => 'Email pelanggan wajib @gmail.com.']);
        }

        $user->fill($data);
        if ($user->isDirty('email')) $user->email_verified_at = null;
        $user->profile_completed_at ??= $user->isAdmin() ? null : now();
        $dirty = array_keys($user->getDirty());
        $user->save();
        Audit::log('akun.profil_ubah', 'Mengubah profil ('.implode(', ', $dirty).')', $user);

        return Redirect::route('profile.edit')->with('success', 'Profil berhasil diperbarui.');
    }

    public function destroy(Request $request): RedirectResponse
    {
        $request->validate(['password' => ['required', 'current_password']]);
        $user = $request->user();
        abort_if($user->isAdmin(), 403, 'Akun admin tidak dapat dihapus sendiri.');
        abort_if($user->bookings()->exists() || $user->payments()->exists(), 422, 'Akun yang memiliki riwayat transaksi tidak dapat dihapus. Hubungi kami melalui pusat bantuan.');

        Audit::log('akun.hapus', 'Menghapus akun '.$user->email, $user);
        Auth::logout();
        $user->delete();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return Redirect::to('/');
    }
}
