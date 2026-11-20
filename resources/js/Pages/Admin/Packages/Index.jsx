import { Link, router } from '@inertiajs/react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import AdminLayout from '@/Layouts/AdminLayout';
import FilterBar from '@/Components/FilterBar';
import { Badge, Card, Empty, PageHeader, Pagination } from '@/Components/ui';
import { date, rupiah } from '@/lib/format';

export default function Index({ packages, filters }) {
    return (
        <AdminLayout title="Paket Umrah">
            <PageHeader title="Paket Umrah" subtitle="Kelola paket, harga, itinerary, hotel, jadwal & kuota." actions={<Link href={route('admin.packages.create')} className="btn-primary"><Plus className="h-4 w-4" />Paket Baru</Link>} />
            <FilterBar routeName="admin.packages.index" filters={filters} fields={[{ name: 'q', type: 'search', label: 'Cari nama paket' }]} />
            <Card pad={false}>
                {packages.data.length === 0 ? <Empty title="Belum ada paket" /> : (
                    <div className="overflow-x-auto"><table className="table-app">
                        <thead><tr><th>Paket</th><th>Jenis</th><th className="!text-right">Harga Quad</th><th className="!text-right">Deposit</th><th>Jadwal terdekat</th><th>Status</th><th></th></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                            {packages.data.map((p) => {
                                const next = p.upcoming_departures[0];
                                return (
                                    <tr key={p.id}>
                                        <td><p className="font-semibold">{p.name}</p><p className="text-xs text-slate-500">{p.duration_days} hari · {p.airline} · {p.departures_count} jadwal</p></td>
                                        <td className="capitalize">{p.type}</td>
                                        <td className="text-right">{rupiah(p.price_quad)}</td>
                                        <td className="text-right">{rupiah(p.min_deposit)}</td>
                                        <td>{next ? <>{date(next.departure_date)}<span className="block text-xs text-slate-500">sisa {next.remaining}/{next.quota}</span></> : '-'}</td>
                                        <td className="space-x-1">{p.is_active ? <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-600/20">Aktif</Badge> : <Badge className="bg-slate-100 text-slate-500 ring-slate-300">Nonaktif</Badge>}{p.is_featured && <Badge className="bg-gold-50 text-gold-800 ring-gold-300">Unggulan</Badge>}</td>
                                        <td className="text-right">
                                            <Link href={route('admin.packages.edit', p.id)} className="btn-ghost btn-sm"><Pencil className="h-4 w-4" /></Link>
                                            <button onClick={() => confirm(`Hapus paket ${p.name}?`) && router.delete(route('admin.packages.destroy', p.id))} className="btn-ghost btn-sm text-red-600"><Trash2 className="h-4 w-4" /></button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table></div>
                )}
                <Pagination meta={packages} />
            </Card>
        </AdminLayout>
    );
}
