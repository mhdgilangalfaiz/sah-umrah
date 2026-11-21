import { useForm, usePage } from '@inertiajs/react';
import { CheckCircle2, Download, Plus, Receipt, Trash2, XCircle } from 'lucide-react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Card, DefList, Input, PageHeader, Select, StatusBadge, Stepper, Textarea } from '@/Components/ui';
import { VISA_STEPS, visaStep } from '@/Pages/Customer/VisaShow';
import { dateTime, fileSize, rupiah } from '@/lib/format';

export default function Show({ application: v, customer, applicants, statuses, payments, documents, usdRate }) {
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

            <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
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
                            <ul className="space-y-2">
                                {berkas.map((d) => (
                                    <li key={d.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-100 p-3">
                                        <div className="min-w-0 flex-1"><a href={d.url} className="flex items-center gap-1.5 font-medium text-brand-700 hover:underline"><Download className="h-4 w-4" />{d.file_name}</a><p className="text-xs text-slate-500">{fileSize(d.size)} · {d.created_at}</p>{d.rejection_note && <p className="text-xs text-red-600">{d.rejection_note}</p>}</div>
                                        <StatusBadge status={d.status} />
                                        {canOps && d.status === 'menunggu' && v.status === 'menunggu_dokumen' && (
                                            <div className="flex gap-1">
                                                <button onClick={() => act('diverifikasi', d.id)} className="btn-primary btn-sm"><CheckCircle2 className="h-3.5 w-3.5" />Verifikasi</button>
                                                <button onClick={() => act('menunggu_dokumen', d.id)} className="btn-outline btn-sm text-red-600"><XCircle className="h-3.5 w-3.5" />Minta perbaikan</button>
                                            </div>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                        {documents.filter((d) => d.type === 'visa_terbit').map((d) => <a key={d.id} href={d.url} className="btn-outline btn-sm mt-3">Visa terbit: {d.file_name}</a>)}
                    </Card>

                    {canOps && !['menunggu_invoice', 'menunggu_pembayaran', 'terbit', 'dibatalkan'].includes(v.status) && (
                        <Card title="Perbarui status">
                            <div className="mb-3 flex flex-wrap gap-2">
                                {[['diverifikasi', 'Diverifikasi'], ['diproses', 'Diproses'], ['terbit', 'Terbit'], ['ditolak', 'Ditolak']].map(([k, l]) => (
                                    <button key={k} type="button" onClick={() => act(k)} className={st.data.status === k && !st.data.document_id ? 'btn-primary btn-sm' : 'btn-outline btn-sm'}>{l}</button>
                                ))}
                            </div>
                            {st.data.status && (
                                <form onSubmit={submitStatus} className="space-y-3 rounded-xl bg-sand-50 p-4">
                                    <p className="text-sm">Ubah status menjadi <StatusBadge status={st.data.status} label={statuses[st.data.status]} />{st.data.document_id && ' (berkas akan ' + (st.data.status === 'menunggu_dokumen' ? 'ditolak' : 'diverifikasi') + ')'}</p>
                                    <Textarea rows={2} label={st.data.status === 'ditolak' || st.data.status === 'menunggu_dokumen' ? 'Alasan / catatan (dikirim ke pelanggan)' : 'Catatan (opsional)'} value={st.data.note} onChange={(e) => st.setData('note', e.target.value)} error={st.errors.note} />
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

                <div className="space-y-6">
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
