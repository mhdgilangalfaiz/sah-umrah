import { Link, router, usePage } from '@inertiajs/react';
import { Clock, RefreshCw, Scale, Wallet } from 'lucide-react';
import AdminLayout from '@/Layouts/AdminLayout';
import { NewDot, useUnread } from '@/lib/unread';
import FilterBar from '@/Components/FilterBar';
import { Card, Empty, PageHeader, Pagination, Stat, StatusBadge } from '@/Components/ui';
import { rupiah, shortRupiah } from '@/lib/format';

export default function Index({ payments, filters, methods, summary }) {
    const isNew = useUnread();
    const canCheck = usePage().props.auth.user.role === 'admin'; // Super Admin hanya melihat
    return (
        <AdminLayout title="Pembayaran">
            <PageHeader title="Monitoring Pembayaran" subtitle="Status diperbarui otomatis oleh webhook payment gateway." actions={<Link href={route('admin.payments.reconcile')} className="btn-outline"><Scale className="h-4 w-4" />Rekonsiliasi</Link>} />
            <div className="mb-6 grid gap-4 sm:grid-cols-3">
                <Stat label="Diterima hari ini" value={shortRupiah(summary.paid_today)} icon={Wallet} />
                <Stat label="Transaksi pending" value={summary.pending} icon={Clock} tone="gold" />
                <Stat label="Nilai pending" value={shortRupiah(summary.pending_amount)} icon={Clock} tone="slate" />
            </div>
            <FilterBar routeName="admin.payments.index" filters={filters} fields={[
                { name: 'q', type: 'search', label: 'Kode / nomor VA' },
                { name: 'status', type: 'select', label: 'Semua status', options: { menunggu_pembayaran: 'Menunggu', dibayar: 'Dibayar', kedaluwarsa: 'Kedaluwarsa', gagal: 'Gagal', refund: 'Refund' } },
                { name: 'method', type: 'select', label: 'Semua metode', options: methods },
                { name: 'dari', type: 'date', label: 'Dari' }, { name: 'sampai', type: 'date', label: 'Sampai' },
            ]} />
            <Card pad={false}>
                {payments.data.length === 0 ? <Empty title="Tidak ada transaksi" /> : (
                    <div className="overflow-x-auto"><table className="table-app">
                        <thead><tr><th>Kode</th><th>Pelanggan</th><th>Pesanan</th><th>Metode</th><th className="!text-right">Nominal</th><th>Status</th><th>Dibuat</th><th>Dibayar</th><th></th></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                            {payments.data.map((p) => (
                                <tr key={p.code}>
                                    <td className="font-medium"><Link href={route('admin.payments.index', { q: p.code })} className="hover:underline">{p.code}</Link><NewDot show={isNew(route('admin.payments.index'), p.code)} /><p className="text-[11px] uppercase text-slate-400">{p.gateway}</p></td>
                                    <td>{p.user}<p className="text-xs text-slate-500">{p.customer_code}</p></td>
                                    <td>{p.order}</td>
                                    <td>{p.method_label}{p.va_number && <p className="font-mono text-xs text-slate-500">{p.va_number}</p>}</td>
                                    <td className="text-right font-semibold">{rupiah(p.amount)}</td>
                                    <td><StatusBadge status={p.status} /></td>
                                    <td>{p.created_at}</td><td>{p.paid_at ?? '-'}</td>
                                    <td>{canCheck && p.status === 'menunggu_pembayaran' && p.gateway === 'xendit' && <button onClick={() => router.post(route('admin.payments.check', p.code), {}, { preserveScroll: true })} className="btn-ghost btn-sm" title="Cek status ke gateway"><RefreshCw className="h-4 w-4" /></button>}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table></div>
                )}
                <Pagination meta={payments} />
            </Card>
        </AdminLayout>
    );
}
