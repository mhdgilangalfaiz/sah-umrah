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
                    {invoices.data.length === 0 ? <Empty title="Belum ada invoice" /> : (
                        <div className="overflow-x-auto"><table className="table-app">
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
                    )}
                    <Pagination meta={invoices} />
                </Card>
            ) : (
                <Card pad={false}>
                    {payments.data.length === 0 ? <Empty title="Belum ada transaksi" /> : (
                        <div className="overflow-x-auto"><table className="table-app">
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
                    )}
                    <Pagination meta={payments} />
                </Card>
            )}
        </CustomerLayout>
    );
}
