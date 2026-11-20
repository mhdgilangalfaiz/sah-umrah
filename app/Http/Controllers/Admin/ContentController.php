<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Page;
use App\Models\Setting;
use App\Support\Audit;
use Illuminate\Http\Request;
use Inertia\Inertia;

/** Halaman statis (Tentang Kami, Kontak, S&K, Privasi, Refund) + pengaturan perusahaan */
class ContentController extends Controller
{
    public function pages()
    {
        return Inertia::render('Admin/Pages', ['pages' => Page::orderBy('title')->get()]);
    }

    public function updatePage(Request $request, Page $page)
    {
        $data = $request->validate(['title' => 'required|string|max:150', 'content' => 'required|string|max:100000']);
        $data['content'] = strip_tags($data['content'], '<p><br><b><strong><i><em><ul><ol><li><h2><h3><h4><blockquote><a><table><tr><td><th>');
        $page->update($data);
        Audit::log('konten.halaman_ubah', "Mengubah halaman {$page->title}", $page);

        return back()->with('success', 'Halaman diperbarui.');
    }

    public function settings()
    {
        return Inertia::render('Admin/Settings', ['settings' => Setting::allCached()]);
    }

    public function updateSettings(Request $request)
    {
        $data = $request->validate([
            'company_name' => 'required|string|max:150',
            'company_tagline' => 'nullable|string|max:200',
            'company_address' => 'required|string|max:300',
            'company_phone' => 'required|string|max:50',
            'company_email' => 'required|email',
            'license_ppiu' => 'required|string|max:150',
            'office_hours' => 'nullable|string|max:150',
            'map_embed' => 'nullable|url|max:1000',
            'hero_title' => 'required|string|max:200',
            'hero_subtitle' => 'nullable|string|max:400',
        ]);
        $old = Setting::allCached();
        foreach ($data as $k => $v) {
            Setting::updateOrCreate(['key' => $k], ['value' => $v]);
        }
        Audit::log('konten.pengaturan_ubah', 'Mengubah pengaturan perusahaan', null, array_intersect_key($old, $data), $data);

        return back()->with('success', 'Pengaturan disimpan.');
    }
}
