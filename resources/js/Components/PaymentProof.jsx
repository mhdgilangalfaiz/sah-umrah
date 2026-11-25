import { Link, useForm } from '@inertiajs/react';
import { AlertTriangle, CheckCircle2, FileCheck2, Upload } from 'lucide-react';
import { useState } from 'react';
import { rupiah } from '@/lib/format';

/**
 * Langkah setelah pembayaran berhasil: unggah bukti pembayaran (resi, struk, tangkapan layar, atau catatan pembayaran lain)
 * sebagai arsip perusahaan. Bisa diganti kapan saja.
 */
export function ProofUpload({ payment }) {
    const has = Boolean(payment.proof_url);
    const [open, setOpen] = useState(!has);
    const form = useForm({ file: null, note: payment.proof_note ?? '' });

    const submit = (e) => {
        e.preventDefault();
        form.post(route('payments.proof.store', payment.code), { forceFormData: true, preserveScroll: true, onSuccess: () => { form.setData('file', null); setOpen(false); } });
    };

    return (
        <div className={`rounded-2xl p-4 text-left ring-1 ${has ? 'bg-emerald-50 ring-emerald-200' : 'bg-amber-50 ring-amber-200'}`}>
            <div className="flex items-start gap-3">
                {has ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" /> : <Upload className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />}
                <div className="min-w-0 flex-1">
                    <p className={`font-semibold ${has ? 'text-emerald-900' : 'text-amber-900'}`}>{has ? 'Bukti pembayaran sudah diunggah' : 'Langkah berikutnya: unggah bukti pembayaran'}</p>
                    {has ? (
                        <p className="mt-0.5 text-sm text-emerald-800 [overflow-wrap:anywhere]">
                            {payment.proof_name} · {payment.proof_uploaded_at}{payment.proof_note && <><br /><span className="text-emerald-700">“{payment.proof_note}”</span></>}
                        </p>
                    ) : (
                        <p className="mt-0.5 text-sm text-amber-800">Unggah resi, struk transfer, tangkapan layar m-banking, atau catatan pembayaran lainnya. Bukti ini disimpan sebagai arsip perusahaan.</p>
                    )}
                    {has && (
                        <div className="mt-2 flex flex-wrap gap-2">
                            <a href={payment.proof_url} target="_blank" rel="noopener" className="btn-outline btn-sm"><FileCheck2 className="h-4 w-4" />Lihat bukti</a>
                            {!open && <button type="button" onClick={() => setOpen(true)} className="btn-ghost btn-sm">Ganti bukti</button>}
                        </div>
                    )}
                </div>
            </div>

            {open && (
                <form onSubmit={submit} className="mt-4 space-y-3 border-t border-black/5 pt-4">
                    <div>
                        <label className="label">File bukti (JPG, PNG, WEBP, PDF · maks. 5 MB)</label>
                        <input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={(e) => form.setData('file', e.target.files[0])} className="text-sm" />
                        {form.errors.file && <p className="error">{form.errors.file}</p>}
                    </div>
                    <div>
                        <label className="label">Catatan (opsional)</label>
                        <textarea rows={2} className="input" placeholder="mis. Transfer dari rekening a.n. Budi, no. referensi 123456" value={form.data.note} onChange={(e) => form.setData('note', e.target.value)} />
                        {form.errors.note && <p className="error">{form.errors.note}</p>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button disabled={form.processing || !form.data.file} className="btn-primary"><Upload className="h-4 w-4" />{form.processing ? 'Mengunggah…' : 'Unggah Bukti'}</button>
                        {has && <button type="button" onClick={() => setOpen(false)} className="btn-ghost">Batal</button>}
                    </div>
                </form>
            )}
        </div>
    );
}

/** Pengingat di halaman pesanan: pembayaran sukses yang belum ada buktinya */
export function MissingProofs({ items = [] }) {
    if (!items.length) return null;
    return (
        <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
            <p className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4 shrink-0" />Unggah bukti pembayaran</p>
            <p className="mt-1 text-amber-800">Pembayaran berikut sudah kami terima. Mohon lengkapi dengan bukti pembayaran (resi/struk) sebagai arsip.</p>
            <ul className="mt-3 space-y-2">
                {items.map((p) => (
                    <li key={p.code} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/70 px-3 py-2">
                        <span className="min-w-0"><b>{rupiah(p.amount)}</b> <span className="text-xs text-amber-700">· {p.code}{p.paid_at && ` · ${p.paid_at}`}</span></span>
                        <Link href={route('payments.show', p.code)} className="btn-gold btn-sm"><Upload className="h-3.5 w-3.5" />Unggah</Link>
                    </li>
                ))}
            </ul>
        </div>
    );
}

/** Kolom status bukti untuk tabel transaksi (admin & pelanggan) */
export function ProofLink({ p, uploadable = false }) {
    if (p.proof_url) {
        return <a href={p.proof_url} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline" title={p.proof_note ?? ''}><FileCheck2 className="h-4 w-4" />Lihat bukti</a>;
    }
    if (p.needs_proof) {
        return uploadable
            ? <Link href={route('payments.show', p.code)} className="btn-gold btn-sm"><Upload className="h-3.5 w-3.5" />Unggah bukti</Link>
            : <span className="text-xs font-medium text-amber-700">Belum ada bukti</span>;
    }
    return <span className="text-slate-400">-</span>;
}
