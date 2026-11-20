import { Link } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import FilterBar from '@/Components/FilterBar';
import { Card, Empty, PageHeader, Pagination, StatusBadge } from '@/Components/ui';
import { dateTime, rupiah } from '@/lib/format';

export default function Index({ orders, filters }) {
    return (
        <AdminLayout title="Pesanan Tiket">
            <PageHeader title="Pesanan Tiket Pesawat" subtitle="Terbitkan e-ticket setelah pembayaran lunas." />
            <FilterBar routeName="admin.flight-orders.index" filters={filters} fields={[
                { name: 'q', type: 'search', label: 'Kode pesanan' },
                { name: 'status', type: 'select', label: 'Semua status', options: { menunggu_pembayaran: 'Menunggu Pembayaran', dibayar: 'Dibayar (perlu e-ticket)', tiket_terbit: 'E-Ticket Terbit', kedaluwarsa: 'Kedaluwarsa', dibatalkan: 'Dibatalkan' } },
            ]} />
            <Card pad={false}>
                {orders.data.length === 0 ? <Empty title="Belum ada pesanan" /> : (
                    <div className="overflow-x-auto"><table className="table-app">
                        <thead><tr><th>Kode</th><th>Pemesan</th><th>Penerbangan</th><th>Pax</th><th className="!text-right">Total</th><th>Status</th><th>Dibuat</th></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                            {orders.data.map((o) => (
                                <tr key={o.id} className={o.status === 'dibayar' ? 'bg-sky-50/50' : ''}>
                                    <td><Link href={route('admin.flight-orders.show', o.code)} className="font-semibold text-brand-700 hover:underline">{o.code}</Link></td>
                                    <td>{o.user.name}<p className="text-xs text-slate-500">{o.user.customer_code}</p></td>
                                    <td>{o.flight.airline} {o.flight.flight_number}<p className="text-xs text-slate-500">{o.flight.origin_code}→{o.flight.destination_code} · {dateTime(o.flight.depart_at)}</p></td>
                                    <td>{o.pax_count}</td><td className="text-right">{rupiah(o.total_amount)}</td><td><StatusBadge status={o.status} /></td><td>{dateTime(o.created_at)}</td>
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
