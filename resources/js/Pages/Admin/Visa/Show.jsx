import { useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { CheckCircle2, Download, ExternalLink, FileArchive, Plus, Receipt, Trash2, XCircle } from 'lucide-react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Card, DefList, Input, PageHeader, Select, StatusBadge, Stepper, Textarea } from '@/Components/ui';
import { VISA_STEPS, visaStep } from '@/lib/visa';
import BerkasResult from '@/Components/BerkasResult';
import { dateTime, fileSize, rupiah } from '@/lib/format';

export default function Show({ application: v, customer, applicants, statuses, payments, documents, usdRate, requirements = [] }) {
    const { auth } = usePage().props;
    const canOps = auth.user.role === 'admin';
    const editableInvoice = ['menunggu_invoice', 'menunggu_pembayaran'].includes(v.status) && v.paid_amount === 0;

    const inv = useForm({
        pax_count: v.pax_count, unit_price: v.unit_price, exchange_rate: v.exchange_rate ?? usdRate ?? '', extra_fee: v.extra_fee, extra_fee_label: v.extra_fee_label ?? '', discount: v.discount, note: '',
        applicants: applicants.map((a) => ({ full_name: a.full_name, passport_number: a.passport_number ?? '' })),
    });
    const total = Number(inv.data.unit_price) * Number(inv.data.pax_count) + Number(inv.data.extra_fee || 0) - Number(inv.data.discount || 0);

    const st = useForm({ status: '', note: '', document_id: '', visa_file: null });
    const act = (status, document_id = '') => { st.setData((d) => ({ ...d, status, document_id })); };
    const submitStatus = (e) => { e.preventDefault(); st.post(route('admin.visa.status', v.code), { forceFormData: true, preserveScroll: true, onSuccess: () => st.reset() }); };

    const berkas = documents.filter((d) => d.type === 'berkas_visa');

    return (
        <AdminLayout title={v.code}>
            <PageHeader back={route('admin.visa.index')} title={`${v.code} — ${v.service.name}`} subtitle={`${customer.name} (${customer.customer_code}) · ${v.pax_count} pemohon`} actions={<StatusBadge status={v.status} label={statuses[v.status]} />} />
            <div className="card mb-6 p-4"><Stepper steps={VISA_STEPS} current={visaStep(v.status)} failed={v.status === 'ditolak'} /></div>

            <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_380px]">
                <div className="min-w-0 space-y-6">
                    {canOps && editableInvoice && (
                        <Card title={v.status === 'menunggu_invoice' ? 'Terbitkan invoice' : 'Ubah invoice (belum dibayar)'}>
                            <form onSubmit={(e) => { e.preventDefault(); inv.post(route('admin.visa.invoice', v.code), { preserveScroll: true }); }} className="space-y-4">
                                {v.unit_price_usd && (
                                    <div className="grid items-end gap-3 rounded-xl bg-amber-50 p-3 ring-1 ring-amber-200 sm:grid-cols-[auto_1fr_auto]">
                                        <p className="text-sm text-amber-900">Harga <b>USD {Number(v.unit_price_usd)}</b>/orang ×</p>
                                        <Input label="Kurs hari ini (Rp per USD)" type="number" value={inv.data.exchange_rate}
                                            onChange={(e) => { const r = e.target.value; inv.setData((d) => ({ ...d, exchange_rate: r, unit_price: Math.round((Number(v.unit_price_usd) * Number(r || 0)) / 100) * 100 })); }}
                                            error={inv.errors.exchange_rate} hint={`Kurs saat pengajuan: Rp${Number(v.exchange_rate ?? 0).toLocaleString('id-ID')} · kurs di Pengaturan: Rp${Number(usdRate).toLocaleString('id-ID')}`} />
                                        <p className="pb-2 text-sm font-semibold text-amber-900">= {rupiah(inv.data.unit_price)}/orang</p>
                                    </div>
                                )}
                                <div className="grid gap-4 sm:grid-cols-3">
                                    <Input label="Jumlah pemesan visa" type="number" value={inv.data.pax_count} onChange={(e) => inv.setData('pax_count', e.target.value)} error={inv.errors.pax_count} />
                                    <Input label="Harga per orang" type="number" value={inv.data.unit_price} onChange={(e) => inv.setData('unit_price', e.target.value)} error={inv.errors.unit_price} />
                                    <Input label="Potongan" type="number" value={inv.data.discount} onChange={(e) => inv.setData('discount', e.target.value)} />
                                    <Input label="Biaya tambahan" type="number" value={inv.data.extra_fee} onChange={(e) => inv.setData('extra_fee', e.target.value)} />
                                    <Input className="sm:col-span-2" label="Keterangan biaya tambahan" value={inv.data.extra_fee_label} onChange={(e) => inv.setData('extra_fee_label', e.target.value)} />
                                </div>
                                <div>
                                    <div className="mb-2 flex items-center justify-between"><p className="label !mb-0">Data pemohon</p><button type="button" onClick={() => inv.setData('applicants', [...inv.data.applicants, { full_name: '', passport_number: '' }])} className="btn-outline btn-sm"><Plus className="h-3.5 w-3.5" />Tambah</button></div>
                                    <div className="space-y-2">
                                        {inv.data.applicants.map((a, i) => (
                                            <div key={i} className="flex gap-2">
                                                <input className="input" placeholder="Nama" value={a.full_name} onChange={(e) => inv.setData('applicants', inv.data.applicants.map((x, j) => (j === i ? { ...x, full_name: e.target.value } : x)))} />
                                                <input className="input w-40" placeholder="Paspor" value={a.passport_number} onChange={(e) => inv.setData('applicants', inv.data.applicants.map((x, j) => (j === i ? { ...x, passport_number: e.target.value.toUpperCase() } : x)))} />
                                                <button type="button" onClick={() => inv.setData('applicants', inv.data.applicants.filter((_, j) => j !== i))} className="btn-ghost"><Trash2 className="h-4 w-4 text-red-500" /></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <Input label="Catatan untuk pelanggan (opsional)" value={inv.data.note} onChange={(e) => inv.setData('note', e.target.value)} />
                                <div className="flex items-center justify-between rounded-xl bg-brand-50 p-4"><span className="text-sm">Total invoice</span><span className="text-xl font-bold text-brand-800">{rupiah(Math.max(0, total))}</span></div>
                                <button disabled={inv.processing} className="btn-primary"><Receipt className="h-4 w-4" />{v.status === 'menunggu_invoice' ? 'Terbitkan Invoice' : 'Perbarui Invoice'}</button>
                            </form>
                        </Card>
                    )}

                    <Card title="Berkas pemohon (ZIP/RAR)">
                        {berkas.length === 0 ? <p className="text-sm text-slate-500">{v.status === 'menunggu_dokumen' ? 'Menunggu pelanggan mengunggah berkas.' : 'Belum ada berkas.'}</p> : (
                            <div className="space-y-4">
                                {berkas.map((d) => (canOps && d.status === 'menunggu' && v.status === 'menunggu_dokumen'
                                    ? <BerkasReview key={d.id} visa={v} doc={d} requirements={requirements} applicants={applicants} />
                                    : <BerkasResult key={d.id} doc={d} />))}
                            </div>
                        )}
                        {documents.filter((d) => d.type === 'visa_terbit').map((d) => <a key={d.id} href={d.url} className="btn-outline btn-sm mt-3">Visa terbit: {d.file_name}</a>)}
                    </Card>

                    {canOps && NEXT[v.status] && (
                        <Card title="Perbarui status">
                            <div className="mb-3 flex flex-wrap gap-2">
                                {NEXT[v.status].map(([k, l]) => (
                                    <button key={k} type="button" onClick={() => act(k)} className={st.data.status === k ? 'btn-primary btn-sm' : 'btn-outline btn-sm'}>{l}</button>
                                ))}
                            </div>
                            {v.status === 'menunggu_dokumen' && !st.data.status && <p className="text-xs text-slate-500">Status naik ke <b>Diverifikasi</b> otomatis setelah semua dokumen di berkas diperiksa dan sesuai.</p>}
                            {st.data.status && (
                                <form onSubmit={submitStatus} className="space-y-3 rounded-xl bg-sand-50 p-4">
                                    <p className="text-sm">Ubah status menjadi <StatusBadge status={st.data.status} label={statuses[st.data.status]} /></p>
                                    <Textarea rows={2} label={st.data.status === 'ditolak' || st.data.status === 'menunggu_dokumen' ? 'Alasan / catatan (dikirim ke pelanggan)' : 'Catatan (opsional)'} value={st.data.note} onChange={(e) => st.setData('note', e.target.value)} error={st.errors.note ?? st.errors.status} />
                                    {st.data.status === 'terbit' && <div><label className="label">File visa (PDF/JPG/ZIP)</label><input type="file" onChange={(e) => st.setData('visa_file', e.target.files[0])} className="text-sm" />{st.errors.visa_file && <p className="error">{st.errors.visa_file}</p>}</div>}
                                    <div className="flex gap-2"><button disabled={st.processing} className="btn-primary btn-sm">Simpan</button><button type="button" onClick={() => st.reset()} className="btn-ghost btn-sm">Batal</button></div>
                                </form>
                            )}
                        </Card>
                    )}

                    <Card title="Riwayat perubahan status">
                        <ol className="space-y-3">
                            {v.status_logs.map((l) => (
                                <li key={l.id} className="flex gap-3 text-sm">
                                    <span className="w-32 shrink-0 text-xs text-slate-400">{dateTime(l.created_at)}</span>
                                    <div><StatusBadge status={l.to_status} label={statuses[l.to_status]} /> <span className="text-xs text-slate-500">oleh {l.changer?.name ?? 'Sistem'}</span>{l.note && <p className="mt-0.5 text-slate-600">{l.note}</p>}</div>
                                </li>
                            ))}
                        </ol>
                    </Card>
                </div>

                <div className="grid content-start items-start gap-6 md:grid-cols-2 2xl:grid-cols-1">
                    <Card title="Pemohon"><DefList items={[['Nama', customer.name], ['Kode', customer.customer_code], ['Email', customer.email], ['HP', customer.phone]]} /></Card>
                    <Card title="Ringkasan">
                        <DefList items={[['Rencana berangkat', v.planned_departure], ['Total', rupiah(v.total_amount)], ['Dibayar', rupiah(v.paid_amount)], ['Catatan', v.notes]]} />
                        {v.invoices.map((i) => <a key={i.id} target="_blank" rel="noopener" href={route('invoices.pdf', i.id)} className="mt-3 flex items-center justify-between rounded-lg border border-slate-100 p-2 text-sm hover:bg-sand-50"><span>{i.number} <StatusBadge status={i.status} /></span><Download className="h-4 w-4" /></a>)}
                    </Card>
                    <Card title="Transaksi">{payments.length === 0 ? <p className="text-sm text-slate-500">Belum ada.</p> : payments.map((p) => <div key={p.id} className="flex justify-between py-1 text-sm"><span>{p.code}</span><StatusBadge status={p.status} /></div>)}</Card>
                </div>
            </div>
        </AdminLayout>
    );
}

/** Tombol status yang tersedia di tiap tahap (urut sesuai alur) */
const NEXT = {
    menunggu_dokumen: [['ditolak', 'Tolak pengajuan']],
    diverifikasi: [['diproses', 'Diproses'], ['menunggu_dokumen', 'Minta berkas ulang'], ['ditolak', 'Ditolak']],
    diproses: [['terbit', 'Terbit'], ['ditolak', 'Ditolak']],
};

/**
 * Pemeriksaan berkas per dokumen. ZIP: setiap file di dalamnya bisa dibuka lalu ditandai Sesuai / Tidak sesuai.
 * RAR (tidak bisa dibaca server): admin mengunduh berkas lalu mengisi daftar dokumen secara manual.
 */
function BerkasReview({ visa, doc, requirements, applicants }) {
    const fromZip = Array.isArray(doc.entries) && doc.entries.length > 0;
    const initial = fromZip
        ? doc.entries.map((e) => ({ name: e.name, size: e.size, previewable: e.previewable, ok: null, note: '' }))
        : (requirements.length ? requirements : ['Paspor', 'Pas foto', 'KTP', 'Kartu Keluarga']).flatMap((r) => (applicants.length > 1 ? applicants.map((a) => `${r} — ${a.full_name}`) : [r]))
            .map((name) => ({ name, ok: null, note: '' }));
    const form = useForm({ items: initial });
    const [manual] = useState(!fromZip);
    const items = form.data.items;
    const set = (i, patch) => form.setData('items', items.map((x, j) => (j === i ? { ...x, ...patch } : x)));
    const done = items.filter((x) => x.ok !== null).length;
    const bad = items.filter((x) => x.ok === false).length;
    const ready = items.length > 0 && done === items.length && items.every((x) => x.ok !== false || x.note.trim());

    const submit = (e) => {
        e.preventDefault();
        form.transform((d) => ({ items: d.items.map(({ name, ok, note }) => ({ name, ok, note })) }));
        form.post(route('admin.visa.berkas.review', [visa.code, doc.id]), { preserveScroll: true });
    };

    return (
        <form onSubmit={submit} className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4">
            <div className="flex flex-wrap items-center gap-3">
                <FileArchive className="h-5 w-5 text-amber-700" />
                <div className="min-w-0 flex-1">
                    <a href={doc.url} className="font-semibold text-brand-700 hover:underline">{doc.file_name}</a>
                    <p className="text-xs text-slate-500">{fileSize(doc.size)} · diunggah {doc.created_at}</p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">{done}/{items.length} diperiksa{bad > 0 && <span className="text-red-600"> · {bad} tidak sesuai</span>}</span>
            </div>
            <p className="mt-2 text-xs text-slate-600">
                {manual
                    ? (doc.is_zip ? 'Isi ZIP tidak dapat dibaca. ' : 'Berkas RAR tidak dapat dibuka langsung di sini. ') + 'Unduh berkasnya, lalu tandai setiap dokumen di bawah (daftar bisa ditambah/diubah).'
                    : 'Klik "Buka" untuk melihat tiap file, lalu tandai Sesuai atau Tidak sesuai. Dokumen yang tidak sesuai wajib diberi alasan — pelanggan akan melihat persis dokumen mana yang harus diperbaiki.'}
            </p>

            <ul className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
                {items.map((it, i) => (
                    <li key={i} className={it.ok === false ? 'bg-red-50/60 p-3' : it.ok ? 'bg-emerald-50/50 p-3' : 'p-3'}>
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="w-6 text-xs tabular-nums text-slate-400">{i + 1}.</span>
                            {manual
                                ? <input className="input min-w-[160px] flex-1 py-1.5 text-sm" value={it.name} onChange={(e) => set(i, { name: e.target.value })} placeholder="Nama dokumen" />
                                : <span className="min-w-0 flex-1 truncate font-mono text-sm" title={it.name}>{it.name}<span className="ml-2 font-sans text-xs text-slate-400">{fileSize(it.size)}</span></span>}
                            {!manual && (
                                <a href={route('admin.visa.berkas.file', [visa.code, doc.id]) + '?nama=' + encodeURIComponent(it.name)} target="_blank" rel="noopener" className="btn-outline btn-sm">
                                    {it.previewable ? <ExternalLink className="h-3.5 w-3.5" /> : <Download className="h-3.5 w-3.5" />}{it.previewable ? 'Buka' : 'Unduh'}
                                </a>
                            )}
                            <button type="button" onClick={() => set(i, { ok: true, note: '' })} className={it.ok === true ? 'btn-sm btn rounded-lg bg-emerald-600 text-white' : 'btn-outline btn-sm'}><CheckCircle2 className="h-3.5 w-3.5" />Sesuai</button>
                            <button type="button" onClick={() => set(i, { ok: false })} className={it.ok === false ? 'btn-sm btn rounded-lg bg-red-600 text-white' : 'btn-outline btn-sm text-red-600'}><XCircle className="h-3.5 w-3.5" />Tidak sesuai</button>
                            {manual && <button type="button" onClick={() => form.setData('items', items.filter((_, j) => j !== i))} className="btn-ghost btn-sm" aria-label="Hapus baris"><Trash2 className="h-4 w-4 text-red-500" /></button>}
                        </div>
                        {it.ok === false && (
                            <input className="input mt-2 py-1.5 text-sm" autoFocus value={it.note} onChange={(e) => set(i, { note: e.target.value })} maxLength={300}
                                placeholder="Alasan, mis. foto paspor buram / masa berlaku kurang dari 7 bulan" />
                        )}
                    </li>
                ))}
            </ul>
            {manual && <button type="button" onClick={() => form.setData('items', [...items, { name: '', ok: null, note: '' }])} className="btn-ghost btn-sm mt-2"><Plus className="h-3.5 w-3.5" />Tambah dokumen</button>}
            {form.errors.items && <p className="error mt-2">{form.errors.items}</p>}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-slate-600">
                    {!ready ? 'Tandai semua dokumen terlebih dulu.' : bad > 0 ? `${bad} dokumen tidak sesuai → pelanggan diminta mengunggah ulang.` : 'Semua sesuai → status visa naik ke Diverifikasi.'}
                </p>
                <button disabled={!ready || form.processing} className={bad > 0 ? 'btn btn-sm rounded-xl bg-red-600 text-white hover:bg-red-700 disabled:opacity-50' : 'btn-primary btn-sm'}>
                    {bad > 0 ? 'Kirim hasil & minta perbaikan' : 'Verifikasi berkas'}
                </button>
            </div>
        </form>
    );
}
