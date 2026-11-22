<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Jamaah;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;

/**
 * Data jamaah dikelompokkan per akun perwakilan (pemilik akun yang memesan).
 * Satu baris = satu akun; dibuka → daftar orang yang ia daftarkan.
 * Hanya lihat: NIK tidak ditampilkan, nomor paspor tersamar. Paspor wajib berlaku ≥ 6 bulan → ditandai.
 */
class JamaahController extends Controller
{
    public const PASSPORT_MIN_MONTHS = 6;

    public function index(Request $request)
    {
        $soon = today()->addMonths(self::PASSPORT_MIN_MONTHS);

        // Syarat pada jamaah (dipakai untuk memilih akun & menyaring isi grup)
        $jamaahFilter = function (Builder $q) use ($request, $soon) {
            $q->when($request->gender, fn ($q, $g) => $q->where('gender', $g))
                ->when($request->paspor, fn ($q, $p) => match ($p) {
                    'kosong' => $q->whereNull('passport_expiry'),
                    'habis' => $q->where('passport_expiry', '<', today()),
                    'segera' => $q->whereBetween('passport_expiry', [today(), $soon]),
                    'aman' => $q->where('passport_expiry', '>', $soon),
                    default => $q,
                });
        };
        $filtered = $request->filled('gender') || $request->filled('paspor');
        $pendingDocs = fn ($q) => $q->where('status', 'menunggu')->whereIn('type', \App\Models\Document::JAMAAH_TYPES);

        $accounts = User::customers()
            ->whereHas('jamaah', $jamaahFilter)
            ->when($request->dokumen === 'menunggu', fn ($q) => $q->whereHas('documents', $pendingDocs))
            ->when($request->q, fn ($q, $s) => $q->where(fn ($w) => $w->where('name', 'like', "%$s%")->orWhere('email', 'like', "%$s%")
                ->orWhere('customer_code', 'like', "%$s%")->orWhere('phone', 'like', "%$s%")
                ->orWhereHas('jamaah', fn ($j) => $j->where('full_name', 'like', "%$s%"))))
            ->withCount(['jamaah', 'bookings', 'documents as pending_docs' => $pendingDocs])
            ->with(['jamaah' => fn ($q) => $q->select('id', 'user_id', 'full_name', 'relation', 'passport_expiry')->when($filtered, $jamaahFilter)->orderByRaw("relation = 'diri_sendiri' desc")->orderBy('full_name')])
            ->latest()->paginate(15)->withQueryString()
            ->through(fn (User $u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'phone' => $u->phone,
                'code' => $u->customer_code,
                'jamaah_count' => $u->jamaah_count,
                'bookings' => $u->bookings_count,
                'pending_docs' => $u->pending_docs,
                'warnings' => $u->jamaah->filter(fn ($j) => in_array($this->passportStatus($j, $soon), ['habis', 'segera', 'kosong'], true))->count(),
                // pratinjau nama (yang cocok dengan filter, bila ada); detail lengkap di halaman akun
                'names' => $u->jamaah->pluck('full_name')->take(4)->values(),
                'matched' => $u->jamaah->count(),
            ]);

        return Inertia::render('Admin/Jamaah', [
            'accounts' => $accounts,
            'summary' => [
                'accounts' => User::customers()->whereHas('jamaah')->count(),
                'total' => Jamaah::count(),
                'habis' => Jamaah::where('passport_expiry', '<', today())->count(),
                'segera' => Jamaah::whereBetween('passport_expiry', [today(), $soon])->count(),
                'kosong' => Jamaah::whereNull('passport_expiry')->count(),
                'dokumen' => \App\Models\Document::where('status', 'menunggu')->whereIn('type', \App\Models\Document::JAMAAH_TYPES)->count(),
            ],
            'filters' => $request->only('q', 'gender', 'paspor', 'dokumen'),
        ]);
    }

