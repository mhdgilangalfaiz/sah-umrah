import { router } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import FilterBar from '@/Components/FilterBar';
import { Badge, Card, Empty, PageHeader, Pagination } from '@/Components/ui';

export default function Users({ users, filters }) {
    return (
        <AdminLayout title="Pelanggan">
            <PageHeader title="Manajemen Pelanggan" subtitle="Setiap pelanggan memiliki kode unik yang dipakai di seluruh sistem & riwayat bantuan." />
            <FilterBar routeName="admin.users.index" filters={filters} fields={[{ name: 'q', type: 'search', label: 'Nama / email / kode pelanggan' }]} />
            <Card pad={false}>
                {users.data.length === 0 ? <Empty title="Belum ada pelanggan" /> : (
                    <div className="overflow-x-auto"><table className="table-app">
                        <thead><tr><th>Kode</th><th>Nama</th><th>Kontak</th><th>Akun</th><th>Pesanan</th><th>Login terakhir</th><th>Status</th><th></th></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                            {users.data.map((u) => (
                                <tr key={u.id}>
                                    <td className="font-mono font-semibold text-brand-700">{u.customer_code}</td>
                                    <td>{u.name}<p className="text-xs text-slate-500">{u.city}</p></td>
                                    <td>{u.email}<p className="text-xs text-slate-500">{u.phone}</p></td>
                                    <td className="space-x-1">{u.google && <Badge className="bg-sky-50 text-sky-700 ring-sky-600/20">Google</Badge>}{u.verified ? <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-600/20">Terverifikasi</Badge> : <Badge className="bg-amber-50 text-amber-700 ring-amber-600/20">Belum verifikasi</Badge>}{!u.profile_completed && <Badge className="bg-slate-100 text-slate-500 ring-slate-300">Profil belum lengkap</Badge>}</td>
                                    <td>{u.orders}</td><td>{u.last_login_at ?? '-'}</td>
                                    <td>{u.is_active ? <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-600/20">Aktif</Badge> : <Badge className="bg-red-50 text-red-700 ring-red-600/20">Nonaktif</Badge>}</td>
                                    <td><button onClick={() => confirm(`${u.is_active ? 'Nonaktifkan' : 'Aktifkan'} ${u.name}?`) && router.post(route('admin.users.toggle', u.id), {}, { preserveScroll: true })} className="btn-outline btn-sm">{u.is_active ? 'Nonaktifkan' : 'Aktifkan'}</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table></div>
                )}
                <Pagination meta={users} />
            </Card>
        </AdminLayout>
    );
}
