import { router, usePage } from '@inertiajs/react';
import { Camera, Loader2, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import UserAvatar from './UserAvatar';

interface Props {
    auth: { user: { name: string; avatar: string | null } };
    errors: Record<string, string>;
    [key: string]: unknown;
}

const MAX = 5 * 1024 * 1024;

/** Ganti / hapus foto profil. Server memotongnya persegi & menyimpan WebP 400×400. */
export default function ProfilePhotoCard() {
    const { auth, errors } = usePage<Props>().props;
    const input = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);

    useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

    const pick = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        if (!/^image\/(jpeg|png|webp)$/.test(file.type)) { setLocalError('Format foto harus JPG, PNG, atau WebP.'); return; }
        if (file.size > MAX) { setLocalError('Ukuran foto maksimal 5 MB.'); return; }
        setLocalError(null);
        setPreview(URL.createObjectURL(file));
        router.post(route('profile.photo.update'), { photo: file }, {
            forceFormData: true, preserveScroll: true,
            onStart: () => setBusy(true),
            onFinish: () => { setBusy(false); setPreview(null); },
        });
    };

    const remove = () => {
        if (!window.confirm('Hapus foto profil?')) return;
        router.delete(route('profile.photo.destroy'), { preserveScroll: true, onStart: () => setBusy(true), onFinish: () => setBusy(false) });
    };

    const error = localError ?? errors.photo;

    return (
        <section className="rounded-3xl border border-white bg-gradient-to-br from-white/90 via-white/75 to-white/60 p-5 shadow-[0_10px_30px_-16px_rgba(11,77,42,0.3),inset_0_1px_0_#fff] sm:p-6">
            <h2 className="font-jakarta text-lg font-extrabold tracking-tight text-neutral-900">Foto Profil</h2>
            <div className="mt-4 flex flex-col items-center gap-5 sm:flex-row">
                <div className="relative">
                    <UserAvatar name={auth.user.name} src={preview ?? auth.user.avatar} className="h-24 w-24 text-2xl ring-4 ring-white shadow-lg" />
                    {busy && <span className="absolute inset-0 grid place-items-center rounded-full bg-neutral-900/40"><Loader2 className="h-6 w-6 animate-spin text-white" aria-label="Mengunggah" /></span>}
                </div>
                <div className="text-center sm:text-left">
                    <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
                        <button type="button" onClick={() => input.current?.click()} disabled={busy}
                            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary-700 to-primary-900 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-primary-700/25 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2">
                            <Camera className="h-4 w-4" aria-hidden="true" /> {auth.user.avatar ? 'Ganti Foto' : 'Unggah Foto'}
                        </button>
                        {auth.user.avatar && (
                            <button type="button" onClick={remove} disabled={busy}
                                className="inline-flex items-center gap-2 rounded-full border-2 border-red-200 bg-white px-5 py-2 text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-60">
                                <Trash2 className="h-4 w-4" aria-hidden="true" /> Hapus
                            </button>
                        )}
                    </div>
                    <p className="mt-2 text-xs text-neutral-600">JPG, PNG, atau WebP, maksimal 5 MB. Foto otomatis dipotong persegi.</p>
                    {error && <p className="mt-1 text-xs font-medium text-red-600" role="alert">{error}</p>}
                </div>
            </div>
            <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" onChange={pick} className="hidden" aria-label="Pilih foto profil" />
        </section>
    );
}
