<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ChatbotIntent;
use App\Models\Faq;
use App\Models\Post;
use App\Models\Testimonial;
use App\Models\VisaService;
use App\Services\FileStorage;
use App\Support\Audit;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;

/**
 * CRUD generik untuk data sederhana. Definisi field dikirim ke halaman React (Admin/Crud)
 * sehingga satu halaman melayani banyak jenis data.
 * Tipe field: text, textarea, richtext, number, select, checkbox, image, list (array string per baris), datetime
 */
class CrudController extends Controller
{
    private function resources(): array
    {
        return [
            'visa' => [
                'model' => VisaService::class, 'title' => 'Jenis Layanan Visa', 'roles' => ['operasional'],
                'columns' => ['name' => 'Nama', 'price_usd' => 'Harga (USD)', 'price' => 'Estimasi Rp (kurs kini)', 'processing_days' => 'Estimasi (hari)', 'is_active' => 'Aktif'],
                'fields' => [
                    ['name' => 'name', 'label' => 'Nama layanan', 'type' => 'text', 'rules' => 'required|string|max:120'],
                    ['name' => 'description', 'label' => 'Deskripsi', 'type' => 'textarea', 'rules' => 'nullable|string|max:3000'],
                    ['name' => 'requirements', 'label' => 'Persyaratan dokumen (satu per baris)', 'type' => 'list', 'rules' => 'nullable|array'],
                    ['name' => 'processing_days', 'label' => 'Estimasi proses (hari kerja)', 'type' => 'number', 'rules' => 'required|integer|min:1|max:90'],
                    ['name' => 'price_usd', 'label' => 'Biaya per orang (USD) — Rupiah mengikuti kurs di Pengaturan', 'type' => 'number', 'rules' => 'required|numeric|min:0|max:100000', 'audit_price' => true],
                    ['name' => 'is_active', 'label' => 'Aktif', 'type' => 'checkbox', 'rules' => 'boolean'],
                ],
            ],
            'chatbot' => [
                'model' => ChatbotIntent::class, 'title' => 'Basis Jawaban Chatbox', 'roles' => ['cs'],
                'description' => 'Kata kunci dipisah koma. Chatbox mencocokkan pertanyaan pelanggan dengan kata kunci ini; bila tidak ada yang cocok, pelanggan ditawari terhubung ke admin.',
                'columns' => ['title' => 'Judul', 'category' => 'Kategori', 'keywords' => 'Kata kunci', 'hits' => 'Dipakai', 'is_active' => 'Aktif'],
                'fields' => [
                    ['name' => 'title', 'label' => 'Judul', 'type' => 'text', 'rules' => 'required|string|max:120'],
                    ['name' => 'category', 'label' => 'Kategori', 'type' => 'select', 'options' => ['umum' => 'Umum', 'umrah' => 'Umrah', 'tiket' => 'Tiket', 'visa' => 'Visa', 'pembayaran' => 'Pembayaran', 'dokumen' => 'Dokumen'], 'rules' => 'required|string'],
                    ['name' => 'keywords', 'label' => 'Kata kunci (pisahkan dengan koma)', 'type' => 'textarea', 'rules' => 'required|string|max:1000'],
                    ['name' => 'answer', 'label' => 'Jawaban', 'type' => 'textarea', 'rules' => 'required|string|max:3000'],
                    ['name' => 'quick_replies', 'label' => 'Tombol lanjutan (satu per baris)', 'type' => 'list', 'rules' => 'nullable|array'],
                    ['name' => 'is_active', 'label' => 'Aktif', 'type' => 'checkbox', 'rules' => 'boolean'],
                ],
            ],
            'testimoni' => [
                'model' => Testimonial::class, 'title' => 'Testimoni', 'roles' => ['super_admin'],
                'columns' => ['name' => 'Nama', 'city' => 'Kota', 'rating' => 'Rating', 'is_active' => 'Tampil'],
                'fields' => [
                    ['name' => 'name', 'label' => 'Nama', 'type' => 'text', 'rules' => 'required|string|max:100'],
                    ['name' => 'city', 'label' => 'Kota', 'type' => 'text', 'rules' => 'nullable|string|max:60'],
                    ['name' => 'content', 'label' => 'Isi testimoni', 'type' => 'textarea', 'rules' => 'required|string|max:1500'],
                    ['name' => 'rating', 'label' => 'Rating (1-5)', 'type' => 'number', 'rules' => 'required|integer|min:1|max:5'],
                    ['name' => 'photo', 'label' => 'Foto', 'type' => 'image', 'rules' => 'nullable|image|max:2048'],
                    ['name' => 'is_active', 'label' => 'Tampilkan', 'type' => 'checkbox', 'rules' => 'boolean'],
                ],
            ],
            'faq' => [
                'model' => Faq::class, 'title' => 'FAQ', 'roles' => ['super_admin', 'cs'],
                'columns' => ['question' => 'Pertanyaan', 'sort' => 'Urutan'],
                'fields' => [
                    ['name' => 'question', 'label' => 'Pertanyaan', 'type' => 'text', 'rules' => 'required|string|max:250'],
                    ['name' => 'answer', 'label' => 'Jawaban', 'type' => 'textarea', 'rules' => 'required|string|max:3000'],
                    ['name' => 'sort', 'label' => 'Urutan', 'type' => 'number', 'rules' => 'required|integer|min:0'],
                ],
            ],
            'blog' => [
                'model' => Post::class, 'title' => 'Blog / Artikel', 'roles' => ['super_admin'],
                'columns' => ['cover_image' => 'Sampul', 'title' => 'Judul', 'published_at' => 'Terbit'],
                'fields' => [
                    ['name' => 'title', 'label' => 'Judul', 'type' => 'text', 'rules' => 'required|string|max:200'],
                    ['name' => 'excerpt', 'label' => 'Ringkasan', 'type' => 'textarea', 'rules' => 'nullable|string|max:500'],
                    ['name' => 'content', 'label' => 'Isi artikel (HTML sederhana diperbolehkan)', 'type' => 'richtext', 'rules' => 'required|string|max:50000'],
                    ['name' => 'cover_image', 'label' => 'Gambar sampul', 'type' => 'image', 'rules' => 'nullable|image|max:4096'],
                    ['name' => 'published_at', 'label' => 'Tanggal terbit (kosong = draft)', 'type' => 'datetime', 'rules' => 'nullable|date'],
                ],
            ],
        ];
    }

