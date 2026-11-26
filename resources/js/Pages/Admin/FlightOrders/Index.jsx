import { Link, router } from '@inertiajs/react';
import { ChevronRight } from 'lucide-react';
import AdminLayout from '@/Layouts/AdminLayout';
import { NewDot, useUnread } from '@/lib/unread';
import FilterBar from '@/Components/FilterBar';
import { Card, Empty, PageHeader, Pagination, StatusBadge } from '@/Components/ui';
import { rupiah } from '@/lib/format';

/**
 * Daftar pesanan tiket, berurutan No. Invoice. Seluruh baris bisa diklik untuk membuka detail pesanan & invoice.
 */
export default function Index({ orders, filters }) {
    const isNew = useUnread();
    const open = (o) => router.visit(route('admin.flight-orders.show', o.code));

    return (
        <AdminLayout title="Pesanan Tiket">
            <PageHeader title="Pesanan Tiket Pesawat" subtitle="Terbitkan e-ticket setelah pembayaran lunas." />
            <FilterBar routeName="admin.flight-orders.index" filters={filters} fields={[
                { name: 'q', type: 'search', label: 'No. invoice / pemesan / kode pesanan' },
                { name: 'status', type: 'select', label: 'Semua status', options: { menunggu_pembayaran: 'Menunggu Pembayaran', cicilan_berjalan: 'Cicilan Berjalan', dibayar: 'Dibayar (perlu e-ticket)', tiket_terbit: 'E-Ticket Terbit', kedaluwarsa: 'Kedaluwarsa', dibatalkan: 'Dibatalkan' } },
            ]} />
            <Card pad={false}>
                {orders.data.length === 0 ? <Empty title="Belum ada pesanan" /> : (
                    <div className="overflow-x-auto"><table className="table-app">
                        <thead><tr><th>No. Invoice</th><th>Pemesan</th><th>Jadwal</th><th className="!text-center">Jumlah Beli</th><th className="!text-right">Total Tagihan</th><th>Status</th><th></th></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                            {orders.data.map((o) => (
                                <tr key={o.id} onClick={() => open(o)} title="Buka detail pesanan"
                                    className={`cursor-pointer transition hover:bg-brand-50/60 ${o.status === 'dibayar' ? 'bg-sky-50/50' : ''}`}>
                                    <td>
                                        <span className="font-semibold text-brand-700">{o.invoice_number ?? '-'}</span>
                                        <NewDot show={isNew(route('admin.flight-orders.show', o.code))} />
                                        <p className="text-xs text-slate-500">{o.code}</p>
                                    </td>
                                    <td><span className="font-medium text-slate-900">{o.buyer}</span><p className="text-xs text-slate-500">{o.buyer_sub}</p></td>
                                    <td><span className="font-mono font-semibold tracking-wide text-slate-900">{o.schedule || '-'}</span><p className="text-xs text-slate-500">{o.airline}</p></td>
                                    <td className="text-center">{o.pax_count} seat</td>
                                    <td className="text-right">
                                        <span className="font-semibold text-slate-900">{rupiah(o.total_amount)}</span>
                                        {o.outstanding > 0 && !['dibatalkan', 'kedaluwarsa'].includes(o.status) && <p className="text-xs text-amber-700">sisa {rupiah(o.outstanding)}</p>}
                                    </td>
                                    <td><StatusBadge status={o.status} /></td>
                                    <td className="text-right">
                                        <Link href={route('admin.flight-orders.show', o.code)} onClick={(e) => e.stopPropagation()} className="btn-outline btn-sm">Detail<ChevronRight className="h-3.5 w-3.5" /></Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table></div>
                )}
                <Pagination meta={orders} />
            </Card>
        </AdminLayout>
    );
}
