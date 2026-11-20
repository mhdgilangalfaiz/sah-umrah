import { Link, router } from '@inertiajs/react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import AdminLayout from '@/Layouts/AdminLayout';
import FilterBar from '@/Components/FilterBar';
import { Badge, Card, Empty, PageHeader, Pagination } from '@/Components/ui';
import { dateTime, rupiah } from '@/lib/format';

export default function Index({ flights, filters }) {
    return (
        <AdminLayout title="Jadwal Penerbangan">
            <PageHeader title="Jadwal Penerbangan" subtitle="Tidak ada integrasi API maskapai — admin memperbarui jadwal, harga, dan kursi secara manual." actions={<Link href={route('admin.flights.create')} className="btn-primary"><Plus className="h-4 w-4" />Tambah</Link>} />
            <FilterBar routeName="admin.flights.index" filters={filters} fields={[{ name: 'q', type: 'search', label: 'Maskapai / nomor penerbangan' }]} />
            <Card pad={false}>
                {flights.data.length === 0 ? <Empty title="Belum ada jadwal" /> : (
                    <div className="overflow-x-auto"><table className="table-app">
                        <thead><tr><th>Penerbangan</th><th>Rute</th><th>Berangkat</th><th>Durasi</th><th className="!text-right">Harga</th><th>Kursi</th><th>Status</th><th></th></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                            {flights.data.map((f) => (
                                <tr key={f.id}>
                                    <td><p className="font-semibold">{f.airline}</p><p className="text-xs text-slate-500">{f.flight_number} · {f.cabin_class}</p></td>
                                    <td>{f.origin_code} → {f.destination_code}<p className="text-xs text-slate-500">{f.transit_count ? `${f.transit_count} transit` : 'langsung'}</p></td>
                                    <td>{dateTime(f.depart_at)}</td><td>{f.duration_label}</td>
                                    <td className="text-right">{rupiah(f.price)}</td>
                                    <td className={f.seats_available < 5 ? 'font-semibold text-red-600' : ''}>{f.seats_available}</td>
                                    <td>{f.is_active ? <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-600/20">Aktif</Badge> : <Badge className="bg-slate-100 text-slate-500 ring-slate-300">Nonaktif</Badge>}</td>
                                    <td className="whitespace-nowrap text-right">
                                        <Link href={route('admin.flights.edit', f.id)} className="btn-ghost btn-sm"><Pencil className="h-4 w-4" /></Link>
                                        <button onClick={() => confirm('Hapus jadwal ini?') && router.delete(route('admin.flights.destroy', f.id), { preserveScroll: true })} className="btn-ghost btn-sm text-red-600"><Trash2 className="h-4 w-4" /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table></div>
                )}
                <Pagination meta={flights} />
            </Card>
        </AdminLayout>
    );
}
