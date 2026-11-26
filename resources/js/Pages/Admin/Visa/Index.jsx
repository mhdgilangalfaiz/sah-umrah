import { Link } from '@inertiajs/react';
import { ChevronRight } from 'lucide-react';
import AdminLayout from '@/Layouts/AdminLayout';
import { NewDot, useUnread } from '@/lib/unread';
import FilterBar from '@/Components/FilterBar';
import { Card, Empty, PageHeader, Pagination, StatusBadge } from '@/Components/ui';
import { rupiah } from '@/lib/format';

export default function Index({ applications, filters, statuses }) {
    const isNew = useUnread();
    return (
        <AdminLayout title="Pengajuan Visa">
            <PageHeader title="Pengajuan Visa" subtitle="Terbitkan invoice → pembayaran → verifikasi berkas → proses → terbit." />
            <FilterBar routeName="admin.visa.index" filters={filters} fields={[{ name: 'q', type: 'search', label: 'No. invoice / nama pemohon' }, { name: 'status', type: 'select', label: 'Semua status', options: statuses }]} />
            <Card pad={false}>
                {applications.data.length === 0 ? <Empty title="Belum ada pengajuan" /> : (
                    <div className="overflow-x-auto"><table className="table-app">
                        <thead><tr><th>No. Invoice</th><th>Pemohon</th><th>Layanan</th><th>Jumlah</th><th className="!text-right">Total</th><th>Status</th><th></th></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                            {applications.data.map((v) => (
                                <tr key={v.id} className={['menunggu_invoice', 'menunggu_dokumen'].includes(v.status) ? 'bg-amber-50/40' : ''}>
                                    <td>{v.invoice_number ? <span className="font-semibold text-slate-900">{v.invoice_number}</span> : <span className="text-xs text-slate-500">Belum ada invoice</span>}<NewDot show={isNew(route('admin.visa.show', v.code))} /></td>
                                    <td className="font-medium text-slate-900">{v.user.name}</td>
                                    <td>{v.service.name}</td><td>{v.pax_count} org</td>
                                    <td className="text-right">{v.total_amount ? rupiah(v.total_amount) : '-'}</td>
                                    <td><StatusBadge status={v.status} label={statuses[v.status]} /></td>
                                    <td className="text-right"><Link href={route('admin.visa.show', v.code)} className="btn-outline btn-sm">Detail<ChevronRight className="h-3.5 w-3.5" /></Link></td>
                                </tr>
                            ))}
                        </tbody>
                    </table></div>
                )}
                <Pagination meta={applications} />
            </Card>
        </AdminLayout>
    );
}
