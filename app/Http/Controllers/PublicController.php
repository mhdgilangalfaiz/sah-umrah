<?php

namespace App\Http\Controllers;

use App\Models\Faq;
use App\Models\Flight;
use App\Models\Gallery;
use App\Models\Package;
use App\Models\Page;
use App\Models\Post;
use App\Models\Setting;
use App\Models\Testimonial;
use App\Models\VisaService;
use App\Services\Flights\FlightSearch;
use App\Support\LandingContent;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PublicController extends Controller
{
    public function home()
    {
        $content = LandingContent::forDisplay();

        // Paket unggulan diutamakan, lalu dilengkapi paket aktif lain (jumlah kartu diatur admin).
        return Inertia::render('Public/Home', [
            'content' => $content,
            'featured' => Package::active()->with('upcomingDepartures')->orderByDesc('is_featured')->orderBy('price_quad')->take($content['packages']['count'])->get(),
            'galleries' => Gallery::latest('id')->take(60)->get(['id', 'title', 'type', 'image', 'category']),
            'galleryCategories' => Gallery::CATEGORIES,
            'testimonials' => Testimonial::where('is_active', true)->latest()->take(6)->get(),
            'faqs' => Faq::orderBy('sort')->get(['id', 'question', 'answer']),
        ]);
    }

    public function packages(Request $request)
    {
        $q = Package::active()->with('upcomingDepartures');

        if ($m = $request->integer('bulan')) {
            $q->whereHas('upcomingDepartures', fn ($d) => $d->whereMonth('departure_date', $m));
        }
        if ($d = $request->integer('durasi')) {
            $q->where('duration_days', $d);
        }
        if ($t = $request->string('jenis')->toString()) {
            $q->where('type', $t);
        }
        if ($max = $request->integer('harga_maks')) {
            $q->where('price_quad', '<=', $max);
        }
        $sort = $request->string('urut', 'termurah')->toString();
        $sort === 'termahal' ? $q->orderByDesc('price_quad') : $q->orderBy('price_quad');

        return Inertia::render('Public/Packages', [
            'packages' => $q->paginate(12)->withQueryString(),
            'filters' => $request->only('bulan', 'durasi', 'jenis', 'harga_maks', 'urut'),
            'types' => Package::TYPES,
        ]);
    }

    public function package(Package $package)
    {
        abort_unless($package->is_active, 404);

        return Inertia::render('Public/PackageShow', [
            'package' => $package->load('upcomingDepartures'),
            'roomTypes' => Package::ROOM_TYPES,
            'payment' => [
                'deposit_per_pax' => config('payment.deposit_per_pax'),
                'min_installment' => config('payment.min_installment_amount'),
                'settlement_days' => config('payment.settlement_days_before_departure'),
            ],
        ]);
    }

    public function flights(Request $request, FlightSearch $search)
    {
        $criteria = $request->validate([
            'asal' => 'nullable|string|max:5',
            'tujuan' => 'nullable|string|max:5',
            'tanggal' => 'nullable|date',
            'penumpang' => 'nullable|integer|min:1|max:9',
            'kelas' => 'nullable|in:ekonomi,bisnis',
            'jenis' => 'nullable|in:oneway,pp',
            'transit' => 'nullable|in:langsung,transit',
        ]);
        $searched = $request->hasAny(['asal', 'tujuan', 'tanggal', 'jenis', 'transit']);

        return Inertia::render('Public/Flights', [
            'criteria' => $criteria,
            'results' => $searched ? $search->search($criteria) : $search->upcoming(),
            'searched' => $searched,
            'airports' => $search->airports(),
            'checkedAt' => now()->format('Y-m-d H:i:s'),
        ]);
    }

    public function visa()
    {
        return Inertia::render('Public/Visa', [
            'services' => VisaService::where('is_active', true)->get(),
        ]);
    }

    public function blog()
    {
        return Inertia::render('Public/Blog', [
            'posts' => Post::published()->latest('published_at')->paginate(9),
        ]);
    }

    public function post(Post $post)
    {
        abort_unless($post->published_at && $post->published_at->isPast(), 404);

        return Inertia::render('Public/PostShow', [
            'post' => $post->load('author:id,name'),
            'others' => Post::published()->where('id', '!=', $post->id)->latest('published_at')->take(3)->get(),
        ]);
    }

    public function contact()
    {
        return Inertia::render('Public/Contact', [
            'page' => Page::where('slug', 'kontak')->first(),
            'mapEmbed' => Setting::get('map_embed'),
        ]);
    }

    public function page(string $slug)
    {
        return Inertia::render('Public/Page', ['page' => Page::where('slug', $slug)->firstOrFail()]);
    }
}
