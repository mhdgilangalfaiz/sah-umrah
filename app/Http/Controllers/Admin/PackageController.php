<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Package;
use App\Models\PackageDeparture;
use App\Services\FileStorage;
use App\Support\Audit;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class PackageController extends Controller
{
    public function index(Request $request)
    {
        return Inertia::render('Admin/Packages/Index', [
            'packages' => Package::withCount('departures')->with('upcomingDepartures')
                ->when($request->q, fn ($q, $s) => $q->where('name', 'like', "%$s%"))
                ->latest()->paginate(15)->withQueryString(),
            'filters' => $request->only('q'),
        ]);
    }

    public function create()
    {
        return Inertia::render('Admin/Packages/Form', ['package' => null, 'types' => Package::TYPES]);
    }

    public function edit(Package $package)
    {
        return Inertia::render('Admin/Packages/Form', ['package' => $package->load('departures'), 'types' => Package::TYPES]);
    }

    private function validated(Request $request, ?Package $package = null): array
    {
        $data = $request->validate([
            'name' => 'required|string|max:150',
            'type' => ['required', Rule::in(array_keys(Package::TYPES))],
            'summary' => 'nullable|string|max:500',
            'description' => 'nullable|string|max:20000',
            'duration_days' => 'required|integer|min:1|max:60',
            'airline' => 'nullable|string|max:80',
            'departure_city' => 'required|string|max:80',
            'hotel_makkah' => 'nullable|string|max:120',
            'hotel_makkah_star' => 'required|integer|min:1|max:5',
            'hotel_makkah_distance' => 'nullable|string|max:60',
            'hotel_madinah' => 'nullable|string|max:120',
            'hotel_madinah_star' => 'required|integer|min:1|max:5',
            'hotel_madinah_distance' => 'nullable|string|max:60',
            'price_quad' => 'required|integer|min:0',
            'price_triple' => 'required|integer|min:0',
            'price_double' => 'required|integer|min:0',
            'min_deposit' => 'required|integer|min:0',
            'itinerary' => 'nullable|array',
            'itinerary.*.day' => 'required|integer|min:1',
            'itinerary.*.title' => 'required|string|max:150',
            'itinerary.*.description' => 'nullable|string|max:2000',
            'facilities' => 'nullable|array',
            'facilities.*' => 'string|max:200',
            'excludes' => 'nullable|array',
            'excludes.*' => 'string|max:200',
            'document_requirements' => 'nullable|array',
            'document_requirements.*' => 'string|max:200',
            'is_featured' => 'boolean',
            'is_active' => 'boolean',
            'cover' => 'nullable|image|max:8192',
            'gallery_new' => 'nullable|array|max:12',
            'gallery_new.*' => 'image|max:4096',
            'gallery_keep' => 'nullable|array',
        ]);

        if ($request->hasFile('cover')) {
            $data['cover_image'] = FileStorage::storePublic($request->file('cover'), 'packages', 'cover-'.$data['name']);
        }
        $gallery = array_values(array_intersect($package?->gallery ?? [], $request->input('gallery_keep', [])));
        foreach ($request->file('gallery_new', []) as $img) {
            $gallery[] = FileStorage::storePublic($img, 'packages', 'galeri-'.$data['name']);
        }
        $data['gallery'] = $gallery;
        unset($data['cover'], $data['gallery_new'], $data['gallery_keep']);

        return $data;
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);
        $data['slug'] = Str::slug($data['name']).'-'.Str::lower(Str::random(4));
        $package = Package::create($data);
        Audit::log('paket.tambah', "Menambah paket {$package->name}", $package, [], $package->only('price_quad', 'price_triple', 'price_double', 'min_deposit'));

        return redirect()->route('admin.packages.edit', $package)->with('success', 'Paket dibuat. Tambahkan jadwal keberangkatan di bawah.');
    }

    public function update(Request $request, Package $package)
    {
        $package->fill($this->validated($request, $package));
        $priceChanged = $package->isDirty(['price_quad', 'price_triple', 'price_double', 'min_deposit']);
        $package->save();
        Audit::changes($priceChanged ? 'paket.harga_ubah' : 'paket.ubah', ($priceChanged ? 'Mengubah HARGA paket ' : 'Mengubah paket ').$package->name, $package);

        return back()->with('success', 'Paket diperbarui.');
    }

    public function destroy(Package $package)
    {
        abort_if($package->departures()->whereHas('bookings', fn ($q) => $q->whereNotIn('status', ['dibatalkan', 'kedaluwarsa']))->exists(), 422,
            'Paket memiliki pesanan aktif. Nonaktifkan saja.');
        Audit::log('paket.hapus', "Menghapus paket {$package->name}", $package);
        $package->delete();

        return redirect()->route('admin.packages.index')->with('success', 'Paket dihapus.');
    }

    // ----- Jadwal keberangkatan & kuota -----
    private function departureRules(): array
    {
        return [
            'departure_date' => 'required|date|after:today',
            'return_date' => 'required|date|after:departure_date',
            'quota' => 'required|integer|min:1|max:1000',
            'status' => 'required|in:open,closed,departed',
        ];
    }

    public function storeDeparture(Request $request, Package $package)
    {
        $d = $package->departures()->create($request->validate($this->departureRules()));
        Audit::log('keberangkatan.tambah', "Menambah jadwal {$d->departure_date->format('d/m/Y')} (kuota {$d->quota}) untuk {$package->name}", $d);

        return back()->with('success', 'Jadwal keberangkatan ditambahkan.');
    }

    public function updateDeparture(Request $request, PackageDeparture $departure)
    {
        $rules = $this->departureRules();
        $rules['departure_date'] = 'required|date';
        $data = $request->validate($rules);
        abort_if($data['quota'] < $departure->booked + $departure->held, 422, 'Kuota tidak boleh lebih kecil dari kursi terisi/ditahan ('.($departure->booked + $departure->held).').');
        $departure->update($data);
        Audit::changes('keberangkatan.ubah', 'Mengubah jadwal/kuota keberangkatan #'.$departure->id, $departure);

        return back()->with('success', 'Jadwal diperbarui.');
    }

    public function destroyDeparture(PackageDeparture $departure)
    {
        abort_if($departure->booked + $departure->held > 0, 422, 'Jadwal sudah memiliki jamaah, ubah status menjadi "closed".');
        Audit::log('keberangkatan.hapus', 'Menghapus jadwal #'.$departure->id, $departure);
        $departure->delete();

        return back()->with('success', 'Jadwal dihapus.');
    }
}
