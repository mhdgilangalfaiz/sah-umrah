<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Flight;
use App\Models\FlightOrder;
use App\Support\Airports;
use App\Support\Audit;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

/**
 * Seat pesawat dikelola manual oleh admin (tidak ada kerja sama API maskapai).
 * Seat diambil dari mitra dan diperbarui setiap hari; pembelian di web mengurangi seat secara realtime.
 */
class FlightController extends Controller
{
    public function index(Request $request)
    {
        $status = $request->status ?: 'mendatang'; // mendatang | lewat | semua
        $flights = Flight::when($request->q, fn ($q, $s) => $q->where(fn ($w) => $w->where('airline', 'like', "%$s%")->orWhere('flight_number', 'like', "%$s%")->orWhere('origin_code', $s)->orWhere('destination_code', $s)))
            ->when($status === 'mendatang', fn ($q) => $q->where('depart_at', '>', now()))
            ->when($status === 'lewat', fn ($q) => $q->where('depart_at', '<=', now()))
            ->orderBy('depart_at', $status === 'mendatang' ? 'asc' : 'desc')
            ->paginate(25)->withQueryString();

        // Kursi yang sedang ditahan pesanan web yang belum dibayar (sudah terpotong dari sisa seat)
        $held = FlightOrder::whereIn('flight_id', $flights->pluck('id'))->where('status', 'menunggu_pembayaran')
            ->groupBy('flight_id')->selectRaw('flight_id, SUM(pax_count) as pax')->pluck('pax', 'flight_id');

        return Inertia::render('Admin/Flights/Index', [
            'flights' => $flights,
            'held' => $held,
            'filters' => ['q' => $request->q, 'status' => $status],
        ]);
    }

    public function create()
    {
        return Inertia::render('Admin/Flights/Form', $this->formProps(null));
    }

    public function edit(Flight $flight)
    {
        return Inertia::render('Admin/Flights/Form', $this->formProps($flight));
    }

    private function formProps(?Flight $flight): array
    {
        return ['flight' => $flight, 'classes' => Flight::CLASSES, 'tripTypes' => Flight::TRIP_TYPES, 'airports' => Airports::options()];
    }

    private function rules(Request $request): array
    {
        $leg = fn ($p) => [
            "$p" => 'array|max:4',
            "$p.*.flight_number" => 'required|string|max:12',
            "$p.*.origin_code" => 'required|string|size:3',
            "$p.*.destination_code" => 'required|string|size:3|different:'.$p.'.*.origin_code',
            "$p.*.depart_at" => 'required|date',
            "$p.*.arrive_at" => 'required|date|after:'.$p.'.*.depart_at',
        ];

        return [
            'airline' => 'required|string|max:80',
            'airline_code' => 'nullable|string|max:5',
            'trip_type' => ['required', Rule::in(array_keys(Flight::TRIP_TYPES))],
            ...$leg('segments'),
            'segments' => 'required|array|min:1|max:4',
            ...($request->input('trip_type') === 'pp' ? [...$leg('return_segments'), 'return_segments' => 'required|array|min:1|max:4'] : []),
            'cabin_class' => ['required', Rule::in(array_keys(Flight::CLASSES))],
            'price' => 'required|integer|min:0',
            'baggage_kg' => 'required|integer|min:0|max:100',
            'cabin_baggage_kg' => 'required|integer|min:0|max:30',
            'seats_available' => 'required|integer|min:0|max:1000',
            'seats_total' => 'nullable|integer|min:0|max:1000|gte:seats_available',
            'refund_policy' => 'nullable|string|max:3000',
            'reschedule_policy' => 'nullable|string|max:3000',
            'is_active' => 'boolean',
        ];
    }

    private function messages(): array
    {
        return [
            'segments.required' => 'Isi minimal satu penerbangan berangkat.',
            'return_segments.required' => 'Tiket PP wajib berisi penerbangan kepulangan.',
            '*.arrive_at.after' => 'Jam tiba harus setelah jam berangkat.',
            'seats_total.gte' => 'Alokasi seat tidak boleh lebih kecil dari sisa seat.',
        ];
    }

    public function store(Request $request)
    {
        $data = $request->validate($this->rules($request), $this->messages());
        $data['seats_updated_at'] = now();
        $f = Flight::create($data);
        Audit::log('penerbangan.tambah', "Menambah seat {$f->airline} {$f->route_label}", $f);

        return redirect()->route('admin.flights.index')->with('success', 'Seat penerbangan ditambahkan.');
    }

    public function update(Request $request, Flight $flight)
    {
        $data = $request->validate($this->rules($request), $this->messages());
        if ($data['trip_type'] === 'oneway') $data['return_segments'] = null;
        $flight->fill($data);
        if ($flight->isDirty(['seats_available', 'seats_total'])) $flight->seats_updated_at = now();
        $action = $flight->isDirty('price') ? 'penerbangan.harga_ubah' : 'penerbangan.ubah';
        $flight->save();
        Audit::changes($action, "Mengubah seat {$flight->airline} {$flight->route_label}", $flight);

        return redirect()->route('admin.flights.index')->with('success', 'Seat penerbangan diperbarui.');
    }

    /** Update harian dari mitra: sisa seat, alokasi, dan harga — langsung dari tabel. */
    public function updateSeats(Request $request, Flight $flight)
    {
        $data = $request->validate([
            'seats_available' => 'required|integer|min:0|max:1000',
            'seats_total' => 'nullable|integer|min:0|max:1000|gte:seats_available',
            'price' => 'required|integer|min:0',
        ], $this->messages());

        $flight->fill($data);
        $flight->seats_updated_at = now();
        $action = $flight->isDirty('price') ? 'penerbangan.harga_ubah' : 'penerbangan.seat_update';
        $flight->save();
        Audit::changes($action, "Update seat {$flight->airline} {$flight->route_label}: sisa {$flight->seats_available}", $flight);

        return back()->with('success', "Seat {$flight->route_label} diperbarui: sisa {$flight->seats_available} kursi.");
    }

    public function destroy(Flight $flight)
    {
        abort_if($flight->orders()->exists(), 422, 'Penerbangan sudah memiliki pesanan. Nonaktifkan saja.');
        Audit::log('penerbangan.hapus', "Menghapus seat {$flight->airline} {$flight->route_label}", $flight);
        $flight->delete();

        return back()->with('success', 'Penerbangan dihapus.');
    }
}
