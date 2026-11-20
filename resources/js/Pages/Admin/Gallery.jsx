import { Link, router, useForm } from '@inertiajs/react';
import { Crop, FileImage, Film, Image as ImageIcon, Loader2, Pencil, Play, Plus, RotateCcw, Trash2, Upload, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import Modal from '@/Components/Modal';
import ImageCropper from '@/Components/ImageCropper';
import { Badge, Card, Empty, PageHeader, Pagination, cx } from '@/Components/ui';
import { blobToFile, fileBase, formatBytes, shrinkToLimit } from '@/lib/image';

const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const mimeFromName = (name = '') => ({ png: 'image/png', webp: 'image/webp' }[name.split('.').pop()?.toLowerCase()] ?? 'image/jpeg');
let seq = 0;

/** Kelola galeri: foto (banyak sekaligus + crop bebas) dan video */
export default function Gallery({ items, filter, counts, categories, limits }) {
    const [modal, setModal] = useState(null); // { mode: 'create' } | { mode: 'edit', item }
    const close = () => setModal(null);
    const total = Number(counts.foto ?? 0) + Number(counts.video ?? 0);
    const tabs = [[null, 'Semua', total], ['foto', 'Foto', counts.foto ?? 0], ['video', 'Video', counts.video ?? 0]];

    return (
        <AdminLayout title="Galeri">
            <PageHeader title="Galeri" subtitle="Foto & video kegiatan yang tampil di halaman utama. Nama file otomatis: tanggal masuk + judul, mis. 20-11-26-kota-malam.jpg."
                actions={<button onClick={() => setModal({ mode: 'create' })} className="btn-primary"><Plus className="h-4 w-4" />Tambah</button>} />

            <div className="mb-4 inline-flex rounded-xl bg-slate-100 p-1">
                {tabs.map(([key, label, n]) => (
                    <Link key={label} href={route('admin.galeri.index', key ? { jenis: key } : {})} preserveScroll
                        className={cx('rounded-lg px-4 py-1.5 text-sm font-medium transition', filter === key ? 'bg-white text-brand-800 shadow-sm' : 'text-slate-600 hover:text-slate-900')}>
                        {label} <span className="ml-1 text-xs text-slate-400">{n}</span>
                    </Link>
                ))}
            </div>

            <Card pad={false}>
                {items.data.length === 0 ? <Empty title="Belum ada item galeri" text="Klik Tambah untuk mengunggah foto atau video." icon={ImageIcon} /> : (
                    <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {items.data.map((it) => (
                            <div key={it.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                                <div className="relative aspect-[4/3] bg-slate-900">
                                    {it.type === 'video' ? (
                                        <>
                                            <video src={it.image_url} preload="metadata" muted playsInline className="absolute inset-0 h-full w-full object-contain" />
                                            <span className="absolute inset-0 grid place-items-center"><span className="grid h-11 w-11 place-items-center rounded-full bg-white/90 text-brand-800 shadow"><Play className="ml-0.5 h-5 w-5 fill-current" /></span></span>
                                        </>
                                    ) : (
                                        <img src={it.image_url} alt={it.title} loading="lazy" className="absolute inset-0 h-full w-full object-contain" />
                                    )}
                                    <Badge className="absolute left-2 top-2 bg-white/90 text-slate-700 ring-slate-300">{it.type === 'video' ? 'Video' : 'Foto'}</Badge>
                                </div>
                                <div className="p-3">
                                    <p className="line-clamp-1 font-semibold capitalize">{it.title}</p>
                                    <p className="text-xs text-slate-500">{categories[it.category] ?? it.category}</p>
                                    <p className="mt-1 truncate font-mono text-[11px] text-slate-400" title={it.file_name}>{it.file_name}</p>
                                    <div className="mt-2 flex justify-end gap-1">
                                        <button onClick={() => setModal({ mode: 'edit', item: it })} className="btn-ghost btn-sm" aria-label="Ubah"><Pencil className="h-4 w-4" /></button>
                                        <button onClick={() => confirm(`Hapus "${it.file_name}" dari galeri? File juga akan dihapus.`) && router.delete(route('admin.galeri.destroy', it.id), { preserveScroll: true })}
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
                    {modal?.mode === 'create' && <CreateForm categories={categories} limits={limits} onDone={close} onCancel={close} />}
                    {modal?.mode === 'edit' && <EditForm item={modal.item} categories={categories} limits={limits} onDone={close} onCancel={close} />}
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

function CreateForm({ categories, limits, onDone, onCancel }) {
    const form = useForm({ type: 'foto', title: '', category: Object.keys(categories)[0] });
    const urls = useObjectUrls();
    const [photos, setPhotos] = useState([]); // { key, original, file, originalUrl, url, cropped }
    const [queue, setQueue] = useState([]); // key foto yang menunggu mode crop setelah dipilih
    const [cropKey, setCropKey] = useState(null); // crop manual satu foto
    const [video, setVideo] = useState(null); // { file, url }
    const [clientError, setClientError] = useState(null);
    const [preparing, setPreparing] = useState(false);
    const [dragOver, setDragOver] = useState(false);

    const isFoto = form.data.type === 'foto';
    const activeKey = cropKey ?? queue[0] ?? null;
    const active = photos.find((p) => p.key === activeKey);

    const setType = (type) => {
        if (type === form.data.type) return;
        photos.forEach((p) => { urls.drop(p.url); urls.drop(p.originalUrl); });
        if (video) urls.drop(video.url);
        setPhotos([]); setQueue([]); setCropKey(null); setVideo(null); setClientError(null);
        form.clearErrors();
        form.setData('type', type);
    };

    const addPhotos = (list) => {
        const all = [...list];
        const files = all.filter((f) => PHOTO_TYPES.includes(f.type));
        setClientError(all.length > files.length ? `${all.length - files.length} file dilewati karena bukan foto JPG/PNG/WEBP.` : null);
        if (!files.length) return;
        const entries = files.map((f) => { const u = urls.make(f); return { key: ++seq, original: f, file: f, originalUrl: u, url: u, cropped: false }; });
        setPhotos((ps) => [...ps, ...entries]);
        setQueue((q) => [...q, ...entries.map((e) => e.key)]); // langsung masuk mode crop (bisa dilewati)
    };

    const pickVideo = (list) => {
        const f = list[0];
        if (!f) return;
        if (!VIDEO_TYPES.includes(f.type)) return setClientError('File video harus MP4, WEBM, atau MOV.');
        if (limits.file && f.size > limits.file) {
            return setClientError(`Ukuran video ${formatBytes(f.size)} melebihi batas upload server (${formatBytes(limits.file)}). Naikkan "Max file upload size" di Herd → Settings → PHP, atau kompres videonya.`);
        }
        if (video) urls.drop(video.url);
        setClientError(null);
        setVideo({ file: f, url: urls.make(f) });
    };

    const nextCrop = () => (cropKey ? setCropKey(null) : setQueue((q) => q.slice(1)));
    const stopCropping = () => { setCropKey(null); setQueue([]); };

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

    const removePhoto = (key) => {
        const p = photos.find((x) => x.key === key);
        if (p) { urls.drop(p.url); urls.drop(p.originalUrl); }
        setPhotos((ps) => ps.filter((x) => x.key !== key));
        setQueue((q) => q.filter((k) => k !== key));
    };

    const submit = async (e) => {
        e.preventDefault();
        setClientError(null);
        let payload;
        if (isFoto) {
            if (!photos.length) return setClientError('Pilih minimal satu foto.');
            if (photos.length > Math.min(20, limits.files)) return setClientError(`Maksimal ${Math.min(20, limits.files)} foto sekali unggah.`);
            setPreparing(true);
            try {
                const files = [];
                for (const p of photos) files.push(await shrinkToLimit(p.file, limits.file)); // foto besar dikompres otomatis
                const size = files.reduce((s, f) => s + f.size, 0);
                if (limits.post && size > limits.post * 0.95) {
                    throw new Error(`Total ukuran foto ${formatBytes(size)} melebihi batas server ${formatBytes(limits.post)} per unggahan. Unggah sebagian dulu, atau naikkan batas upload di Herd → Settings → PHP.`);
                }
                payload = { photos: files };
            } catch (err) {
                setPreparing(false);
                return setClientError(err.message);
            }
            setPreparing(false);
        } else {
            if (!video) return setClientError('Pilih file video.');
            payload = { video: video.file };
        }
        form.transform((d) => ({ ...d, ...payload }));
        form.post(route('admin.galeri.store'), { forceFormData: true, preserveScroll: true, onSuccess: onDone });
    };

    if (active) {
        const remaining = cropKey ? 0 : queue.length - 1;
        return (
            <ImageCropper src={active.originalUrl} mime={active.original.type}
                heading={`${active.original.name}${remaining > 0 ? ` · ${remaining} foto lagi` : ''}`}
                onApply={applyCrop} onSkip={nextCrop} skipLabel={remaining > 0 ? 'Lewati foto ini' : 'Tanpa crop'}
                onCancel={stopCropping} cancelLabel={cropKey ? 'Batal' : 'Lewati semua'} />
        );
    }

    const base = fileBase(form.data.title);
    const many = isFoto && photos.length > 1;
    const serverErrors = Object.entries(form.errors).filter(([k]) => k.startsWith('photos') || k === 'video' || k === 'type').map(([, v]) => v);
    const busy = preparing || form.processing;
    const drop = (e) => { e.preventDefault(); setDragOver(false); isFoto ? addPhotos(e.dataTransfer.files) : pickVideo(e.dataTransfer.files); };

    return (
        <form onSubmit={submit} className="space-y-5">
            <h2 className="text-xl">Tambah Galeri</h2>

            <div>
                <label className="label">Jenis media</label>
                <div className="grid gap-3 sm:grid-cols-2">
                    <TypeOption active={isFoto} onClick={() => setType('foto')} icon={ImageIcon} title="Foto" text="Pilih banyak foto sekaligus, bisa di-crop bebas." />
                    <TypeOption active={!isFoto} onClick={() => setType('video')} icon={Film} title="Video" text="Satu file video MP4, WEBM, atau MOV." />
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
                <div>
                    <label className="label">Judul</label>
                    <input className="input" value={form.data.title} onChange={(e) => form.setData('title', e.target.value)} placeholder="mis. Mekah" maxLength={120} />
                    {form.errors.title && <p className="error">{form.errors.title}</p>}
                </div>
                <div>
                    <label className="label">Kategori</label>
                    <select className="input" value={form.data.category} onChange={(e) => form.setData('category', e.target.value)}>
                        {Object.entries(categories).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                    {form.errors.category && <p className="error">{form.errors.category}</p>}
                </div>
            </div>

            <div>
                <label className="label">{isFoto ? 'Foto' : 'Video'}</label>
                {(isFoto || !video) && (
                    <label onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={drop}
                        className={cx('flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 border-dashed px-4 py-6 text-center transition',
                            dragOver ? 'border-brand-500 bg-brand-50' : 'border-slate-300 hover:border-brand-400 hover:bg-slate-50')}>
                        <Upload className="h-6 w-6 text-brand-700" />
                        <span className="text-sm font-medium">{isFoto ? 'Klik atau tarik foto ke sini (bisa lebih dari satu)' : 'Klik atau tarik video ke sini'}</span>
                        <span className="text-xs text-slate-500">
                            {isFoto ? 'JPG, PNG, WEBP · foto besar dikompres otomatis' : `MP4, WEBM, MOV · maks. ${formatBytes(limits.file)} (batas server)`}
                        </span>
                        <input type="file" className="sr-only" multiple={isFoto} accept={(isFoto ? PHOTO_TYPES : VIDEO_TYPES).join(',')}
                            onChange={(e) => { isFoto ? addPhotos(e.target.files) : pickVideo(e.target.files); e.target.value = ''; }} />
                    </label>
                )}

                {isFoto && photos.length > 0 && (
                    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {photos.map((p, i) => (
                            <div key={p.key} className="overflow-hidden rounded-lg border border-slate-200">
                                <div className="relative aspect-square bg-slate-900">
                                    <img src={p.url} alt="" className="absolute inset-0 h-full w-full object-contain" />
                                    <button type="button" onClick={() => removePhoto(p.key)} className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white hover:bg-red-600" aria-label="Hapus foto"><X className="h-4 w-4" /></button>
                                    {p.cropped && <Badge className="absolute left-1.5 top-1.5 bg-brand-700 text-white ring-brand-700">Di-crop</Badge>}
                                </div>
                                <div className="flex items-center justify-between gap-1 px-2 py-1.5">
                                    <span className="truncate font-mono text-[11px] text-slate-500" title={p.original.name}>{many ? `${base}-${i + 1}` : base}</span>
                                    <span className="flex shrink-0">
                                        {p.cropped && <button type="button" onClick={() => resetCrop(p.key)} className="btn-ghost btn-sm px-1.5" title="Kembalikan foto asli"><RotateCcw className="h-4 w-4" /></button>}
                                        <button type="button" onClick={() => setCropKey(p.key)} className="btn-ghost btn-sm px-1.5 text-brand-700" title="Crop"><Crop className="h-4 w-4" /></button>
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {!isFoto && video && (
                    <div className="overflow-hidden rounded-xl border border-slate-200">
                        <video src={video.url} controls className="max-h-[50vh] w-full bg-black" />
                        <div className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                            <span className="truncate">{video.file.name} <span className="text-slate-400">· {formatBytes(video.file.size)}</span></span>
                            <button type="button" onClick={() => { urls.drop(video.url); setVideo(null); }} className="btn-ghost btn-sm text-red-600"><X className="h-4 w-4" />Ganti</button>
                        </div>
                    </div>
                )}
            </div>

            {(isFoto ? photos.length > 0 : !!video) && (
                <p className="flex items-start gap-2 rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-900">
                    <FileImage className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>Disimpan sebagai <b className="font-mono">{many ? `${base}-1 … ${base}-${photos.length}` : base}</b> (tanggal hari ini + judul). Bila nama yang sama sudah ada di hari ini, nomor otomatis ditambahkan (tidak menimpa file lama).</span>
                </p>
            )}

            {(clientError || serverErrors.length > 0) && (
                <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                    {clientError && <p>{clientError}</p>}
                    {[...new Set(serverErrors)].map((m) => <p key={m}>{m}</p>)}
                </div>
            )}

            {form.progress && <UploadProgress value={form.progress.percentage} />}

            <div className="flex justify-end gap-2">
                <button type="button" onClick={onCancel} className="btn-outline" disabled={busy}>Batal</button>
                <button className="btn-primary" disabled={busy}>
                    {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                    {preparing ? 'Menyiapkan…' : form.processing ? 'Mengunggah…' : isFoto && photos.length > 1 ? `Simpan ${photos.length} Foto` : 'Simpan'}
                </button>
            </div>
        </form>
    );
}

function EditForm({ item, categories, limits, onDone, onCancel }) {
    const isVideo = item.type === 'video';
    const form = useForm({ title: item.title, category: item.category });
    const urls = useObjectUrls();
    const [source, setSource] = useState({ src: item.image_url, mime: mimeFromName(item.file_name), name: item.file_name, file: null }); // bahan crop
    const [result, setResult] = useState(null); // { file, url } — file pengganti yang akan diunggah
    const [cropping, setCropping] = useState(false);
    const [clientError, setClientError] = useState(null);
    const [preparing, setPreparing] = useState(false);

    const pick = (list) => {
        const f = list[0];
        if (!f) return;
        setClientError(null);
        if (isVideo) {
            if (!VIDEO_TYPES.includes(f.type)) return setClientError('File video harus MP4, WEBM, atau MOV.');
            if (limits.file && f.size > limits.file) return setClientError(`Ukuran video ${formatBytes(f.size)} melebihi batas upload server (${formatBytes(limits.file)}).`);
            setResult({ file: f, url: urls.make(f) });
            return;
        }
        if (!PHOTO_TYPES.includes(f.type)) return setClientError('File foto harus JPG, PNG, atau WEBP.');
        const url = urls.make(f);
        setSource({ src: url, mime: f.type, name: f.name, file: f });
        setResult({ file: f, url });
        setCropping(true); // langsung tawarkan crop
    };

    const applyCrop = (blob) => {
        const file = blobToFile(blob, source.name);
        setResult({ file, url: urls.make(file) });
        setCropping(false);
    };

    const submit = async (e) => {
        e.preventDefault();
        setClientError(null);
        let file = result?.file ?? null;
        if (file && !isVideo) {
            setPreparing(true);
            try { file = await shrinkToLimit(file, limits.file); } catch (err) { setPreparing(false); return setClientError(err.message); }
            setPreparing(false);
        }
        form.transform((d) => ({ ...d, ...(file ? { file } : {}) }));
        form.post(route('admin.galeri.update', item.id), { forceFormData: true, preserveScroll: true, onSuccess: onDone });
    };

    if (cropping) {
        return <ImageCropper src={source.src} mime={source.mime} heading={source.name} onApply={applyCrop}
            onSkip={source.file ? () => setCropping(false) : null} skipLabel="Tanpa crop" onCancel={() => setCropping(false)} />;
    }

    // File pengganti memakai tanggal hari ini; ganti judul saja mempertahankan tanggal masuk awal
    const base = fileBase(form.data.title, result ? new Date() : item.created_at);
    const renamed = !!result || !item.file_name?.startsWith(base);
    const busy = preparing || form.processing;
    const shown = result?.url ?? item.image_url;

    return (
        <form onSubmit={submit} className="space-y-5">
            <h2 className="text-xl">Ubah {isVideo ? 'Video' : 'Foto'}</h2>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-900">
                {isVideo
                    ? <video key={shown} src={shown} controls className="max-h-[45vh] w-full" />
                    : <img src={shown} alt={item.title} className="mx-auto max-h-[45vh] object-contain" />}
            </div>

            <div className="flex flex-wrap gap-2">
                {!isVideo && (
                    <button type="button" onClick={() => setCropping(true)} className="btn-outline btn-sm"><Crop className="h-4 w-4" />{result ? 'Crop ulang' : 'Crop foto ini'}</button>
                )}
                <label className="btn-outline btn-sm cursor-pointer">
                    <Upload className="h-4 w-4" />Ganti {isVideo ? 'video' : 'foto'}
                    <input type="file" className="sr-only" accept={(isVideo ? VIDEO_TYPES : PHOTO_TYPES).join(',')} onChange={(e) => { pick(e.target.files); e.target.value = ''; }} />
                </label>
                {result && (
                    <button type="button" onClick={() => { setResult(null); setSource({ src: item.image_url, mime: mimeFromName(item.file_name), name: item.file_name, file: null }); }}
                        className="btn-ghost btn-sm"><RotateCcw className="h-4 w-4" />Batalkan perubahan file</button>
                )}
            </div>

            <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
                <div>
                    <label className="label">Judul</label>
                    <input className="input" value={form.data.title} onChange={(e) => form.setData('title', e.target.value)} maxLength={120} />
                    {form.errors.title && <p className="error">{form.errors.title}</p>}
                </div>
                <div>
                    <label className="label">Kategori</label>
                    <select className="input" value={form.data.category} onChange={(e) => form.setData('category', e.target.value)}>
                        {Object.entries(categories).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                </div>
            </div>

            <p className="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                <FileImage className="mt-0.5 h-4 w-4 shrink-0" />
                <span>File saat ini: <b className="font-mono">{item.file_name}</b>{renamed && <> → akan menjadi <b className="font-mono">{base}</b> (ditambah nomor bila nama itu sudah dipakai)</>}</span>
            </p>

            {(clientError || form.errors.file) && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{clientError ?? form.errors.file}</p>}
            {form.progress && <UploadProgress value={form.progress.percentage} />}

            <div className="flex justify-end gap-2">
                <button type="button" onClick={onCancel} className="btn-outline" disabled={busy}>Batal</button>
                <button className="btn-primary" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}{form.processing ? 'Menyimpan…' : 'Simpan'}</button>
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
