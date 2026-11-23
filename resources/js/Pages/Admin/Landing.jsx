import { useForm } from '@inertiajs/react';
import { ExternalLink, ImagePlus, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import AirlineLogos from '@/Components/admin/AirlineLogos';
import { Card, Input, PageHeader, Select, Textarea, cx } from '@/Components/ui';

const TABS = [
    ['hero', 'Hero'],
    ['about', 'Tentang Kami'],
    ['services', 'Layanan Utama'],
    ['packages', 'Paket Umrah'],
    ['others', 'Galeri, Testimoni & FAQ'],
];

const SERVICE_NAMES = ['Paket Umrah', 'Tiket Pesawat', 'Layanan Visa'];

/**
 * Editor konten landing page. Semua teks & gambar beranda diatur dari sini —
 * isi galeri, testimoni, FAQ, dan paket tetap dikelola di menunya masing-masing.
 */
export default function Landing({ content, previews, defaults, imageLabels, airlines = [] }) {
    // ?tab=packages dsb → langsung buka tab tertentu (mis. dari link "Logo maskapai" di form paket)
    const [tab, setTab] = useState(() => {
        const t = new URLSearchParams(window.location.search).get('tab');
        return TABS.some(([k]) => k === t) ? t : 'hero';
    });
    const form = useForm({
        ...content,
        files: { hero: null, about: null, services: [null, null, null] },
        reset: [],
    });
    const { data, setData, errors, processing } = form;

    const set = (section, key, value) => setData(section, { ...data[section], [key]: value });
    const setService = (i, key, value) => setData('services', data.services.map((s, j) => (j === i ? { ...s, [key]: value } : s)));
    const err = (k) => errors[k];

    const submit = (e) => {
        e.preventDefault();
        form.post(route('admin.landing.update'), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => form.setData((d) => ({ ...d, files: { hero: null, about: null, services: [null, null, null] }, reset: [] })),
        });
    };

    // Field yang error → pindah ke tab-nya agar terlihat
    useEffect(() => {
        const first = Object.keys(errors)[0];
        if (!first) return;
        const sec = first.split('.')[0];
        const map = { hero: 'hero', about: 'about', services: 'services', services_heading: 'services', packages: 'packages', files: tab };
        setTab(map[sec] ?? 'others');
    }, [errors]); // eslint-disable-line react-hooks/exhaustive-deps

    const image = (key, fileKey, i) => {
        const file = i === undefined ? data.files[fileKey] : data.files.services[i];
        const resetting = data.reset.includes(key);
        const pick = (f) => setData('files', i === undefined
            ? { ...data.files, [fileKey]: f }
            : { ...data.files, services: data.files.services.map((x, j) => (j === i ? f : x)) });
        const toggleReset = () => setData('reset', resetting ? data.reset.filter((r) => r !== key) : [...data.reset, key]);
        const isDefault = (previews[key] ?? null) === (key.startsWith('services') ? null : defaults[key.split('.')[0]].image);
        const errKey = i === undefined ? `files.${fileKey}` : `files.services.${i}`;
        return (
            <ImageField label={imageLabels[key]} current={resetting ? (key.startsWith('services') ? null : defaults[key.split('.')[0]].image) : previews[key]}
                file={file} onPick={pick} canReset={!isDefault} resetting={resetting} onReset={toggleReset} error={err(errKey)}
                hint={key.startsWith('services') ? 'Opsional. Kosongkan untuk memakai ikon bawaan. PNG transparan ±200×200 px.' : 'JPG/PNG/WEBP, maks 8 MB. Disarankan lebar ≥ 1600 px agar tetap tajam.'} />
        );
    };

    return (
        <AdminLayout title="Konten Beranda">
            <PageHeader title="Konten Beranda" subtitle="Ubah teks dan gambar setiap section di landing page. Perubahan langsung tampil setelah disimpan."
                actions={<a href="/" target="_blank" rel="noreferrer" className="btn-outline btn-sm"><ExternalLink className="h-4 w-4" />Lihat beranda</a>} />

            <div className="mb-5 flex flex-wrap gap-2">
                {TABS.map(([k, l]) => (
                    <button key={k} type="button" onClick={() => setTab(k)}
                        className={cx('rounded-full px-4 py-2 text-sm font-semibold transition', tab === k ? 'bg-brand-700 text-white shadow' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:text-brand-700')}>
                        {l}
                    </button>
                ))}
            </div>

            <form onSubmit={submit} className="space-y-6">
                {tab === 'hero' && (
                    <Card title="Hero (bagian paling atas)">
                        <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
                            <div className="space-y-4">
                                <Input label="Label kecil di atas judul" value={data.hero.badge} onChange={(e) => set('hero', 'badge', e.target.value)} error={err('hero.badge')} />
                                <Input label="Judul" value={data.hero.title} onChange={(e) => set('hero', 'title', e.target.value)} error={err('hero.title')} required />
                                <Input label="Lanjutan judul (warna hijau)" value={data.hero.highlight} onChange={(e) => set('hero', 'highlight', e.target.value)} error={err('hero.highlight')} />
                                <Textarea rows={3} label="Deskripsi" value={data.hero.subtitle} onChange={(e) => set('hero', 'subtitle', e.target.value)} error={err('hero.subtitle')} />
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <Input label="Tombol utama" value={data.hero.primary_label} onChange={(e) => set('hero', 'primary_label', e.target.value)} error={err('hero.primary_label')} hint="Menuju halaman Paket Umrah" />
                                    <Input label="Tombol kedua" value={data.hero.secondary_label} onChange={(e) => set('hero', 'secondary_label', e.target.value)} error={err('hero.secondary_label')} hint="Menggulir ke Tentang Kami" />
                                </div>
                                <ListField label="Poin keunggulan (maks 4)" max={4} items={data.hero.points} onChange={(v) => set('hero', 'points', v)} error={err('hero.points')} />
                            </div>
                            {image('hero.image', 'hero')}
                        </div>
                    </Card>
                )}

                {tab === 'about' && (
                    <Card title="Tentang Kami">
                        <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
                            <div className="space-y-4">
                                <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
                                    <Input label="Label" value={data.about.label} onChange={(e) => set('about', 'label', e.target.value)} error={err('about.label')} />
                                    <Input label="Judul" value={data.about.title} onChange={(e) => set('about', 'title', e.target.value)} error={err('about.title')} required />
                                </div>
                                <Textarea rows={2} label="Kalimat pembuka" value={data.about.lead} onChange={(e) => set('about', 'lead', e.target.value)} error={err('about.lead')} />
                                <Textarea rows={4} label="Deskripsi" value={data.about.body} onChange={(e) => set('about', 'body', e.target.value)} error={err('about.body')} />
                                <Textarea rows={4} label="Visi" value={data.about.vision} onChange={(e) => set('about', 'vision', e.target.value)} error={err('about.vision')} hint="Tekan Enter untuk membuat paragraf baru." />
                                <ListField label="Misi" max={10} items={data.about.mission} onChange={(v) => set('about', 'mission', v)} error={err('about.mission')} />
                            </div>
                            {image('about.image', 'about')}
                        </div>
                    </Card>
                )}

                {tab === 'services' && (
                    <Card title="Layanan Utama Kami">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Input label="Judul section" value={data.services_heading.title} onChange={(e) => set('services_heading', 'title', e.target.value)} error={err('services_heading.title')} />
                            <Input label="Subjudul" value={data.services_heading.subtitle} onChange={(e) => set('services_heading', 'subtitle', e.target.value)} error={err('services_heading.subtitle')} />
                        </div>
                        <div className="mt-6 grid gap-5 lg:grid-cols-3">
                            {data.services.map((s, i) => (
                                <div key={i} className="space-y-3 rounded-2xl border border-slate-200 p-4">
                                    <p className="text-xs font-bold uppercase tracking-wide text-brand-700">Kartu {i + 1} · tautan ke {SERVICE_NAMES[i]}</p>
                                    <Input label="Judul" value={s.title} onChange={(e) => setService(i, 'title', e.target.value)} error={err(`services.${i}.title`)} />
                                    <Textarea rows={3} label="Keterangan" value={s.text} onChange={(e) => setService(i, 'text', e.target.value)} error={err(`services.${i}.text`)} />
                                    {image(`services.${i}.image`, 'services', i)}
                                </div>
                            ))}
                        </div>
                    </Card>
                )}

                {tab === 'packages' && (
                    <Card title="Pilihan Paket Umrah">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Input label="Judul section" value={data.packages.title} onChange={(e) => set('packages', 'title', e.target.value)} error={err('packages.title')} />
                            <Input label="Label paket pertama" value={data.packages.badge} onChange={(e) => set('packages', 'badge', e.target.value)} error={err('packages.badge')} hint="Kosongkan untuk menyembunyikan label" />
                            <Textarea className="sm:col-span-2" rows={2} label="Subjudul" value={data.packages.subtitle} onChange={(e) => set('packages', 'subtitle', e.target.value)} error={err('packages.subtitle')} />
                            <Select label="Jumlah kartu paket" value={String(data.packages.count)} onChange={(e) => set('packages', 'count', Number(e.target.value))}
                                options={{ 4: '4 kartu (1 baris × 4)', 5: '5 kartu (1 baris × 5)', 8: '8 kartu (2 baris × 4)', 10: '10 kartu (2 baris × 5)' }} error={err('packages.count')} />
                        </div>
                        <p className="mt-4 rounded-xl bg-brand-50 p-3 text-sm text-brand-900">Poster, harga, dan detail paket diatur di menu <b>Paket Umrah</b>. Paket bertanda “unggulan” ditampilkan lebih dulu.</p>
                        <AirlineLogos airlines={airlines} />
                    </Card>
                )}

                {tab === 'others' && (
                    <div className="grid gap-6 lg:grid-cols-3">
                        {[['gallery', 'Galeri Kegiatan', 'Foto & video diatur di menu Galeri.'], ['testimonials', 'Testimoni', 'Isi testimoni diatur di menu Testimoni.'], ['faq', 'FAQ', 'Pertanyaan diatur di menu FAQ.']].map(([k, title, note]) => (
                            <Card key={k} title={title}>
                                <div className="space-y-4">
                                    <Input label="Judul section" value={data[k].title} onChange={(e) => set(k, 'title', e.target.value)} error={err(`${k}.title`)} />
                                    <Textarea rows={2} label="Subjudul" value={data[k].subtitle} onChange={(e) => set(k, 'subtitle', e.target.value)} error={err(`${k}.subtitle`)} />
                                    {k === 'faq' && <Textarea rows={3} label="Catatan di bawah FAQ" value={data.faq.note} onChange={(e) => set('faq', 'note', e.target.value)} error={err('faq.note')} />}
                                    <p className="text-xs text-slate-500">{note}</p>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}

                <div className="sticky bottom-0 z-10 -mx-1 flex items-center gap-3 border-t border-slate-200 bg-white/90 px-1 py-3 backdrop-blur">
                    <button disabled={processing} className="btn-primary px-8">{processing ? 'Menyimpan…' : 'Simpan Konten'}</button>
                    {form.isDirty && <span className="text-sm text-amber-700">Ada perubahan yang belum disimpan.</span>}
                </div>
            </form>
        </AdminLayout>
    );
}

/** Daftar teks yang bisa ditambah/hapus (poin keunggulan, misi). */
function ListField({ label, items, onChange, max, error }) {
    const list = items.length ? items : [''];
    return (
        <div>
            <label className="label">{label}</label>
            <div className="space-y-2">
                {list.map((v, i) => (
                    <div key={i} className="flex gap-2">
                        <input className="input" value={v} onChange={(e) => onChange(list.map((x, j) => (j === i ? e.target.value : x)))} />
                        <button type="button" onClick={() => onChange(list.filter((_, j) => j !== i))} className="btn-ghost btn-sm shrink-0 text-red-600" aria-label="Hapus baris">
                            <Trash2 className="h-4 w-4" />
                        </button>
                    </div>
                ))}
            </div>
            {list.length < max && (
                <button type="button" onClick={() => onChange([...list, ''])} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">
                    <Plus className="h-4 w-4" />Tambah baris
                </button>
            )}
            {error && <p className="error">{error}</p>}
        </div>
    );
}

function ImageField({ label, current, file, onPick, canReset, resetting, onReset, error, hint }) {
    const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
    useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);
    const src = preview ?? current;
    return (
        <div>
            <label className="label">{label}</label>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                {src
                    ? <img src={src} alt="" className="max-h-64 w-full object-contain" />
                    : <div className="grid h-32 place-items-center text-sm text-slate-400">Memakai ikon bawaan</div>}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
                <label className="btn-outline btn-sm cursor-pointer">
                    <ImagePlus className="h-4 w-4" />{file ? 'Ganti pilihan' : 'Unggah gambar'}
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { onPick(e.target.files[0] ?? null); e.target.value = ''; }} />
                </label>
                {file && <button type="button" onClick={() => onPick(null)} className="btn-ghost btn-sm">Batal</button>}
                {canReset && !file && (
                    <button type="button" onClick={onReset} className={cx('btn-ghost btn-sm', resetting && 'text-amber-700')}>
                        <RotateCcw className="h-4 w-4" />{resetting ? 'Batal kembalikan' : 'Kembalikan bawaan'}
                    </button>
                )}
            </div>
            {file && <p className="mt-1 text-xs text-brand-700">Baru: {file.name} — tersimpan setelah klik Simpan.</p>}
            {resetting && <p className="mt-1 text-xs text-amber-700">Akan dikembalikan ke gambar bawaan setelah disimpan.</p>}
            {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
            {error && <p className="error">{error}</p>}
        </div>
    );
}
