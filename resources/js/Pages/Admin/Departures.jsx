import { router } from '@inertiajs/react';
import { FileDown, FileSpreadsheet } from 'lucide-react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Card, Empty, PageHeader, Pagination, StatusBadge, cx } from '@/Components/ui';
import { date } from '@/lib/format';

const URG = {
    h1: ['H-1', 'bg-red-600 text-white', 'bg-red-50/60'],
    h7: ['≤ H-7', 'bg-orange-500 text-white', 'bg-orange-50/50'],
    h30: ['≤ H-30', 'bg-amber-300 text-amber-950', 'bg-amber-50/40'],
    normal: ['> H-30', 'bg-slate-100 text-slate-600', ''],
    past: ['Selesai', 'bg-slate-200 text-slate-500', ''],
};

export default function Departures({ departures, range }) {
    return (
        <AdminLayout title="Keberangkatan">
            <PageHeader title="Monitor Keberangkatan" subtitle="Warna menandai kedekatan: merah H-1, oranye ≤ H-7, kuning ≤ H-30. Pengingat otomatis H-30/H-7/H-1 dikirim ke jamaah." />
            <div className="mb-4 inline-flex rounded-xl bg-white p-1 shadow-soft">
                {[['mendatang', 'Mendatang'], ['lalu', 'Sudah lewat']].map(([k, l]) => (
                    <button key={k} onClick={() => router.get(route('admin.departures.index'), { rentang: k })} className={cx('rounded-lg px-4 py-2 text-sm font-medium', range === k ? 'bg-brand-700 text-white' : 'text-slate-600')}>{l}</button>
                ))}
            </div>
            <Card pad={false}>
                {departures.data.length === 0 ? <Empty title="Tidak ada jadwal" /> : (
                    <div className="overflow-x-auto"><table className="table-app">
                        <thead><tr><th>Urgensi</th><th>Paket</th><th>Berangkat</th><th>Kuota</th><th>Terisi</th><th>Ditahan</th><th>Sisa</th><th>Belum lunas</th><th>Status</th><th>Manifest</th></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                            {departures.data.map((d) => {
                                const [label, badge, row] = URG[d.urgency];
                                return (
                                    <tr key={d.id} className={row}>
                                        <td><span className={cx('rounded-lg px-2 py-1 text-xs font-bold', badge)}>{d.days_left >= 0 ? `H-${d.days_left}` : label}</span></td>
                                        <td><p className="font-medium">{d.package}</p><p className="text-xs text-slate-500">{d.airline}</p></td>
                                        <td>{date(d.departure_date)}<p className="text-xs text-slate-500">pulang {date(d.return_date)}</p></td>
                                        <td>{d.quota}</td><td className="font-semibold">{d.booked}</td><td>{d.held}</td><td>{d.remaining}</td>
                                        <td>{d.unpaid > 0 ? <span className="font-semibold text-red-600">{d.unpaid} pesanan</span> : '—'}</td>
                                        <td><StatusBadge status={d.status} /></td>
                                        <td className="whitespace-nowrap">
                                            <a href={route('admin.departures.manifest', { departure: d.id, format: 'xlsx' })} className="btn-ghost btn-sm" title="Excel"><FileSpreadsheet className="h-4 w-4 text-emerald-700" /></a>
                                            <a href={route('admin.departures.manifest', { departure: d.id, format: 'pdf' })} className="btn-ghost btn-sm" title="PDF"><FileDown className="h-4 w-4 text-red-600" /></a>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table></div>
                )}
                <Pagination meta={departures} />
            </Card>
        </AdminLayout>
    );
}
