import { router } from '@inertiajs/react';
import { ImagePlus, Loader2, Pencil, Plane, Plus, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';

const opts = (extra = {}) => ({ preserveScroll: true, preserveState: true, forceFormData: true, ...extra });

/**
 * Logo maskapai di kartu paket (Konten Beranda → Paket Umrah).
 * Disimpan langsung per maskapai (tidak ikut tombol Simpan konten). Logo lama otomatis terhapus saat diganti.
 */
export default function AirlineLogos({ airlines }) {
    const [busy, setBusy] = useState(null);
    const [newName, setNewName] = useState('');
    const save = (a, payload) => router.post(route('admin.crud.update', ['maskapai', a.id]), { name: a.name, ...payload },
        opts({ onStart: () => setBusy(a.id), onFinish: () => setBusy(null) }));

    const add = () => {
        const name = newName.trim();
        if (!name) return;
        router.post(route('admin.crud.store', 'maskapai'), { name }, opts({ onSuccess: () => setNewName('') }));
    };
    const rename = (a) => {
        const name = window.prompt('Nama maskapai (paket yang memakai nama lama ikut diperbarui):', a.name);
        if (name && name.trim() && name.trim() !== a.name) save(a, { name: name.trim() });
    };
    const remove = (a) => {
        const note = a.packages_count ? `\n\nMasih dipakai ${a.packages_count} paket; kartu paket itu akan menampilkan nama maskapai saja.` : '';
        if (window.confirm(`Hapus maskapai ${a.name}?${note}`)) router.delete(route('admin.crud.destroy', ['maskapai', a.id]), { preserveScroll: true, preserveState: true });
    };

    return (
        <div className="mt-6 border-t border-slate-100 pt-5">
            <h3 className="flex items-center gap-2 font-semibold text-slate-900"><Plane className="h-4 w-4 text-brand-700" />Logo maskapai di kartu paket</h3>
            <p className="mt-1 text-sm text-slate-500">Logo tampil di kartu Best Seller & daftar paket sesuai maskapai yang dipilih di paket. Pakai PNG/WebP berlatar transparan (maks 2 MB). Tersimpan langsung, tidak perlu menekan Simpan.</p>

            {airlines.length === 0 ? <p className="mt-3 text-sm text-slate-400">Belum ada maskapai. Maskapai otomatis tercatat saat dipilih di paket, atau tambahkan di bawah.</p> : (
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                    {airlines.map((a) => <AirlineRow key={a.id} a={a} busy={busy === a.id} onPick={(file) => save(a, { logo: file })} onRename={() => rename(a)} onRemove={() => remove(a)} />)}
                </ul>
            )}

            <div className="mt-4 flex gap-2">
                <input className="input" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Tambah maskapai, mis. Saudia"
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} />
                <button type="button" onClick={add} disabled={!newName.trim()} className="btn-outline shrink-0"><Plus className="h-4 w-4" />Tambah</button>
            </div>
        </div>
    );
}

function AirlineRow({ a, busy, onPick, onRename, onRemove }) {
    const input = useRef(null);
    return (
        <li className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3">
            <button type="button" onClick={() => input.current?.click()} title={a.logo_url ? 'Ganti logo' : 'Unggah logo'}
                className="relative grid h-14 w-28 shrink-0 place-items-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50 hover:border-brand-600">
                {a.logo_url ? <img src={a.logo_url} alt={a.name} className="h-full w-full object-contain p-1.5" /> : <span className="flex flex-col items-center text-[11px] font-semibold text-amber-700"><ImagePlus className="h-4 w-4" />Unggah logo</span>}
                {busy && <span className="absolute inset-0 grid place-items-center bg-white/70"><Loader2 className="h-5 w-5 animate-spin text-brand-700" /></span>}
            </button>
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">{a.name}</p>
                <p className="text-xs text-slate-500">Dipakai {a.packages_count} paket</p>
            </div>
            <button type="button" onClick={onRename} title="Ubah nama" aria-label="Ubah nama" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"><Pencil className="h-4 w-4" /></button>
            <button type="button" onClick={onRemove} title="Hapus" aria-label="Hapus" className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
            <input ref={input} type="file" accept="image/png,image/webp,image/jpeg,image/svg+xml" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onPick(f); }} />
        </li>
    );
}
