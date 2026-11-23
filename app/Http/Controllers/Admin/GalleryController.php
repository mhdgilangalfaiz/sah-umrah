<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Gallery;
use App\Services\GalleryMedia;
use App\Support\Audit;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

/**
 * Kelola galeri.
 *  - Foto: satu item = satu album (judul + subjudul + banyak foto, sudah di-crop di browser).
 *  - Video: satu file per item, maks. 100 MB.
 *  - Nama file: {tgl-bln-thn}-{judul}, mis. 20-11-26-kota-malam.jpg (lihat GalleryMedia).
 */
class GalleryController extends Controller
{
    private const PHOTO_RULE = 'image|mimes:jpg,jpeg,png,webp|max:10240';            // 10 MB

    public const VIDEO_MAX_MB = 100;

    private static function videoRule(): string
    {
        return 'file|mimetypes:video/mp4,video/webm,video/quicktime|max:'.(self::VIDEO_MAX_MB * 1024);
    }

    private const MESSAGES = [
        'photos.required_if' => 'Pilih minimal satu foto.',
        'video.required_if' => 'Pilih file video.',
        'photos.*.image' => 'File foto harus berupa gambar (JPG, PNG, atau WEBP).',
        'photos.*.max' => 'Ukuran tiap foto maksimal 10 MB.',
        'video.mimetypes' => 'File video harus MP4, WEBM, atau MOV.',
        'video.max' => 'Ukuran video maksimal '.self::VIDEO_MAX_MB.' MB.',
        'video.uploaded' => 'Video gagal diunggah — ukurannya melebihi batas upload server.',
        'photos.*.uploaded' => 'Foto gagal diunggah — ukurannya melebihi batas upload server.',
    ];

    public function index(Request $request)
    {
        $type = in_array($request->query('jenis'), ['foto', 'video'], true) ? $request->query('jenis') : null;

        return Inertia::render('Admin/Gallery', [
            'items' => Gallery::when($type, fn ($q) => $q->where('type', $type))->latest('id')->paginate(24)->withQueryString(),
            'filter' => $type,
            'counts' => Gallery::selectRaw('type, count(*) as total')->groupBy('type')->pluck('total', 'type'),
            'limits' => GalleryMedia::limits() + ['video_mb' => self::VIDEO_MAX_MB, 'max_photos' => Gallery::MAX_PHOTOS],
            'audio' => [
                'url' => GalleryAudioController::url(),
                'title' => \App\Models\Setting::get(GalleryAudioController::TITLE_KEY) ?: null,
                'is_link' => str_starts_with((string) \App\Models\Setting::get(GalleryAudioController::KEY), 'http'),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'type' => ['required', Rule::in(array_keys(Gallery::TYPES))],
            'title' => 'required|string|max:120',
            'subtitle' => 'nullable|string|max:255',
            'event_date' => 'nullable|date',
            'location' => 'nullable|string|max:150',
            'description' => 'nullable|string|max:2000',
            'photos' => 'required_if:type,foto|array|max:'.Gallery::MAX_PHOTOS,
            'photos.*' => self::PHOTO_RULE,
            'video' => 'required_if:type,video|nullable|'.self::videoRule(),
        ], self::MESSAGES);

        $gallery = new Gallery(['type' => $data['type'], ...self::details($data)]);

        if ($data['type'] === 'foto') {
            $files = $request->file('photos', []);
            $numbered = count($files) > 1; // banyak foto → -1, -2, …
            $gallery->setPhotoPaths(array_map(fn ($f) => GalleryMedia::store($f, 'foto', $data['title'], $numbered), $files));
            $label = 'album '.count($files).' foto';
        } else {
            $gallery->image = GalleryMedia::store($request->file('video'), 'video', $data['title']);
            $label = 'video';
        }

        $gallery->save();
        Audit::log('konten.galeri.tambah', "Menambah $label galeri \"{$data['title']}\"", $gallery);

        return back()->with('success', ucfirst($label).' berhasil ditambahkan ke galeri.');
    }

    /**
     * Ubah judul/subjudul. Album foto: `keep` = foto lama yang dipertahankan (sesuai urutan), `photos` = foto tambahan.
     * Video: `file` = video pengganti (opsional).
     */
    public function update(Request $request, Gallery $gallery)
    {
        $data = $request->validate([
            'title' => 'required|string|max:120',
            'subtitle' => 'nullable|string|max:255',
            'event_date' => 'nullable|date',
            'location' => 'nullable|string|max:150',
            'description' => 'nullable|string|max:2000',
            'keep' => 'nullable|array',
            'keep.*' => 'string',
            'photos' => 'nullable|array|max:'.Gallery::MAX_PHOTOS,
            'photos.*' => self::PHOTO_RULE,
            'file' => 'nullable|'.self::videoRule(),
        ], self::MESSAGES + ['file.max' => 'Ukuran video maksimal '.self::VIDEO_MAX_MB.' MB.']);

        $before = $gallery->paths();
        $gallery->fill(self::details($data));
        $titleChanged = $gallery->isDirty('title');
        $date = $gallery->created_at ?? now();

        if ($gallery->isVideo()) {
            if ($request->hasFile('file')) {
                $gallery->image = GalleryMedia::store($request->file('file'), 'video', $data['title']);
                GalleryMedia::delete($before[0] ?? null);
            } elseif ($titleChanged && $gallery->image) {
                $gallery->image = GalleryMedia::renameForTitle($gallery->image, 'video', $data['title'], $date);
            }
        } else {
            $keep = array_values(array_intersect($request->input('keep', []), $before)); // hanya path milik album ini
            $new = $request->file('photos', []);
            if (! $keep && ! $new) {
                throw ValidationException::withMessages(['photos' => 'Album harus berisi minimal satu foto.']);
            }
            if (count($keep) + count($new) > Gallery::MAX_PHOTOS) {
                throw ValidationException::withMessages(['photos' => 'Maksimal '.Gallery::MAX_PHOTOS.' foto per album.']);
            }
            $numbered = count($keep) + count($new) > 1;
            if ($titleChanged) {
                $keep = array_map(fn ($p) => GalleryMedia::renameForTitle($p, 'foto', $data['title'], $date, $numbered), $keep);
            }
            foreach ($new as $file) {
                $keep[] = GalleryMedia::store($file, 'foto', $data['title'], $numbered);
            }
            foreach (array_diff($before, $request->input('keep', [])) as $removed) {
                GalleryMedia::delete($removed);
            }
            $gallery->setPhotoPaths($keep);
        }

        $gallery->save();
        Audit::changes('konten.galeri.ubah', "Mengubah galeri #{$gallery->id}", $gallery);

        return back()->with('success', 'Galeri diperbarui.');
    }

    /** Judul, subjudul & detail yang tampil di lightbox halaman utama */
    private static function details(array $data): array
    {
        return [
            'title' => $data['title'], 'subtitle' => $data['subtitle'] ?? null, 'event_date' => $data['event_date'] ?? null,
            'location' => $data['location'] ?? null, 'description' => $data['description'] ?? null,
        ];
    }

    public function destroy(Gallery $gallery)
    {
        Audit::log('konten.galeri.hapus', "Menghapus galeri #{$gallery->id} \"{$gallery->title}\"", $gallery);
        foreach ($gallery->paths() as $path) {
            GalleryMedia::delete($path);
        }
        $gallery->delete();

        return back()->with('success', 'Item galeri dihapus.');
    }
}