    private function resolve(string $resource): array
    {
        $cfg = $this->resources()[$resource] ?? abort(404);
        abort_unless(auth()->user()->hasRole(...$cfg['roles']), 403, 'Peran Anda tidak memiliki akses ke menu ini.');

        return $cfg;
    }

    public function index(string $resource)
    {
        $cfg = $this->resolve($resource);
        $items = $cfg['model']::latest('id')->paginate(25);

        return Inertia::render('Admin/Crud', [
            'resource' => $resource,
            'title' => $cfg['title'],
            'description' => $cfg['description'] ?? null,
            'columns' => $cfg['columns'],
            'fields' => collect($cfg['fields'])->map(fn ($f) => collect($f)->except('rules', 'audit_price'))->values(),
            'items' => $items,
        ]);
    }

    private function payload(Request $request, array $cfg, $model = null): array
    {
        $rules = [];
        foreach ($cfg['fields'] as $f) {
            $rules[$f['name']] = str_replace('required_without:id|', $model ? '' : 'required|', $f['rules']);
            if ($f['type'] === 'list') $rules[$f['name'].'.*'] = 'string|max:300';
        }
        $data = $request->validate($rules);

        foreach ($cfg['fields'] as $f) {
            if ($f['type'] === 'image') {
                if ($request->hasFile($f['name'])) {
                    $data[$f['name']] = FileStorage::storePublic($request->file($f['name']), 'media', $request->input('title', $request->input('name', 'gambar')));
                } else {
                    unset($data[$f['name']]);
                }
            }
            if ($f['type'] === 'checkbox') $data[$f['name']] = $request->boolean($f['name']);
            if ($f['type'] === 'list') $data[$f['name']] = array_values(array_filter($data[$f['name']] ?? [], fn ($v) => trim($v) !== ''));
            if ($f['type'] === 'richtext') $data[$f['name']] = strip_tags($data[$f['name']], '<p><br><b><strong><i><em><ul><ol><li><h2><h3><h4><blockquote><a><img>');
        }

        return $data;
    }

    public function store(Request $request, string $resource)
    {
        $cfg = $this->resolve($resource);
        $data = $this->payload($request, $cfg);
        if ($cfg['model'] === Post::class) {
            $data['slug'] = Str::slug($data['title']).'-'.Str::lower(Str::random(4));
            $data['author_id'] = $request->user()->id;
        }
        $item = $cfg['model']::create($data);
        Audit::log("konten.$resource.tambah", "Menambah {$cfg['title']} #{$item->id}", $item);

        return back()->with('success', $cfg['title'].' ditambahkan.');
    }

    public function update(Request $request, string $resource, int $id)
    {
        $cfg = $this->resolve($resource);
        $item = $cfg['model']::findOrFail($id);
        $item->fill($this->payload($request, $cfg, $item));
        $priceField = collect($cfg['fields'])->firstWhere('audit_price', true);
        $action = $priceField && $item->isDirty($priceField['name']) ? "konten.$resource.harga_ubah" : "konten.$resource.ubah";
        $item->save();
        Audit::changes($action, "Mengubah {$cfg['title']} #{$item->id}", $item);

        return back()->with('success', $cfg['title'].' diperbarui.');
    }

    public function destroy(string $resource, int $id)
    {
        $cfg = $this->resolve($resource);
        $item = $cfg['model']::findOrFail($id);
        if ($item instanceof VisaService && $item->applications()->exists()) {
            abort(422, 'Layanan visa sudah memiliki pengajuan. Nonaktifkan saja.');
        }
        Audit::log("konten.$resource.hapus", "Menghapus {$cfg['title']} #{$item->id}", $item);
        $item->delete();

        return back()->with('success', $cfg['title'].' dihapus.');
    }
}
