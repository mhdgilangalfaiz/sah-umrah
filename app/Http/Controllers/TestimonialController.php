<?php

namespace App\Http\Controllers;

use App\Models\Testimonial;
use App\Support\AdminNotifier;
use Illuminate\Http\Request;

/** Ulasan jamaah dari tombol "Tulis Ulasan" di landing page. Tampil setelah disetujui admin. */
class TestimonialController extends Controller
{
    public function store(Request $request)
    {
        // Kolom jebakan bot: manusia tidak melihat kolom ini, jadi harus kosong.
        if ($request->filled('website')) {
            return back()->with('success', 'Terima kasih, ulasan Anda sudah kami terima.');
        }

        $data = $request->validate([
            'name' => 'required|string|max:100',
            'city' => 'nullable|string|max:60',
            'rating' => 'required|integer|min:1|max:5',
            'departure_month' => 'nullable|date_format:Y-m|before_or_equal:'.now()->format('Y-m'),
            'package_name' => 'nullable|string|max:150',
            'content' => 'required|string|min:20|max:1500',
        ], [], [
            'name' => 'nama', 'city' => 'kota', 'departure_month' => 'bulan berangkat', 'package_name' => 'paket', 'content' => 'ulasan',
        ]);

        $t = Testimonial::create([...$data, 'is_active' => false]);

        AdminNotifier::notify('konten', 'Ulasan jamaah baru', "{$t->name} memberi rating {$t->rating}/5. Periksa lalu tampilkan bila sesuai.", route('admin.crud.index', 'testimoni'));

        return back()->with('success', 'Terima kasih, ulasan Anda sudah kami terima dan akan tampil setelah diperiksa admin.');
    }
}
