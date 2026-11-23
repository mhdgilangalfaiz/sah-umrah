import { Eye } from 'lucide-react';
import { useState } from 'react';
import { Link, useForm } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import { NewDot, useUnread } from '@/lib/unread';
import FilterBar from '@/Components/FilterBar';
import Modal from '@/Components/Modal';
import { Card, DefList, Empty, Input, PageHeader, Pagination, StatusBadge, Textarea } from '@/Components/ui';
import { rupiah } from '@/lib/format';

export default function Refunds({ refunds, filters }) {
    const isNew = useUnread();
    const [sel, setSel] = useState(null);
    const form = useForm({ action: '', approved_amount: '', admin_note: '', cancel_order: false, transfer_proof: null });
    const open = (r) => { setSel(r); form.setData({ action: '', approved_amount: r.requested_amount, admin_note: r.admin_note ?? '', cancel_order: false, transfer_proof: null }); form.clearErrors(); };
    const submit = (action) => { form.transform((d) => ({ ...d, action, _method: 'put' })); form.post(route('admin.refunds.update', sel.id), { forceFormData: true, preserveScroll: true, onSuccess: () => setSel(null) }); };

    return (
        <AdminLayout title="Refund">
            <PageHeader title="Refund & Pembatalan" subtitle="Setiap keputusan memerlukan persetujuan admin Finance dan tercatat di audit log." />
            <FilterBar routeName="admin.refunds.index" filters={filters} fields={[{ name: 'q', type: 'search', label: 'Kode refund / nama pelanggan' }, { name: 'status', type: 'select', label: 'Semua status', options: { diajukan: 'Diajukan', disetujui: 'Disetujui', ditolak: 'Ditolak', selesai: 'Selesai' } }]} />
            <Card pad={false}>
                {refunds.data.length === 0 ? <Empty title="Tidak ada pengajuan" /> : (
                    <div className="overflow-x-auto"><table className="table-app">
                        <thead><tr><th>Kode</th><th>Pelanggan</th><th>Pesanan</th><th className="!text-right">Diajukan</th><th className="!text-right">Disetujui</th><th>Status</th><th>Tanggal</th><th></th></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                            {refunds.data.map((r) => (
                                <tr key={r.id}>
                                    <td className="whitespace-nowrap">{r.order_url
                                        ? <Link href={r.order_url} className="font-semibold text-brand-700 hover:underline" title={`Buka pesanan ${r.order}`}>{r.code}</Link>
                                        : <span className="font-semibold text-brand-700">{r.code}</span>}
                                        <NewDot show={(r.order_url && isNew(r.order_url)) || isNew(route('admin.refunds.index'), r.code)} /><p className="text-[11px] font-semibold text-violet-700">{r.type_label}</p></td><td>{r.user}<p className="text-xs text-slate-500">{r.customer_code}</p></td>
                                    <td>{r.order}<p className="text-xs text-slate-500">dibayar {rupiah(r.paid)}</p></td>
                                    <td className="text-right">{rupiah(r.requested_amount)}</td><td className="text-right">{r.approved_amount != null ? rupiah(r.approved_amount) : '-'}</td>
                                    <td><StatusBadge status={r.status} /></td><td>{r.created_at}</td>
                                    <td><button onClick={() => open(r)} className="btn-outline btn-sm"><Eye className="h-3.5 w-3.5" />Tinjau</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table></div>
                )}
                <Pagination meta={refunds} />
            </Card>

            <Modal show={!!sel} onClose={() => setSel(null)} maxWidth="2xl">
                {sel && (
                    <div className="max-h-[85vh] overflow-y-auto p-6">
                        <div className="flex items-center justify-between"><h2 className="text-xl">Refund {sel.code}</h2><StatusBadge status={sel.status} /></div>
                        <div className="mt-4"><DefList items={[['Pelanggan', `${sel.user} (${sel.customer_code})`], ['Pesanan', `${sel.order} · ${sel.order_status}`], ['Total dibayar', rupiah(sel.paid)], ['Diajukan', rupiah(sel.requested_amount)], ['Jenis', sel.type_label], ['Rekening', sel.bank_name ? `${sel.bank_name} ${sel.account_number ?? ''}` : 'Belum ada — minta pelanggan mengirim nomor rekening'], ['Atas nama', sel.account_holder ?? '-']]} /></div>
                        {sel.order_url && <Link href={sel.order_url} className="btn-outline btn-sm mt-3">Buka pesanan {sel.order}</Link>}
                        {sel.passengers?.length > 0 && (
                            <div className="mt-4 rounded-xl bg-violet-50 p-3 text-sm ring-1 ring-violet-200">
                                <p className="font-semibold text-violet-900">Jamaah yang dikurangi:</p>
                                <ul className="mt-1 list-inside list-disc text-violet-900">{sel.passengers.map((n) => <li key={n}>{n}</li>)}</ul>
                            </div>
                        )}
                        <p className="mt-4 rounded-xl bg-sand-100 p-3 text-sm"><b>Alasan:</b> {sel.reason}</p>
                        {sel.has_proof && <a href={route('admin.refunds.proof', sel.id)} target="_blank" className="btn-outline btn-sm mt-3"><Eye className="h-3.5 w-3.5" />Lihat foto bukti</a>}

                        {sel.status === 'diajukan' && (
                            <div className="mt-6 space-y-3 border-t border-slate-100 pt-5">
                                <Input label="Nominal disetujui" type="number" value={form.data.approved_amount} onChange={(e) => form.setData('approved_amount', e.target.value)} error={form.errors.approved_amount} hint="Sesuaikan dengan potongan pada Kebijakan Refund" />
                                <Textarea rows={2} label="Catatan untuk pelanggan" value={form.data.admin_note} onChange={(e) => form.setData('admin_note', e.target.value)} />
                                {sel.type === 'pembatalan' && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">Disetujui → pesanan <b>dibatalkan</b>, kursi dilepas, status pesanan menjadi <b>Refund</b> (atau Dibatalkan bila nominal 0).</p>}
                                {sel.type === 'pengurangan' && <p className="rounded-lg bg-violet-50 px-3 py-2 text-sm text-violet-900">Disetujui → jamaah di atas <b>dikeluarkan dari pesanan</b>, total & jadwal cicilan dihitung ulang, total dibayar dikurangi nominal disetujui.</p>}
                                {sel.is_booking && sel.type === 'refund' && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.data.cancel_order} onChange={(e) => form.setData('cancel_order', e.target.checked)} />Batalkan pesanan umrah & lepas kursi</label>}
                                <div className="flex gap-2"><button onClick={() => submit('setujui')} disabled={form.processing} className="btn-primary">Setujui</button><button onClick={() => submit('tolak')} disabled={form.processing} className="btn-danger">Tolak</button></div>
                            </div>
                        )}
                        {sel.status === 'disetujui' && (
                            <div className="mt-6 space-y-3 border-t border-slate-100 pt-5">
                                <p className="text-sm">Transfer <b>{rupiah(sel.approved_amount)}</b> ke {sel.bank_name ? `${sel.bank_name} ${sel.account_number ?? ''} a.n. ${sel.account_holder ?? '-'}` : 'rekening pelanggan (minta datanya terlebih dulu)'}, lalu unggah bukti transfer.</p>
                                <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={(e) => form.setData('transfer_proof', e.target.files[0])} className="text-sm" />
                                {form.errors.transfer_proof && <p className="error">{form.errors.transfer_proof}</p>}
                                <button onClick={() => submit('selesai')} disabled={form.processing} className="btn-primary">Tandai Selesai Ditransfer</button>
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </AdminLayout>
    );
}
