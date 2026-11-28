import { Link, router, usePage } from '@inertiajs/react';
import { CreditCard, RefreshCw, Scale } from 'lucide-react';
import { ProofLink } from '@/Components/PaymentProof';
import AdminLayout from '@/Layouts/AdminLayout';
import { NewDot, useUnread } from '@/lib/unread';
import FilterBar from '@/Components/FilterBar';
import IllustratedStat from '@/Components/admin/IllustratedStat';
import { Card, Empty, PageHeader, Pagination, StatusBadge } from '@/Components/ui';
import { rupiah } from '@/lib/format';

export default function Index({ payments, filters, methods, summary }) {
    const isNew = useUnread();
    const canCheck = usePage().props.auth.user.role === 'admin'; // Super Admin hanya melihat
    return (
        <AdminLayout title="Pembayaran" icon={CreditCard}>
            <PageHeader title="Monitoring Pembayaran" subtitle="Status diperbarui otomatis oleh webhook payment gateway." actions={<Link href={route('admin.payments.reconcile')} className="btn-outline"><Scale className="h-4 w-4" />Rekonsiliasi</Link>} />
            <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 [&>*:last-child:nth-child(odd)]:col-span-2 md:[&>*:last-child:nth-child(odd)]:col-span-1">
                <IllustratedStat label="Diterima Hari Ini" value={rupiah(summary.paid_today)} sub="Pembayaran berhasil hari ini" image="/images/admin/kartu/bayar-diterima.webp" tone="green"
                    href={route('admin.payments.index', { status: 'dibayar' })} />
                <IllustratedStat label="Transaksi Pending" value={summary.pending} sub="Menunggu dibayar jamaah" image="/images/admin/kartu/bayar-pending.webp" tone="gold"
                    href={route('admin.payments.index', { status: 'menunggu_pembayaran' })} />
                <IllustratedStat label="Nilai Pending" value={rupiah(summary.pending_amount)} sub="Total tagihan yang belum masuk" image="/images/admin/kartu/bayar-nilai.webp" tone="blue"
                    href={route('admin.payments.index', { status: 'menunggu_pembayaran' })} />
            </div>
            <FilterBar routeName="admin.payments.index" filters={filters} fields={[
                { name: 'q', type: 'search', label: 'Kode / nomor VA' },
                { name: 'status', type: 'select', label: 'Semua status', options: { menunggu_pembayaran: 'Menunggu', menunggu_verifikasi: 'Menunggu verifikasi (tunai)', dibayar: 'Dibayar', ditolak: 'Ditolak', kedaluwarsa: 'Kedaluwarsa', gagal: 'Gagal', refund: 'Refund' } },
                { name: 'layanan', type: 'select', label: 'Semua layanan', options: { umrah: 'Paket Umrah', tiket: 'Tiket Pesawat', visa: 'Visa' } },
                { name: 'method', type: 'select', label: 'Semua metode', options: methods },
                { name: 'dari', type: 'date', label: 'Dari' }, { name: 'sampai', type: 'date', label: 'Sampai' },
            ]} />
            <Card pad={false}>
                {payments.data.length === 0 ? <Empty title="Tidak ada transaksi" /> : (
                    <div className="overflow-x-auto"><table className="table-app">
                        <thead><tr><th>Kode</th><th>Pelanggan</th><th>Pesanan</th><th>Metode</th><th className="!text-right">Nominal</th><th>Status</th><th>Dibuat</th><th>Dibayar</th><th>Bukti bayar</th><th></th></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                            {payments.data.map((p) => (
                                <tr key={p.code}>
                                    <td className="font-medium"><Link href={route('admin.payments.index', { q: p.code })} className="hover:underline">{p.code}</Link><NewDot show={isNew(route('admin.payments.index'), p.code)} /><p className="text-[11px] uppercase text-slate-400">{p.gateway}</p></td>
                                    <td>{p.user}<p className="text-xs text-slate-500">{p.customer_code}</p></td>
                                    <td>{p.order}</td>
                                    <td>{p.method_label}{p.va_number && <p className="font-mono text-xs text-slate-500">{p.va_number}</p>}</td>
                                    <td className="text-right font-semibold">{rupiah(p.amount)}</td>
                                    <td><StatusBadge status={p.status} /></td>
                                    <td>{p.created_at}</td><td>{p.paid_at ?? '-'}</td><td><ProofLink p={p} /></td>
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
