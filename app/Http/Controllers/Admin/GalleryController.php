<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Gallery;
use App\Services\GalleryMedia;
use App\Support\Audit;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

/**
 * Kelola galeri (foto & video).
 *  - Foto: boleh banyak sekaligus, sudah di-crop di browser; tiap foto menjadi satu item galeri.
 *  - Video: satu file per item.
 *  - Nama file: {tgl-bln-thn}-{judul}, mis. 20-11-26-kota-malam.jpg (lihat GalleryMedia).
 */
class GalleryController extends Controller
{
    private const PHOTO_RULE = 'image|mimes:jpg,jpeg,png,webp|max:10240';            // 10 MB

    private const VIDEO_RULE = 'file|mimetypes:video/mp4,video/webm,video/quicktime|max:102400'; // 100 MB

    public function index(Request $request)
    {
        $type = in_array($request->query('jenis'), ['foto', 'video'], true) ? $request->query('jenis') : null;

        return Inertia::render('Admin/Gallery', [
            'items' => Gallery::when($type, fn ($q) => $q->where('type', $type))->latest('id')->paginate(24)->withQueryString(),
            'filter' => $type,
            'counts' => Gallery::selectRaw('type, count(*) as total')->groupBy('type')->pluck('total', 'type'),
            'categories' => Gallery::CATEGORIES,
            'limits' => GalleryMedia::limits(),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'type' => ['required', Rule::in(array_keys(Gallery::TYPES))],
            'title' => 'required|string|max:120',
            'category' => ['required', Rule::in(array_keys(Gallery::CATEGORIES))],
            'photos' => 'required_if:type,foto|array|max:20',
            'photos.*' => self::PHOTO_RULE,
            'video' => 'required_if:type,video|nullable|'.self::VIDEO_RULE,
        ], [
            'photos.required_if' => 'Pilih minimal satu foto.',
            'video.required_if' => 'Pilih file video.',
            'photos.*.image' => 'File foto harus berupa gambar (JPG, PNG, atau WEBP).',
            'video.mimetypes' => 'File video harus MP4, WEBM, atau MOV.',
        ]);

        $files = $data['type'] === 'foto' ? $request->file('photos', []) : [$request->file('video')];
        $numbered = count($files) > 1; // banyak foto sekaligus → -1, -2, …
        $created = [];
        foreach ($files as $file) {
            $created[] = Gallery::create([
                'title' => $data['title'],
                'type' => $data['type'],
                'category' => $data['category'],
                'image' => GalleryMedia::store($file, $data['type'], $data['title'], $numbered),
            ]);
        }

        $label = $data['type'] === 'foto' ? count($created).' foto' : 'video';
        Audit::log('konten.galeri.tambah', "Menambah $label galeri \"{$data['title']}\"", $created[0] ?? null);

        return back()->with('success', ucfirst($label).' berhasil ditambahkan ke galeri.');
    }

    public function update(Request $request, Gallery $gallery)
    {
        $data = $request->validate([
            'title' => 'required|string|max:120',
            'category' => ['required', Rule::in(array_keys(Gallery::CATEGORIES))],
            'file' => 'nullable|'.($gallery->isVideo() ? self::VIDEO_RULE : self::PHOTO_RULE),
        ]);

        $gallery->fill(['title' => $data['title'], 'category' => $data['category']]);

        if ($request->hasFile('file')) {
            $old = $gallery->image;
            $gallery->image = GalleryMedia::store($request->file('file'), $gallery->type, $data['title']);
            GalleryMedia::delete($old);
        } elseif ($gallery->isDirty('title') && $gallery->image) {
            $gallery->image = GalleryMedia::renameForTitle($gallery->image, $gallery->type, $data['title'], $gallery->created_at ?? now());
        }

        $gallery->save();
        Audit::changes('konten.galeri.ubah', "Mengubah galeri #{$gallery->id}", $gallery);

        return back()->with('success', 'Galeri diperbarui.');
    }

    public function destroy(Gallery $gallery)
    {
        Audit::log('konten.galeri.hapus', "Menghapus galeri #{$gallery->id} ({$gallery->file_name})", $gallery);
        GalleryMedia::delete($gallery->image);
        $gallery->delete();

        return back()->with('success', 'Item galeri dihapus.');
    }
}
