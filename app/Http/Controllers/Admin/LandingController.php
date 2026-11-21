<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Support\Audit;
use App\Support\LandingContent;
use Illuminate\Http\Request;
use Inertia\Inertia;

/** Kelola isi landing page: teks setiap section dan gambar hero / tentang kami / ikon layanan. */
class LandingController extends Controller
{
    private const IMAGE_RULE = 'nullable|image|mimes:jpg,jpeg,png,webp|max:8192';

    public function edit()
    {
        return Inertia::render('Admin/Landing', [
            'content' => LandingContent::raw(),
            'previews' => collect(LandingContent::IMAGES)->keys()
                ->mapWithKeys(fn ($k) => [$k => LandingContent::url(data_get(LandingContent::raw(), $k))]),
            'defaults' => LandingContent::defaults(),
            'imageLabels' => LandingContent::IMAGES,
        ]);
    }

    public function update(Request $request)
    {
        $t = 'required|string|max:200';
        $long = 'nullable|string|max:2000';
        $data = $request->validate([
            'hero.badge' => 'nullable|string|max:120',
            'hero.title' => $t,
            'hero.highlight' => 'nullable|string|max:200',
            'hero.subtitle' => 'nullable|string|max:600',
            'hero.primary_label' => 'required|string|max:60',
            'hero.secondary_label' => 'required|string|max:60',
            'hero.points' => 'array|max:4',
            'hero.points.*' => 'nullable|string|max:40',

            'about.label' => 'required|string|max:60',
            'about.title' => $t,
            'about.lead' => $long,
            'about.body' => $long,
            'about.vision' => $long,
            'about.mission' => 'array|max:10',
            'about.mission.*' => 'nullable|string|max:300',

            'services_heading.title' => $t,
            'services_heading.subtitle' => 'nullable|string|max:300',
            'services' => 'array|size:3',
            'services.*.title' => 'required|string|max:80',
            'services.*.text' => 'nullable|string|max:300',

            'packages.title' => $t,
            'packages.subtitle' => 'nullable|string|max:300',
            'packages.badge' => 'nullable|string|max:40',
            'packages.count' => 'required|integer|in:4,5,8,10',

            'gallery.title' => $t,
            'gallery.subtitle' => 'nullable|string|max:300',
            'testimonials.title' => $t,
            'testimonials.subtitle' => 'nullable|string|max:300',
            'faq.title' => $t,
            'faq.subtitle' => 'nullable|string|max:300',
            'faq.note' => 'nullable|string|max:400',

            'files' => 'array',
            'files.hero' => self::IMAGE_RULE,
            'files.about' => self::IMAGE_RULE,
            'files.services' => 'array',
            'files.services.*' => self::IMAGE_RULE,
            'reset' => 'array',
            'reset.*' => 'string',
        ], [
            '*.image' => 'File harus berupa gambar (JPG, PNG, atau WEBP).',
            '*.max' => 'Ukuran/panjang melebihi batas.',
        ]);

        $old = LandingContent::raw();
        $content = $old;
        foreach (array_keys(LandingContent::defaults()) as $section) {
            if (! isset($data[$section])) {
                continue;
            }
            if ($section === 'services') {
                foreach ($data['services'] as $i => $item) {
                    $content['services'][$i]['title'] = $item['title'];
                    $content['services'][$i]['text'] = $item['text'] ?? '';
                }
            } else {
                $content[$section] = array_merge($content[$section], $data[$section]);
            }
        }
        // daftar: buang baris kosong
        $content['hero']['points'] = array_values(array_filter(array_map('trim', $content['hero']['points'] ?? [])));
        $content['about']['mission'] = array_values(array_filter(array_map('trim', $content['about']['mission'] ?? [])));
        $content['packages']['count'] = (int) $content['packages']['count'];

        // Gambar: unggah baru menggantikan lama; "reset" mengembalikan ke gambar bawaan.
        $uploads = [
            'hero.image' => $request->file('files.hero'),
            'about.image' => $request->file('files.about'),
        ];
        foreach ([0, 1, 2] as $i) {
            $uploads["services.$i.image"] = $request->file("files.services.$i");
        }
        $defaults = LandingContent::defaults();
        foreach ($uploads as $key => $file) {
            $current = data_get($old, $key);
            if (in_array($key, $data['reset'] ?? [], true)) {
                LandingContent::deleteImage($current);
                data_set($content, $key, data_get($defaults, $key));
            }
            if ($file) {
                LandingContent::deleteImage(data_get($content, $key) === $current ? $current : null);
                data_set($content, $key, LandingContent::storeImage($file, $key));
            }
        }

        LandingContent::save($content);
        Audit::log('konten.beranda_ubah', 'Mengubah konten landing page');

        return back()->with('success', 'Konten beranda disimpan. Perubahan langsung tampil di landing page.');
    }
}
