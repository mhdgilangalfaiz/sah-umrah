import { Link } from '@inertiajs/react';
import { Download } from 'lucide-react';
import { useState } from 'react';
import CustomerLayout from '@/Layouts/CustomerLayout';
import { Card, Empty, PageHeader, Pagination, StatusBadge, cx } from '@/Components/ui';
import { rupiah } from '@/lib/format';
import { ProofLink } from '@/Components/PaymentProof';

export default function Billing({ invoices, payments }) {
    const [tab, setTab] = useState('invoice');
    return (
        <CustomerLayout title="Tagihan & Pembayaran">
            <PageHeader title="Tagihan & Pembayaran" subtitle="Unduh invoice resmi (lengkap dengan riwayat pembayaran) kapan saja." />
            <div className="mb-4 inline-flex rounded-xl bg-white p-1 shadow-soft">
                {[['invoice', 'Invoice'], ['payment', 'Riwayat Transaksi']].map(([k, l]) => (
                    <button key={k} onClick={() => setTab(k)} className={cx('rounded-lg px-4 py-2 text-sm font-medium', tab === k ? 'bg-brand-700 text-white' : 'text-slate-600')}>{l}</button>
                ))}
            </div>
            {tab === 'invoice' ? (
                <Card pad={false}>
                    {invoices.data.length === 0 ? <Empty title="Belum ada invoice" /> : (<>
                        {/* HP: kartu bertumpuk, tanpa geser ke samping */}
                        <ul className="divide-y divide-slate-100 sm:hidden">
                            {invoices.data.map((i) => (
                                <li key={i.id} className="space-y-2 p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0"><p className="truncate font-semibold text-slate-900">{i.number}</p><p className="text-xs capitalize text-slate-500">{i.type} · {i.issued_at}</p></div>
                                        <StatusBadge status={i.status} />
                                    </div>
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="min-w-0 text-sm">
                                            <p className="font-bold text-slate-900">{rupiah(i.amount)}</p>
                                            {i.order && <Link href={i.order.url} className="text-xs text-brand-700 hover:underline">{i.order.code}</Link>}
                                        </div>
                                        <a target="_blank" rel="noopener" href={route('invoices.pdf', i.id)} className="btn-outline btn-sm shrink-0"><Download className="h-3.5 w-3.5" />PDF</a>
                                    </div>
                                </li>
                            ))}
                        </ul>
                        <div className="hidden overflow-x-auto sm:block"><table className="table-app">
                            <thead><tr><th>Nomor</th><th>Jenis</th><th>Pesanan</th><th className="!text-right">Nominal</th><th>Status</th><th>Tanggal</th><th></th></tr></thead>
                            <tbody className="divide-y divide-slate-100">
                                {invoices.data.map((i) => (
                                    <tr key={i.id}>
                                        <td className="font-medium">{i.number}</td><td className="capitalize">{i.type}</td>
                                        <td>{i.order ? <Link href={i.order.url} className="text-brand-700 hover:underline">{i.order.code}</Link> : '-'}</td>
                                        <td className="text-right">{rupiah(i.amount)}</td><td><StatusBadge status={i.status} /></td><td>{i.issued_at}</td>
                                        <td><a target="_blank" rel="noopener" href={route('invoices.pdf', i.id)} className="btn-outline btn-sm"><Download className="h-3.5 w-3.5" />PDF</a></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table></div>
                    </>)}
                    <Pagination meta={invoices} />
                </Card>
            ) : (
                <Card pad={false}>
                    {payments.data.length === 0 ? <Empty title="Belum ada transaksi" /> : (<>
                        <ul className="divide-y divide-slate-100 sm:hidden">
                            {payments.data.map((p) => (
                                <li key={p.code} className="space-y-2 p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <Link href={route('payments.show', p.code)} className="block truncate font-semibold text-brand-700 hover:underline">{p.code}</Link>
                                            <p className="text-xs text-slate-500">{p.method_label}{p.order?.code && ` · ${p.order.code}`}</p>
                                        </div>
                                        <StatusBadge status={p.status} />
                                    </div>
                                    <div className="flex items-end justify-between gap-3">
                                        <div className="text-sm">
                                            <p className="font-bold text-slate-900">{rupiah(p.amount)}</p>
                                            <p className="text-xs text-slate-500">{p.paid_at ? `Dibayar ${p.paid_at}` : `Dibuat ${p.created_at}`}</p>
                                        </div>
                                        <div className="shrink-0"><ProofLink p={p} uploadable /></div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                        <div className="hidden overflow-x-auto sm:block"><table className="table-app">
                            <thead><tr><th>Kode</th><th>Pesanan</th><th>Metode</th><th className="!text-right">Nominal</th><th>Status</th><th>Dibuat</th><th>Dibayar</th><th>Bukti bayar</th></tr></thead>
                            <tbody className="divide-y divide-slate-100">
                                {payments.data.map((p) => (
                                    <tr key={p.code}>
                                        <td><Link href={route('payments.show', p.code)} className="font-medium text-brand-700 hover:underline">{p.code}</Link></td>
                                        <td>{p.order?.code}</td><td>{p.method_label}</td><td className="text-right">{rupiah(p.amount)}</td>
                                        <td><StatusBadge status={p.status} /></td><td>{p.created_at}</td><td>{p.paid_at ?? '-'}</td><td><ProofLink p={p} uploadable /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table></div>
                    </>)}
                    <Pagination meta={payments} />
                </Card>
            )}
        </CustomerLayout>
    );
}
