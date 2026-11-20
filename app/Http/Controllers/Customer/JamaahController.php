<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\Jamaah;
use App\Support\Audit;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

/** Data jamaah/penumpang tersimpan (profil & mahram) */
class JamaahController extends Controller
{
    private function rules(Request $request): array
    {
        return [
            'full_name' => 'required|string|max:120',
            'relation' => ['required', Rule::in(array_keys(Jamaah::RELATIONS))],
            'gender' => 'required|in:L,P',
            'birth_place' => 'nullable|string|max:80',
            'birth_date' => 'required|date|before:today',
            'nik' => 'nullable|digits:16',
            'phone' => 'nullable|string|max:20',
            'passport_number' => 'nullable|string|max:20|regex:/^[A-Za-z0-9]+$/',
            'passport_place' => 'nullable|string|max:80',
            'passport_issued_at' => 'nullable|date|before_or_equal:today',
            'passport_expiry' => 'nullable|date|after:today',
            'mahram_id' => ['nullable', Rule::exists('jamaah', 'id')->where('user_id', $request->user()->id)],
            'mahram_relation' => 'nullable|string|max:30',
        ];
    }

    public function index(Request $request)
    {
        return Inertia::render('Customer/Jamaah', [
            'jamaah' => $request->user()->jamaah()->with('mahram:id,full_name')->orderBy('full_name')->get()->map(fn ($j) => [
                ...$j->only('id', 'full_name', 'relation', 'gender', 'birth_place', 'phone', 'passport_place', 'mahram_id', 'mahram_relation', 'masked_passport'),
                'birth_date' => $j->birth_date?->format('Y-m-d'),
                'passport_issued_at' => $j->passport_issued_at?->format('Y-m-d'),
                'passport_expiry' => $j->passport_expiry?->format('Y-m-d'),
                'mahram_name' => $j->mahram?->full_name,
                'has_nik' => (bool) $j->nik,
            ]),
            'relations' => Jamaah::RELATIONS,
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate($this->rules($request));
        $data['passport_number'] = isset($data['passport_number']) ? strtoupper($data['passport_number']) : null;
        $j = $request->user()->jamaah()->create($data);
        Audit::log('jamaah.tambah', "Menambah jamaah {$j->full_name}", $j);

        return back()->with('success', 'Data jamaah tersimpan.');
    }

    public function update(Request $request, Jamaah $jamaah)
    {
        $this->ensureOwner($jamaah);
        $data = $request->validate($this->rules($request));
        // field sensitif kosong = tidak diubah
        foreach (['nik', 'passport_number'] as $f) {
            if (empty($data[$f])) unset($data[$f]);
        }
        if (isset($data['passport_number'])) $data['passport_number'] = strtoupper($data['passport_number']);
        abort_if(($data['mahram_id'] ?? null) == $jamaah->id, 422, 'Mahram tidak boleh diri sendiri.');
        $jamaah->update($data);
        Audit::changes('jamaah.ubah', "Mengubah data jamaah {$jamaah->full_name}", $jamaah);

        return back()->with('success', 'Data jamaah diperbarui.');
    }

    public function destroy(Jamaah $jamaah)
    {
        $this->ensureOwner($jamaah);
        Audit::log('jamaah.hapus', "Menghapus jamaah {$jamaah->full_name}", $jamaah);
        $jamaah->delete();

        return back()->with('success', 'Data jamaah dihapus.');
    }
}
