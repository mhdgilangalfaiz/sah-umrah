<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Flight;
use App\Support\Audit;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

/** Jadwal penerbangan dikelola manual oleh admin (tidak ada kerja sama API maskapai) */
class FlightController extends Controller
{
    public function index(Request $request)
    {
        return Inertia::render('Admin/Flights/Index', [
            'flights' => Flight::when($request->q, fn ($q, $s) => $q->where(fn ($w) => $w->where('airline', 'like', "%$s%")->orWhere('flight_number', 'like', "%$s%")))
                ->orderByDesc('depart_at')->paginate(20)->withQueryString(),
            'filters' => $request->only('q'),
        ]);
    }

    public function create()
    {
        return Inertia::render('Admin/Flights/Form', ['flight' => null, 'classes' => Flight::CLASSES]);
    }

    public function edit(Flight $flight)
    {
        return Inertia::render('Admin/Flights/Form', ['flight' => $flight, 'classes' => Flight::CLASSES]);
    }

    private function rules(): array
    {
        return [
            'airline' => 'required|string|max:80',
            'airline_code' => 'nullable|string|max:5',
            'flight_number' => 'required|string|max:20',
            'origin_code' => 'required|string|size:3',
            'origin_city' => 'required|string|max:80',
            'destination_code' => 'required|string|size:3',
            'destination_city' => 'required|string|max:80',
            'depart_at' => 'required|date',
            'arrive_at' => 'required|date|after:depart_at',
            'transit_count' => 'required|integer|min:0|max:5',
            'transit_info' => 'nullable|string|max:150',
            'cabin_class' => ['required', Rule::in(array_keys(Flight::CLASSES))],
            'price' => 'required|integer|min:0',
            'baggage_kg' => 'required|integer|min:0|max:100',
            'cabin_baggage_kg' => 'required|integer|min:0|max:30',
            'seats_available' => 'required|integer|min:0|max:1000',
            'refund_policy' => 'nullable|string|max:3000',
            'reschedule_policy' => 'nullable|string|max:3000',
            'is_active' => 'boolean',
        ];
    }

    public function store(Request $request)
    {
        $data = $request->validate($this->rules());
        $data['origin_code'] = strtoupper($data['origin_code']);
        $data['destination_code'] = strtoupper($data['destination_code']);
        $f = Flight::create($data);
        Audit::log('penerbangan.tambah', "Menambah penerbangan {$f->airline} {$f->flight_number}", $f);

        return redirect()->route('admin.flights.index')->with('success', 'Penerbangan ditambahkan.');
    }

    public function update(Request $request, Flight $flight)
    {
        $data = $request->validate($this->rules());
        $flight->fill($data);
        $action = $flight->isDirty('price') ? 'penerbangan.harga_ubah' : 'penerbangan.ubah';
        $flight->save();
        Audit::changes($action, "Mengubah penerbangan {$flight->airline} {$flight->flight_number}", $flight);

        return redirect()->route('admin.flights.index')->with('success', 'Penerbangan diperbarui.');
    }

    public function destroy(Flight $flight)
    {
        abort_if($flight->orders()->exists(), 422, 'Penerbangan sudah memiliki pesanan. Nonaktifkan saja.');
        Audit::log('penerbangan.hapus', "Menghapus penerbangan {$flight->airline} {$flight->flight_number}", $flight);
        $flight->delete();

        return back()->with('success', 'Penerbangan dihapus.');
    }
}
