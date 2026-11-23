import { Link, router, useForm } from '@inertiajs/react';
import { Crop, FileImage, Film, Image as ImageIcon, Images, Loader2, Pencil, Play, Plus, RotateCcw, Star, Trash2, Upload, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import Modal from '@/Components/Modal';
import ImageCropper from '@/Components/ImageCropper';
import GalleryAudioCard from '@/Components/admin/GalleryAudioCard';
import { Badge, Card, Empty, PageHeader, Pagination, cx } from '@/Components/ui';
import { blobToFile, fileBase, formatBytes, shrinkToLimit } from '@/lib/image';

const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
let seq = 0;

/** Batas video = yang terkecil antara aturan aplikasi dan batas upload server */
const videoLimit = (limits) => Math.min(limits.video_mb * 1024 * 1024, limits.file || Infinity);

/** Kelola galeri: album foto (judul + subjudul + banyak foto) dan video */
export default function Gallery({ items, filter, counts, limits, audio }) {
    const [modal, setModal] = useState(null); // { mode: 'create' } | { mode: 'edit', item }
    const close = () => setModal(null);
    const total = Number(counts.foto ?? 0) + Number(counts.video ?? 0);
    const tabs = [[null, 'Semua', total], ['foto', 'Album Foto', counts.foto ?? 0], ['video', 'Video', counts.video ?? 0]];

    return (
        <AdminLayout title="Galeri">
            <PageHeader title="Galeri" subtitle="Satu album = satu judul + subjudul + banyak foto. Di halaman utama, pengunjung membuka album lalu menggeser fotonya."
                actions={<button onClick={() => setModal({ mode: 'create' })} className="btn-primary"><Plus className="h-4 w-4" />Tambah</button>} />

            <GalleryAudioCard audio={audio} maxBytes={Math.min(10 * 1024 * 1024, limits.file || Infinity)} />

            <div className="mb-4 inline-flex rounded-xl bg-slate-100 p-1">
                {tabs.map(([key, label, n]) => (
                    <Link key={label} href={route('admin.galeri.index', key ? { jenis: key } : {})} preserveScroll
                        className={cx('rounded-lg px-4 py-1.5 text-sm font-medium transition', filter === key ? 'bg-white text-brand-800 shadow-sm' : 'text-slate-600 hover:text-slate-900')}>
                        {label} <span className="ml-1 text-xs text-slate-400">{n}</span>
                    </Link>
                ))}
            </div>

            <Card pad={false}>
                {items.data.length === 0 ? <Empty title="Belum ada item galeri" text="Klik Tambah untuk membuat album foto atau mengunggah video." icon={ImageIcon} /> : (
                    <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {items.data.map((it) => (
                            <div key={it.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                                <button type="button" onClick={() => setModal({ mode: 'edit', item: it })} className="relative block aspect-[4/3] w-full bg-slate-900">
                                    {it.type === 'video' ? (
                                        <>
                                            <video src={it.image_url} preload="metadata" muted playsInline className="absolute inset-0 h-full w-full object-contain" />
                                            <span className="absolute inset-0 grid place-items-center"><span className="grid h-11 w-11 place-items-center rounded-full bg-white/90 text-brand-800 shadow"><Play className="ml-0.5 h-5 w-5 fill-current" /></span></span>
                                        </>
                                    ) : (
                                        <img src={it.image_url} alt={it.title} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                                    )}
                                    <Badge className="absolute left-2 top-2 bg-white/90 text-slate-700 ring-slate-300">{it.type === 'video' ? 'Video' : 'Album'}</Badge>
                                    {it.type !== 'video' && (
                                        <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/65 px-2 py-0.5 text-xs font-semibold text-white">
                                            <Images className="h-3.5 w-3.5" />{it.photo_items.length} foto
                                        </span>
                                    )}
                                </button>
                                <div className="p-3">
                                    <p className="line-clamp-1 font-semibold">{it.title}</p>
                                    <p className="line-clamp-2 min-h-[2rem] text-xs text-slate-500">{it.subtitle || <span className="italic text-slate-400">Tanpa subjudul</span>}</p>
                                    <div className="mt-2 flex justify-end gap-1">
                                        <button onClick={() => setModal({ mode: 'edit', item: it })} className="btn-ghost btn-sm" aria-label="Ubah"><Pencil className="h-4 w-4" /></button>
                                        <button onClick={() => confirm(`Hapus "${it.title}" dari galeri? Semua file di dalamnya juga akan dihapus.`) && router.delete(route('admin.galeri.destroy', it.id), { preserveScroll: true })}
                                            className="btn-ghost btn-sm text-red-600" aria-label="Hapus"><Trash2 className="h-4 w-4" /></button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                <Pagination meta={items} />
            </Card>

            <Modal show={!!modal} onClose={close} maxWidth="4xl">
                <div className="max-h-[90vh] overflow-y-auto p-5 sm:p-6">
                    {modal?.mode === 'create' && <CreateForm limits={limits} onDone={close} onCancel={close} />}
                    {modal?.mode === 'edit' && (modal.item.type === 'video'
                        ? <VideoEditForm item={modal.item} limits={limits} onDone={close} onCancel={close} />
                        : <AlbumEditForm item={modal.item} limits={limits} onDone={close} onCancel={close} />)}
                </div>
            </Modal>
        </AdminLayout>
    );
}

/** Object URL yang otomatis dilepas saat komponen ditutup */
function useObjectUrls() {
    const urls = useRef(new Set());
    useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), []);
    return {
        make: (blob) => { const u = URL.createObjectURL(blob); urls.current.add(u); return u; },
        drop: (u) => { if (u && urls.current.has(u)) { URL.revokeObjectURL(u); urls.current.delete(u); } },
    };
}

/** Foto baru yang dipilih admin: antrean crop, crop manual, hapus, kompres sebelum unggah. */
function usePhotoPicker(limits, setClientError) {
    const urls = useObjectUrls();
    const [photos, setPhotos] = useState([]); // { key, original, file, originalUrl, url, cropped }
    const [queue, setQueue] = useState([]);
    const [cropKey, setCropKey] = useState(null);
    const activeKey = cropKey ?? queue[0] ?? null;
    const active = photos.find((p) => p.key === activeKey);

    const add = (list) => {
        const all = [...list];
        const files = all.filter((f) => PHOTO_TYPES.includes(f.type));
        setClientError(all.length > files.length ? `${all.length - files.length} file dilewati karena bukan foto JPG/PNG/WEBP.` : null);
        if (!files.length) return;
        const entries = files.map((f) => { const u = urls.make(f); return { key: ++seq, original: f, file: f, originalUrl: u, url: u, cropped: false }; });
        setPhotos((ps) => [...ps, ...entries]);
        setQueue((q) => [...q, ...entries.map((e) => e.key)]); // langsung masuk mode crop (bisa dilewati)
    };
    const nextCrop = () => (cropKey ? setCropKey(null) : setQueue((q) => q.slice(1)));
    const applyCrop = (blob) => {
        const file = blobToFile(blob, active.original.name);
        const url = urls.make(file);
        if (active.url !== active.originalUrl) urls.drop(active.url);
        setPhotos((ps) => ps.map((p) => (p.key === active.key ? { ...p, file, url, cropped: true } : p)));
        nextCrop();
    };
    const resetCrop = (key) => setPhotos((ps) => ps.map((p) => {
        if (p.key !== key) return p;
        if (p.url !== p.originalUrl) urls.drop(p.url);
        return { ...p, file: p.original, url: p.originalUrl, cropped: false };
    }));
    const remove = (key) => {
        const p = photos.find((x) => x.key === key);
        if (p) { urls.drop(p.url); urls.drop(p.originalUrl); }
        setPhotos((ps) => ps.filter((x) => x.key !== key));
        setQueue((q) => q.filter((k) => k !== key));
    };
    const clear = () => { photos.forEach((p) => { urls.drop(p.url); urls.drop(p.originalUrl); }); setPhotos([]); setQueue([]); setCropKey(null); };

    /** File siap unggah (foto besar dikompres otomatis); melempar Error bila melebihi batas server */
    const prepare = async (extraBytes = 0) => {
        const files = [];
        for (const p of photos) files.push(await shrinkToLimit(p.file, limits.file));
        const size = files.reduce((s, f) => s + f.size, 0) + extraBytes;
        if (limits.post && size > limits.post * 0.95) {
            throw new Error(`Total ukuran foto ${formatBytes(size)} melebihi batas server ${formatBytes(limits.post)} per unggahan. Unggah sebagian dulu.`);
        }
        return files;
    };

    const cropper = active ? (() => {
        const remaining = cropKey ? 0 : queue.length - 1;
        return (
            <ImageCropper src={active.originalUrl} mime={active.original.type}
                heading={`${active.original.name}${remaining > 0 ? ` · ${remaining} foto lagi` : ''}`}
                onApply={applyCrop} onSkip={nextCrop} skipLabel={remaining > 0 ? 'Lewati foto ini' : 'Tanpa crop'}
                onCancel={() => { setCropKey(null); setQueue([]); }} cancelLabel={cropKey ? 'Batal' : 'Lewati semua'} />
        );
    })() : null;

    return { photos, add, remove, resetCrop, crop: setCropKey, clear, prepare, cropper };
}

function PhotoDrop({ onFiles, text = 'Klik atau tarik foto ke sini (bisa lebih dari satu)' }) {
    const [over, setOver] = useState(false);
    return (
        <label onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
            onDrop={(e) => { e.preventDefault(); setOver(false); onFiles(e.dataTransfer.files); }}
            className={cx('flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 border-dashed px-4 py-6 text-center transition',
                over ? 'border-brand-500 bg-brand-50' : 'border-slate-300 hover:border-brand-400 hover:bg-slate-50')}>
            <Upload className="h-6 w-6 text-brand-700" />
            <span className="text-sm font-medium">{text}</span>
            <span className="text-xs text-slate-500">JPG, PNG, WEBP · foto besar dikompres otomatis</span>
            <input type="file" className="sr-only" multiple accept={PHOTO_TYPES.join(',')} onChange={(e) => { onFiles(e.target.files); e.target.value = ''; }} />
        </label>
    );
}

function NewPhotoTile({ p, label, picker }) {
    return (
        <div className="overflow-hidden rounded-lg border border-slate-200">
            <div className="relative aspect-square bg-slate-900">
                <img src={p.url} alt="" className="absolute inset-0 h-full w-full object-contain" />
                <button type="button" onClick={() => picker.remove(p.key)} className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white hover:bg-red-600" aria-label="Hapus foto"><X className="h-4 w-4" /></button>
                {p.cropped && <Badge className="absolute left-1.5 top-1.5 bg-brand-700 text-white ring-brand-700">Di-crop</Badge>}
            </div>
            <div className="flex items-center justify-between gap-1 px-2 py-1.5">
                <span className="truncate text-[11px] text-slate-500" title={p.original.name}>{label}</span>
                <span className="flex shrink-0">
                    {p.cropped && <button type="button" onClick={() => picker.resetCrop(p.key)} className="btn-ghost btn-sm px-1.5" title="Kembalikan foto asli"><RotateCcw className="h-4 w-4" /></button>}
                    <button type="button" onClick={() => picker.crop(p.key)} className="btn-ghost btn-sm px-1.5 text-brand-700" title="Crop"><Crop className="h-4 w-4" /></button>
                </span>
            </div>
        </div>
    );
}

function TitleFields({ form }) {
    return (
        <div className="space-y-4">
            <div>
                <label className="label">Judul</label>
                <input className="input" value={form.data.title} onChange={(e) => form.setData('title', e.target.value)} placeholder="mis. Kegiatan Umrah Tahun 2025" maxLength={120} />
                {form.errors.title && <p className="error">{form.errors.title}</p>}
            </div>
            <div>
                <label className="label">Subjudul <span className="font-normal text-slate-400">(opsional)</span></label>
                <textarea className="input min-h-[70px]" value={form.data.subtitle ?? ''} onChange={(e) => form.setData('subtitle', e.target.value)}
                    placeholder="mis. Rombongan jamaah melempar jumrah di Mina" maxLength={255} />
                {form.errors.subtitle && <p className="error">{form.errors.subtitle}</p>}
            </div>
        </div>
    );
}

function Errors({ clientError, form, keys }) {
    const server = Object.entries(form.errors).filter(([k]) => keys.some((p) => k.startsWith(p))).map(([, v]) => v);
    if (!clientError && !server.length) return null;
    return (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {clientError && <p>{clientError}</p>}
            {[...new Set(server)].map((m) => <p key={m}>{m}</p>)}
        </div>
    );
}

function CreateForm({ limits, onDone, onCancel }) {
    const form = useForm({ type: 'foto', title: '', subtitle: '' });
    const urls = useObjectUrls();
    const [clientError, setClientError] = useState(null);
    const picker = usePhotoPicker(limits, setClientError);
    const [video, setVideo] = useState(null); // { file, url }
    const [preparing, setPreparing] = useState(false);
    const isFoto = form.data.type === 'foto';
    const maxVideo = videoLimit(limits);

    const setType = (type) => {
        if (type === form.data.type) return;
        picker.clear();
        if (video) urls.drop(video.url);
        setVideo(null); setClientError(null);
        form.clearErrors();
        form.setData('type', type);
    };

    const pickVideo = (list) => {
        const f = list[0];
        if (!f) return;
        if (!VIDEO_TYPES.includes(f.type)) return setClientError('File video harus MP4, WEBM, atau MOV.');
        if (f.size > maxVideo) return setClientError(`Ukuran video ${formatBytes(f.size)} melebihi batas ${formatBytes(maxVideo)}. Kompres videonya terlebih dulu.`);
        if (video) urls.drop(video.url);
        setClientError(null);
        setVideo({ file: f, url: urls.make(f) });
    };

    const submit = async (e) => {
        e.preventDefault();
        setClientError(null);
        let payload;
        if (isFoto) {
            if (!picker.photos.length) return setClientError('Pilih minimal satu foto.');
            if (picker.photos.length > Math.min(limits.max_photos, limits.files)) return setClientError(`Maksimal ${Math.min(limits.max_photos, limits.files)} foto per album sekali unggah.`);
            setPreparing(true);
            try { payload = { photos: await picker.prepare() }; } catch (err) { setPreparing(false); return setClientError(err.message); }
            setPreparing(false);
        } else {
            if (!video) return setClientError('Pilih file video.');
            payload = { video: video.file };
        }
        form.transform((d) => ({ ...d, ...payload }));
        form.post(route('admin.galeri.store'), { forceFormData: true, preserveScroll: true, onSuccess: onDone });
    };

    if (picker.cropper) return picker.cropper;

    const base = fileBase(form.data.title);
    const busy = preparing || form.processing;

    return (
        <form onSubmit={submit} className="space-y-5">
            <h2 className="text-xl">Tambah Galeri</h2>

            <div>
                <label className="label">Jenis</label>
                <div className="grid gap-3 sm:grid-cols-2">
                    <TypeOption active={isFoto} onClick={() => setType('foto')} icon={Images} title="Album Foto" text="Satu judul untuk banyak foto. Pengunjung menggeser fotonya." />
                    <TypeOption active={!isFoto} onClick={() => setType('video')} icon={Film} title="Video" text={`Satu file MP4, WEBM, atau MOV · maks. ${formatBytes(maxVideo)}.`} />
                </div>
            </div>

            <TitleFields form={form} />

            <div>
                <label className="label">{isFoto ? `Foto album (${picker.photos.length})` : 'Video'}</label>
                {isFoto ? (
                    <>
                        <PhotoDrop onFiles={picker.add} />
                        {picker.photos.length > 0 && (
                            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                                {picker.photos.map((p, i) => <NewPhotoTile key={p.key} p={p} picker={picker} label={i === 0 ? 'Sampul album' : `Foto ${i + 1}`} />)}
                            </div>
                        )}
                    </>
                ) : !video ? (
                    <label className="flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 border-dashed border-slate-300 px-4 py-6 text-center transition hover:border-brand-400 hover:bg-slate-50"
                        onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); pickVideo(e.dataTransfer.files); }}>
                        <Upload className="h-6 w-6 text-brand-700" />
                        <span className="text-sm font-medium">Klik atau tarik video ke sini</span>
                        <span className="text-xs text-slate-500">MP4, WEBM, MOV · maks. {formatBytes(maxVideo)}</span>
                        <input type="file" className="sr-only" accept={VIDEO_TYPES.join(',')} onChange={(e) => { pickVideo(e.target.files); e.target.value = ''; }} />
                    </label>
                ) : (
                    <div className="overflow-hidden rounded-xl border border-slate-200">
                        <video src={video.url} controls className="max-h-[50vh] w-full bg-black" />
                        <div className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                            <span className="truncate">{video.file.name} <span className="text-slate-400">· {formatBytes(video.file.size)}</span></span>
                            <button type="button" onClick={() => { urls.drop(video.url); setVideo(null); }} className="btn-ghost btn-sm text-red-600"><X className="h-4 w-4" />Ganti</button>
                        </div>
                    </div>
                )}
            </div>

            {(isFoto ? picker.photos.length > 0 : !!video) && (
                <p className="flex items-start gap-2 rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-900">
                    <FileImage className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>Nama file: <b className="font-mono">{isFoto && picker.photos.length > 1 ? `${base}-1 … ${base}-${picker.photos.length}` : base}</b> (tanggal hari ini + judul). Foto pertama menjadi sampul album.</span>
                </p>
            )}

            <Errors clientError={clientError} form={form} keys={['photos', 'video', 'type']} />
            {form.progress && <UploadProgress value={form.progress.percentage} />}

            <div className="flex justify-end gap-2">
                <button type="button" onClick={onCancel} className="btn-outline" disabled={busy}>Batal</button>
                <button className="btn-primary" disabled={busy}>
                    {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                    {preparing ? 'Menyiapkan…' : form.processing ? 'Mengunggah…' : isFoto ? `Simpan Album${picker.photos.length ? ` (${picker.photos.length} foto)` : ''}` : 'Simpan Video'}
                </button>
            </div>
        </form>
    );
}

/** Ubah album: judul/subjudul, hapus foto lama, jadikan sampul, tambah foto baru */
function AlbumEditForm({ item, limits, onDone, onCancel }) {
    const form = useForm({ title: item.title, subtitle: item.subtitle ?? '' });
    const [keep, setKeep] = useState(item.photo_items); // foto lama yang dipertahankan (urutan = urutan tampil)
    const [clientError, setClientError] = useState(null);
    const picker = usePhotoPicker(limits, setClientError);
    const [preparing, setPreparing] = useState(false);

    const makeCover = (path) => setKeep((k) => [k.find((p) => p.path === path), ...k.filter((p) => p.path !== path)]);

    const submit = async (e) => {
        e.preventDefault();
        setClientError(null);
        if (!keep.length && !picker.photos.length) return setClientError('Album harus berisi minimal satu foto.');
        if (keep.length + picker.photos.length > limits.max_photos) return setClientError(`Maksimal ${limits.max_photos} foto per album.`);
        let photos = [];
        setPreparing(true);
        try { photos = await picker.prepare(); } catch (err) { setPreparing(false); return setClientError(err.message); }
        setPreparing(false);
        form.transform((d) => ({ ...d, keep: keep.map((p) => p.path), photos }));
        form.post(route('admin.galeri.update', item.id), { forceFormData: true, preserveScroll: true, onSuccess: onDone });
    };

    if (picker.cropper) return picker.cropper;

    const busy = preparing || form.processing;
    const removed = item.photo_items.length - keep.length;

    return (
        <form onSubmit={submit} className="space-y-5">
            <h2 className="text-xl">Ubah Album</h2>
            <TitleFields form={form} />

            <div>
                <label className="label">Foto album ({keep.length + picker.photos.length})</label>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {keep.map((p, i) => (
                        <div key={p.path} className="overflow-hidden rounded-lg border border-slate-200">
                            <div className="relative aspect-square bg-slate-900">
                                <img src={p.url} alt="" className="absolute inset-0 h-full w-full object-contain" />
                                <button type="button" onClick={() => setKeep((k) => k.filter((x) => x.path !== p.path))}
                                    className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white hover:bg-red-600" aria-label="Hapus foto"><X className="h-4 w-4" /></button>
                                {i === 0 && <Badge className="absolute left-1.5 top-1.5 bg-gold-500 text-white ring-gold-500">Sampul</Badge>}
                            </div>
                            <div className="flex items-center justify-between gap-1 px-2 py-1.5">
                                <span className="truncate font-mono text-[11px] text-slate-500" title={p.name}>{p.name}</span>
                                {i > 0 && <button type="button" onClick={() => makeCover(p.path)} className="btn-ghost btn-sm px-1.5 text-amber-600" title="Jadikan sampul"><Star className="h-4 w-4" /></button>}
                            </div>
                        </div>
                    ))}
                    {picker.photos.map((p) => <NewPhotoTile key={p.key} p={p} picker={picker} label="Baru" />)}
                </div>
                <div className="mt-3"><PhotoDrop onFiles={picker.add} text="Tambah foto ke album ini" /></div>
                {removed > 0 && <p className="mt-2 text-xs text-red-600">{removed} foto akan dihapus permanen saat disimpan.</p>}
            </div>

            <Errors clientError={clientError} form={form} keys={['photos', 'keep']} />
            {form.progress && <UploadProgress value={form.progress.percentage} />}

            <div className="flex justify-end gap-2">
                <button type="button" onClick={onCancel} className="btn-outline" disabled={busy}>Batal</button>
                <button className="btn-primary" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}{preparing ? 'Menyiapkan…' : form.processing ? 'Menyimpan…' : 'Simpan'}</button>
            </div>
        </form>
    );
}

function VideoEditForm({ item, limits, onDone, onCancel }) {
    const form = useForm({ title: item.title, subtitle: item.subtitle ?? '' });
    const urls = useObjectUrls();
    const [result, setResult] = useState(null); // { file, url }
    const [clientError, setClientError] = useState(null);
    const maxVideo = videoLimit(limits);

    const pick = (list) => {
        const f = list[0];
        if (!f) return;
        setClientError(null);
        if (!VIDEO_TYPES.includes(f.type)) return setClientError('File video harus MP4, WEBM, atau MOV.');
        if (f.size > maxVideo) return setClientError(`Ukuran video ${formatBytes(f.size)} melebihi batas ${formatBytes(maxVideo)}.`);
        setResult({ file: f, url: urls.make(f) });
    };

    const submit = (e) => {
        e.preventDefault();
        form.transform((d) => ({ ...d, ...(result ? { file: result.file } : {}) }));
        form.post(route('admin.galeri.update', item.id), { forceFormData: true, preserveScroll: true, onSuccess: onDone });
    };

    const shown = result?.url ?? item.image_url;

    return (
        <form onSubmit={submit} className="space-y-5">
            <h2 className="text-xl">Ubah Video</h2>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-900">
                <video key={shown} src={shown} controls className="max-h-[45vh] w-full" />
            </div>
            <div className="flex flex-wrap gap-2">
                <label className="btn-outline btn-sm cursor-pointer">
                    <Upload className="h-4 w-4" />Ganti video
                    <input type="file" className="sr-only" accept={VIDEO_TYPES.join(',')} onChange={(e) => { pick(e.target.files); e.target.value = ''; }} />
                </label>
                {result && <button type="button" onClick={() => setResult(null)} className="btn-ghost btn-sm"><RotateCcw className="h-4 w-4" />Batalkan penggantian</button>}
                <span className="self-center text-xs text-slate-500">maks. {formatBytes(maxVideo)}</span>
            </div>
            <TitleFields form={form} />
            <Errors clientError={clientError} form={form} keys={['file']} />
            {form.progress && <UploadProgress value={form.progress.percentage} />}
            <div className="flex justify-end gap-2">
                <button type="button" onClick={onCancel} className="btn-outline" disabled={form.processing}>Batal</button>
                <button className="btn-primary" disabled={form.processing}>{form.processing && <Loader2 className="h-4 w-4 animate-spin" />}{form.processing ? 'Menyimpan…' : 'Simpan'}</button>
            </div>
        </form>
    );
}

function TypeOption({ active, onClick, icon: Icon, title, text }) {
    return (
        <button type="button" onClick={onClick}
            className={cx('flex items-start gap-3 rounded-xl border-2 p-3 text-left transition', active ? 'border-brand-600 bg-brand-50' : 'border-slate-200 hover:border-slate-300')}>
            <span className={cx('grid h-10 w-10 shrink-0 place-items-center rounded-lg', active ? 'bg-brand-700 text-white' : 'bg-slate-100 text-slate-500')}><Icon className="h-5 w-5" /></span>
            <span>
                <span className="block font-semibold">{title}</span>
                <span className="block text-xs text-slate-500">{text}</span>
            </span>
        </button>
    );
}

function UploadProgress({ value }) {
    return (
        <div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${value ?? 0}%` }} /></div>
            <p className="mt-1 text-right text-xs tabular-nums text-slate-500">Mengunggah {value ?? 0}%</p>
        </div>
    );
}