    /** Detail satu akun perwakilan: profil, kartu tiap jamaah (paspor, dokumen, perjalanan), riwayat pesanan. */
    public function show(User $user)
    {
        abort_if($user->isAdmin(), 404);
        $soon = today()->addMonths(self::PASSPORT_MIN_MONTHS);
        $user->load([
            'jamaah' => fn ($q) => $q->with(['mahram:id,full_name', 'documents' => fn ($d) => $d->whereIn('type', \App\Models\Document::JAMAAH_TYPES)->latest(), 'trips.orderable'])->orderByRaw("relation = 'diri_sendiri' desc")->orderBy('full_name'),
            'bookings' => fn ($q) => $q->with('departure.package:id,name')->latest(),
            'flightOrders' => fn ($q) => $q->with('flight')->latest(),
        ]);

        $tripLabel = fn ($o) => match (true) {
            $o instanceof \App\Models\Booking => ['kind' => 'Umrah', 'code' => $o->code, 'title' => $o->departure?->package?->name, 'date' => $o->departure?->departure_date?->toDateString(), 'status' => $o->status, 'url' => route('admin.bookings.show', $o)],
            $o instanceof \App\Models\FlightOrder => ['kind' => 'Tiket', 'code' => $o->code, 'title' => $o->flight ? "{$o->flight->origin_city} → {$o->flight->destination_city}" : 'Tiket pesawat', 'date' => $o->flight?->depart_at?->toDateString(), 'status' => $o->status, 'url' => route('admin.flight-orders.show', $o)],
            default => null,
        };

        $docRow = fn (\App\Models\Document $d) => [
            'id' => $d->id, 'type' => $d->type_label, 'file_name' => $d->file_name, 'status' => $d->status,
            'rejection_note' => $d->rejection_note, 'size' => $d->size, 'created_at' => $d->created_at->format('d/m/Y H:i'), 'url' => $d->signedUrl(30),
        ];

        return Inertia::render('Admin/JamaahShow', [
            // dokumen akun yang tidak dikaitkan ke jamaah tertentu
            'accountDocuments' => $user->documents()->whereNull('jamaah_id')->whereIn('type', \App\Models\Document::JAMAAH_TYPES)->latest()->get()->map($docRow)->values(),
            'account' => [
                'id' => $user->id, 'name' => $user->name, 'email' => $user->email, 'phone' => $user->phone, 'code' => $user->customer_code,
                'city' => $user->city, 'avatar' => $user->avatar ? (str_starts_with($user->avatar, 'http') ? $user->avatar : \Storage::disk('public')->url($user->avatar)) : null,
                'is_active' => $user->is_active, 'verified' => (bool) $user->email_verified_at, 'profile_completed' => (bool) $user->profile_completed_at,
                'joined' => $user->created_at->format('d/m/Y'), 'last_login' => $user->last_login_at?->diffForHumans(),
            ],
            'jamaah' => $user->jamaah->map(fn (Jamaah $j) => [
                'id' => $j->id,
                'name' => $j->full_name,
                'relation' => Jamaah::RELATIONS[$j->relation] ?? $j->relation,
                'is_self' => $j->relation === 'diri_sendiri',
                'gender' => $j->gender,
                'age' => $j->birth_date?->age,
                'birth' => trim(($j->birth_place ? $j->birth_place.', ' : '').($j->birth_date?->format('d/m/Y') ?? '')) ?: null,
                'phone' => $j->phone,
                'has_nik' => (bool) $j->nik,
                'passport' => $j->masked_passport,
                'passport_place' => $j->passport_place,
                'passport_expiry' => $j->passport_expiry?->format('d/m/Y'),
                'passport_status' => $this->passportStatus($j, $soon),
                'mahram' => $j->mahram?->full_name ? $j->mahram->full_name.($j->mahram_relation ? " ({$j->mahram_relation})" : '') : ($j->mahram_relation ?: null),
                'documents' => $j->documents->map($docRow)->values(),
                'trips' => $j->trips->map(fn ($t) => $t->orderable ? $tripLabel($t->orderable) : null)->filter()->values(),
            ])->values(),
            'bookings' => $user->bookings->map(fn ($b) => $tripLabel($b) + ['pax' => $b->pax_count, 'total' => (int) $b->total_amount, 'paid' => (int) $b->paid_amount])->values(),
            'flightOrders' => $user->flightOrders->map(fn ($f) => $tripLabel($f) + ['pax' => $f->pax_count, 'total' => (int) $f->total_amount, 'paid' => (int) $f->paid_amount])->values(),
        ]);
    }

    private function passportStatus(Jamaah $j, $soon): string
    {
        if (! $j->passport_expiry) return 'kosong';
        if ($j->passport_expiry->lt(today())) return 'habis';

        return $j->passport_expiry->lte($soon) ? 'segera' : 'aman';
    }
}
