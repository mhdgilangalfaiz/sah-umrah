import { Link } from '@inertiajs/react';
import { AlertTriangle, FileSpreadsheet } from 'lucide-react';
import AdminLayout from '@/Layouts/AdminLayout';
import FilterBar from '@/Components/FilterBar';
import { Card, Empty, PageHeader, Pagination, Progress, StatusBadge } from '@/Components/ui';
import { date, rupiah } from '@/lib/format';

const STATUSES = { menunggu_pembayaran: 'Menunggu Pembayaran', cicilan_berjalan: 'Cicilan Berjalan', lunas: 'Lunas', dibatalkan: 'Dibatalkan', kedaluwarsa: 'Kedaluwarsa', selesai: 'Selesai' };

export default function Index({ bookings, filters }) {
    return (
        <AdminLayout title="Pesanan Umrah">
            <PageHeader title="Pesanan Umrah" actions={<a href={route('admin.bookings.export', filters)} className="btn-outline"><FileSpreadsheet className="h-4 w-4" />Ekspor Excel</a>} />
            <FilterBar routeName="admin.bookings.index" filters={filters} fields={[
                { name: 'q', type: 'search', label: 'Kode / nama / kode pelanggan' },
                { name: 'status', type: 'select', label: 'Semua status', options: STATUSES },
                { name: 'dari', type: 'date', label: 'Dari' }, { name: 'sampai', type: 'date', label: 'Sampai' },
                { name: 'terlambat', type: 'checkbox', label: 'Terlambat bayar' },
            ]} />
            <Card pad={false}>
                {bookings.data.length === 0 ? <Empty title="Tidak ada pesanan" /> : (
                    <div className="overflow-x-auto"><table className="table-app">
                        <thead><tr><th>Kode</th><th>Pemesan</th><th>Paket</th><th>Pax</th><th>Pembayaran</th><th>Status</th><th>Dibuat</th></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                            {bookings.data.map((b) => (
                                <tr key={b.code} className={b.overdue ? 'bg-red-50/40' : ''}>
                                    <td><Link href={route('admin.bookings.show', b.code)} className="font-semibold text-brand-700 hover:underline">{b.code}</Link></td>
                                    <td>{b.user}<p className="text-xs text-slate-500">{b.customer_code}</p></td>
                                    <td>{b.package}<p className="text-xs text-slate-500">berangkat {date(b.departure_date)}</p></td>
                                    <td>{b.pax}</td>
                                    <td className="min-w-[180px]"><Progress value={(b.paid / b.total) * 100} /><p className="mt-1 text-xs text-slate-500">{rupiah(b.paid)} / {rupiah(b.total)} · {b.scheme}</p></td>
                                    <td><StatusBadge status={b.status} />{b.overdue && <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-red-600"><AlertTriangle className="h-3 w-3" />Terlambat</p>}</td>
                                    <td>{b.created_at}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table></div>
                )}
                <Pagination meta={bookings} />
            </Card>
        </AdminLayout>
    );
}
