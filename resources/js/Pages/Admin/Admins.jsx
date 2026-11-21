import { router, useForm } from '@inertiajs/react';
import { KeyRound, UserPlus } from 'lucide-react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Badge, Card, Input, PageHeader } from '@/Components/ui';

export default function Admins({ admins }) {
    const { data, setData, post, processing, errors, reset } = useForm({ name: '', email: '', phone: '', password: '', password_confirmation: '', my_password: '' });

    const update = (a, patch) => {
        const pwd = patch.reset ? prompt('Kata sandi baru (min. 10 karakter, huruf besar/kecil & angka):') : null;
        if (patch.reset && !pwd) return;
        router.put(route('admin.admins.update', a.id), { is_active: patch.is_active ?? a.is_active, ...(pwd ? { password: pwd, password_confirmation: pwd } : {}) }, { preserveScroll: true });
    };

    return (
        <AdminLayout title="Akun Admin">
            <PageHeader title="Akun Admin" subtitle="Buat akun Admin untuk mengelola website. Admin dapat mengubah seluruh isi website, tetapi tidak dapat membuat akun admin lain." />
            <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
                <Card title="Daftar akun" pad={false}>
                    <div className="overflow-x-auto"><table className="table-app">
                        <thead><tr><th>Nama</th><th>Peran</th><th>Login terakhir</th><th>Status</th><th></th></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                            {admins.map((a) => (
                                <tr key={a.id}>
                                    <td><p className="flex items-center gap-1 font-semibold">{a.is_super_admin && <KeyRound className="h-4 w-4 text-gold-500" />}{a.name}</p><p className="text-xs text-slate-500">{a.email}</p></td>
                                    <td>{a.is_super_admin
                                        ? <Badge className="bg-gold-50 text-gold-800 ring-gold-300">Super Admin</Badge>
                                        : <Badge className="bg-brand-50 text-brand-800 ring-brand-200">Admin</Badge>}</td>
                                    <td>{a.last_login_at ?? '-'}<p className="text-xs text-slate-400">{a.last_login_ip}</p></td>
                                    <td>{a.is_active ? <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-600/20">Aktif</Badge> : <Badge className="bg-red-50 text-red-700 ring-red-600/20">Nonaktif</Badge>}</td>
                                    <td className="whitespace-nowrap">{!a.is_super_admin && <>
                                        <button onClick={() => update(a, { is_active: !a.is_active })} className="btn-ghost btn-sm">{a.is_active ? 'Nonaktifkan' : 'Aktifkan'}</button>
                                        <button onClick={() => update(a, { reset: true })} className="btn-ghost btn-sm">Reset sandi</button>
                                    </>}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table></div>
                </Card>
                <Card title="Tambah akun Admin">
                    <form onSubmit={(e) => { e.preventDefault(); post(route('admin.admins.store'), { onSuccess: () => reset() }); }} className="space-y-3">
                        <Input label="Nama" value={data.name} onChange={(e) => setData('name', e.target.value)} error={errors.name} required />
                        <Input label="Email (bebas, tidak wajib @gmail.com)" type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} error={errors.email} required />
                        <Input label="No. HP" value={data.phone} onChange={(e) => setData('phone', e.target.value)} />
                        <Input label="Kata sandi" type="password" value={data.password} onChange={(e) => setData('password', e.target.value)} error={errors.password} hint="Min. 10 karakter, huruf besar, kecil & angka" required />
                        <Input label="Ulangi kata sandi" type="password" value={data.password_confirmation} onChange={(e) => setData('password_confirmation', e.target.value)} required />
                        <Input label="Kata sandi Anda (Super Admin)" type="password" value={data.my_password} onChange={(e) => setData('my_password', e.target.value)} error={errors.my_password} required />
                        <button disabled={processing} className="btn-primary w-full"><UserPlus className="h-4 w-4" />Buat Akun Admin</button>
                    </form>
                </Card>
            </div>
        </AdminLayout>
    );
}
