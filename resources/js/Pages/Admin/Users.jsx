import { Link, router, useForm } from '@inertiajs/react';
import { BookUser, Pencil, Power, Trash2, UserPlus, Users as UsersIcon } from 'lucide-react';
import { useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import FilterBar from '@/Components/FilterBar';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/Components/landing/ui/dialog';
import { Badge, Card, Empty, Input, PageHeader, Pagination } from '@/Components/ui';

const blank = { name: '', email: '', phone: '', password: '', password_confirmation: '', is_active: true };

/** Kelola akun pelanggan: tambah, ubah, aktif/nonaktif, hapus (hanya akun tanpa transaksi). */
export default function Users({ users, filters }) {
    const [editing, setEditing] = useState(null); // null = tertutup, {} = tambah, user = ubah
    const form = useForm(blank);
    const isNew = editing && !editing.id;

    const open = (u = {}) => {
        form.clearErrors();
        form.setData(u.id ? { ...blank, name: u.name, email: u.email, phone: u.phone ?? '', is_active: u.is_active } : blank);
        setEditing(u);
    };
    const submit = (e) => {
        e.preventDefault();
        const opts = { preserveScroll: true, onSuccess: () => setEditing(null) };
        isNew ? form.post(route('admin.users.store'), opts) : form.put(route('admin.users.update', editing.id), opts);
    };
    const remove = (u) => {
        if (window.confirm(`Hapus akun ${u.name}? Data jamaah miliknya ikut terhapus. Tindakan ini tidak bisa dibatalkan.`)) {
            router.delete(route('admin.users.destroy', u.id), { preserveScroll: true });
        }
    };
    const toggle = (u) => window.confirm(`${u.is_active ? 'Nonaktifkan' : 'Aktifkan'} ${u.name}?`) && router.post(route('admin.users.toggle', u.id), {}, { preserveScroll: true });

    return (
        <AdminLayout title="Kelola Pengguna" icon={UsersIcon}>
            <PageHeader title="Kelola Pengguna" subtitle="Akun pelanggan yang login ke website. Setiap akun punya kode unik yang dipakai di seluruh sistem."
                actions={<button type="button" onClick={() => open()} className="btn-primary"><UserPlus className="h-4 w-4" />Tambah Pengguna</button>} />
            <FilterBar routeName="admin.users.index" filters={filters} fields={[{ name: 'q', type: 'search', label: 'Nama / email / kode pelanggan' }]} />

            <Card pad={false}>
                {users.data.length === 0 ? <Empty title="Belum ada pelanggan" /> : (
                    <div className="overflow-x-auto"><table className="table-app">
                        <thead><tr><th>Kode</th><th>Pengguna</th><th>Akun</th><th className="!text-center">Jamaah</th><th className="!text-center">Pesanan</th><th>Status</th><th className="!text-right">Aksi</th></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                            {users.data.map((u) => (
                                <tr key={u.id}>
                                    <td className="font-mono font-semibold text-brand-700">{u.customer_code}</td>
                                    <td>
                                        <p className="font-semibold text-slate-900">{u.name}</p>
                                        <p className="text-xs text-slate-500">{u.email}</p>
                                        {(u.phone || u.city) && <p className="text-xs text-slate-500">{[u.phone, u.city].filter(Boolean).join(' · ')}</p>}
                                    </td>
                                    <td className="!whitespace-normal"><div className="flex min-w-[120px] max-w-[190px] flex-wrap gap-1">{u.google && <Badge className="bg-sky-50 text-sky-700 ring-sky-600/20">Google</Badge>}{u.verified ? <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-600/20">Terverifikasi</Badge> : <Badge className="bg-amber-50 text-amber-700 ring-amber-600/20">Belum verifikasi</Badge>}{!u.profile_completed && <Badge className="bg-slate-100 text-slate-500 ring-slate-300">Profil belum lengkap</Badge>}</div></td>
                                    <td className="text-center">
                                        {u.jamaah > 0
                                            ? <Link href={route('admin.jamaah.show', u.customer_code)} className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline" title="Lihat data jamaah akun ini"><BookUser className="h-3.5 w-3.5" />{u.jamaah}</Link>
                                            : <span className="text-slate-400">0</span>}
                                    </td>
                                    <td className="text-center">{u.orders}</td>
                                                                        <td>{u.is_active ? <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-600/20">Aktif</Badge> : <Badge className="bg-red-50 text-red-700 ring-red-600/20">Nonaktif</Badge>}<p className="mt-1 text-[11px] text-slate-500">Login: {u.last_login_at ?? 'belum pernah'}</p></td>
                                    <td>
                                        <div className="flex justify-end gap-1">
                                            <IconBtn label="Ubah" onClick={() => open(u)}><Pencil className="h-4 w-4" /></IconBtn>
                                            <IconBtn label={u.is_active ? 'Nonaktifkan' : 'Aktifkan'} onClick={() => toggle(u)} className={u.is_active ? 'text-amber-700' : 'text-emerald-700'}><Power className="h-4 w-4" /></IconBtn>
                                            <IconBtn label={u.orders > 0 ? 'Tidak bisa dihapus: sudah ada pesanan' : 'Hapus'} onClick={() => remove(u)} disabled={u.orders > 0} className="text-red-600"><Trash2 className="h-4 w-4" /></IconBtn>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table></div>
                )}
                <Pagination meta={users} />
            </Card>

            <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
                <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
                    <form onSubmit={submit} className="space-y-4">
                        <div className="pr-10">
                            <DialogTitle className="font-jakarta text-xl font-extrabold">{isNew ? 'Tambah Pengguna' : 'Ubah Pengguna'}</DialogTitle>
                            <DialogDescription className="mt-1 text-sm text-slate-500">
                                {isNew ? 'Akun dibuat sudah terverifikasi. Pelanggan diminta melengkapi profil saat login pertama.' : `Kode pelanggan ${editing?.customer_code}`}
                            </DialogDescription>
                        </div>
                        <Input label="Nama lengkap" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} error={form.errors.name} required />
                        <Input label="Email (Gmail)" type="email" placeholder="nama@gmail.com" value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} error={form.errors.email} required />
                        <Input label="No. HP" value={form.data.phone} onChange={(e) => form.setData('phone', e.target.value)} error={form.errors.phone} />
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Input label={isNew ? 'Kata sandi' : 'Kata sandi baru (opsional)'} type="password" autoComplete="new-password" value={form.data.password} onChange={(e) => form.setData('password', e.target.value)} error={form.errors.password} required={isNew} />
                            <Input label="Ulangi kata sandi" type="password" autoComplete="new-password" value={form.data.password_confirmation} onChange={(e) => form.setData('password_confirmation', e.target.value)} />
                        </div>
                        <p className="-mt-2 text-xs text-slate-500">Minimal 8 karakter, berisi huruf dan angka.{!isNew && ' Kosongkan bila tidak ingin mengganti.'}</p>
                        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.data.is_active} onChange={(e) => form.setData('is_active', e.target.checked)} />Akun aktif (bisa login)</label>
                        <div className="flex justify-end gap-2 pt-2">
                            <button type="button" onClick={() => setEditing(null)} className="btn-outline">Batal</button>
                            <button disabled={form.processing} className="btn-primary">{form.processing ? 'Menyimpan…' : isNew ? 'Buat Akun' : 'Simpan'}</button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
}

function IconBtn({ label, onClick, disabled, className = '', children }) {
    return (
        <button type="button" onClick={onClick} disabled={disabled} title={label} aria-label={label}
            className={`grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35 ${className}`}>
            {children}
        </button>
    );
}
