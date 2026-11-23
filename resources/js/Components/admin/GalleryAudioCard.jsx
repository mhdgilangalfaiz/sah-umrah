import { router, useForm } from '@inertiajs/react';
import { Link2, Music, Trash2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { cx } from '@/Components/ui';

/**
 * Audio suasana galeri (talbiyah, suasana Masjidil Haram, dll).
 * Sumber: unggah file (MP3/M4A/OGG/WAV, maks 10 MB) atau link langsung ke file audio.
 * Pengunjung memutarnya sendiri lewat tombol 🔊 di lightbox galeri beranda.
 */
export default function GalleryAudioCard({ audio, maxBytes = 10 * 1024 * 1024 }) {
    const [mode, setMode] = useState(audio?.is_link ? 'url' : 'file');
    const maxMb = Math.round((maxBytes / 1024 / 1024) * 10) / 10;
    const [sizeError, setSizeError] = useState(null);
    const fileInput = useRef(null);
    const form = useForm({ audio: null, url: audio?.is_link ? audio.url : '', title: audio?.title ?? '' });

    const submit = (e) => {
        e.preventDefault();
        form.transform((d) => (mode === 'file' ? { audio: d.audio, title: d.title } : { url: d.url, title: d.title }));
        form.post(route('admin.galeri.audio.update'), { forceFormData: true, preserveScroll: true, onSuccess: () => form.setData('audio', null) });
    };
    const remove = () => window.confirm('Hapus audio galeri?') && router.delete(route('admin.galeri.audio.destroy'), { preserveScroll: true });

    return (
        <form onSubmit={submit} className="card card-pad mb-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 className="flex items-center gap-2 font-semibold text-slate-900"><Music className="h-5 w-5 text-brand-700" />Audio suasana galeri</h2>
                    <p className="mt-1 max-w-2xl text-sm text-slate-500">
                        Diputar <b>hanya bila pengunjung menekan tombol 🔊</b> saat membuka foto galeri di beranda (pelan, berulang, berhenti saat ditutup). Cocok untuk talbiyah atau suasana Masjidil Haram. Pastikan audio boleh dipakai (milik sendiri / bebas royalti).
                    </p>
                </div>
                {audio?.url && <button type="button" onClick={remove} className="btn-ghost btn-sm text-red-600"><Trash2 className="h-4 w-4" />Hapus audio</button>}
            </div>

            {audio?.url && (
                <div className="mt-4 rounded-xl bg-brand-50 p-3">
                    <p className="mb-2 text-xs font-semibold text-brand-900">Audio aktif{audio.title && `: ${audio.title}`}{audio.is_link && ' (link)'}</p>
                    <audio src={audio.url} controls preload="none" className="w-full" />
                </div>
            )}

            <div className="mt-4 inline-flex rounded-xl border border-slate-200 p-1">
                {[['file', 'Unggah file', Upload], ['url', 'Pakai link URL', Link2]].map(([k, l, Icon]) => (
                    <button key={k} type="button" onClick={() => setMode(k)}
                        className={cx('flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold', mode === k ? 'bg-brand-700 text-white' : 'text-slate-600 hover:bg-slate-50')}>
                        <Icon className="h-4 w-4" />{l}
                    </button>
                ))}
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
                {mode === 'file' ? (
                    <div>
                        <label className="label">File audio (MP3/M4A/OGG/WAV, maks {maxMb} MB)</label>
                        <button type="button" onClick={() => fileInput.current?.click()} className="flex h-[42px] w-full items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-3 text-left text-sm text-slate-600 transition hover:border-brand-600 hover:text-brand-700">
                            <Upload className="h-4 w-4 shrink-0" /><span className="truncate">{form.data.audio?.name ?? 'Pilih file…'}</span>
                        </button>
                        <input ref={fileInput} type="file" accept="audio/*" className="hidden" onChange={(e) => {
                            const f = e.target.files?.[0] ?? null;
                            e.target.value = '';
                            if (f && f.size > maxBytes) { setSizeError(`File ${(f.size / 1024 / 1024).toFixed(1)} MB melebihi batas ${maxMb} MB. Perkecil (mis. MP3 128 kbps, durasi lebih pendek) atau pakai link URL.`); form.setData('audio', null); return; }
                            setSizeError(null);
                            form.setData('audio', f);
                        }} />
                        {(sizeError || form.errors.audio) && <p className="error">{sizeError ?? form.errors.audio}</p>}
                    </div>
                ) : (
                    <div>
                        <label className="label">Link langsung ke file audio (https://…/talbiyah.mp3)</label>
                        <input className="input" value={form.data.url} onChange={(e) => form.setData('url', e.target.value)} placeholder="https://" />
                        <p className="hint">Link YouTube/Spotify tidak bisa diputar; harus link ke file audionya.</p>
                        {form.errors.url && <p className="error">{form.errors.url}</p>}
                    </div>
                )}
                <div>
                    <label className="label">Judul (tampil di tombol, opsional)</label>
                    <input className="input" value={form.data.title} onChange={(e) => form.setData('title', e.target.value)} placeholder="mis. Talbiyah" maxLength={80} />
                </div>
                <button disabled={form.processing || (mode === 'file' ? !form.data.audio && !audio?.url : !form.data.url)} className="btn-primary">
                    {form.processing ? 'Menyimpan…' : 'Simpan audio'}
                </button>
            </div>
            <p className="mt-3 text-xs text-slate-500">Saran: durasi 30–60 detik (diputar berulang), ukuran di bawah 1–2 MB agar cepat dimuat. File lama otomatis terhapus saat diganti.</p>
        </form>
    );
}
