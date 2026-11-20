import { useForm, usePage } from '@inertiajs/react';
import CustomerLayout from '@/Layouts/CustomerLayout';
import AdminLayout from '@/Layouts/AdminLayout';
import ProfileFields from '@/Components/ProfileFields';
import { Card, Input, PageHeader } from '@/Components/ui';

export default function Edit({ profile, hasPassword }) {
    const { auth } = usePage().props;
    const isAdmin = auth.user.is_admin;
    const Layout = isAdmin ? AdminLayout : CustomerLayout;

    const info = useForm({ ...profile, nik: profile.nik ?? '' });
    const pwd = useForm({ current_password: '', password: '', password_confirmation: '' });
    const del = useForm({ password: '' });

    return (
        <Layout title="Profil Saya">
            <PageHeader title="Profil Saya" subtitle={`Kode pelanggan ${auth.user.customer_code ?? '-'} · ${auth.user.role_label}`} />
            <div className="space-y-6">
                <Card title="Data Pribadi">
                    <form onSubmit={(e) => { e.preventDefault(); info.patch(route('profile.update'), { preserveScroll: true }); }} className="space-y-4">
                        {isAdmin ? (
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Input label="Nama" value={info.data.name} onChange={(e) => info.setData('name', e.target.value)} error={info.errors.name} />
                                <Input label="No. HP" value={info.data.phone ?? ''} onChange={(e) => info.setData('phone', e.target.value)} error={info.errors.phone} />
                            </div>
                        ) : (
                            <>
                                <Input label="Email (Gmail)" type="email" value={info.data.email} onChange={(e) => info.setData('email', e.target.value)} error={info.errors.email} hint="Mengubah email memerlukan verifikasi ulang" />
                                <ProfileFields data={info.data} setData={info.setData} errors={info.errors} />
                            </>
                        )}
                        <button disabled={info.processing} className="btn-primary">Simpan Perubahan</button>
                    </form>
                </Card>

                {hasPassword && (
                    <Card title="Ubah Kata Sandi">
                        <form onSubmit={(e) => { e.preventDefault(); pwd.put(route('password.update'), { preserveScroll: true, onSuccess: () => pwd.reset() }); }} className="grid gap-4 sm:grid-cols-3">
                            <Input label="Kata sandi saat ini" type="password" value={pwd.data.current_password} onChange={(e) => pwd.setData('current_password', e.target.value)} error={pwd.errors.current_password} />
                            <Input label="Kata sandi baru" type="password" value={pwd.data.password} onChange={(e) => pwd.setData('password', e.target.value)} error={pwd.errors.password} />
                            <Input label="Ulangi kata sandi baru" type="password" value={pwd.data.password_confirmation} onChange={(e) => pwd.setData('password_confirmation', e.target.value)} error={pwd.errors.password_confirmation} />
                            <div className="sm:col-span-3"><button disabled={pwd.processing} className="btn-primary">Perbarui Kata Sandi</button>{pwd.recentlySuccessful && <span className="ml-3 text-sm text-emerald-700">Tersimpan.</span>}</div>
                        </form>
                    </Card>
                )}

                {!isAdmin && hasPassword && (
                    <Card title="Hapus Akun">
                        <p className="text-sm text-slate-600">Akun yang sudah memiliki riwayat transaksi tidak dapat dihapus demi pencatatan keuangan. Untuk permintaan penghapusan data sesuai UU PDP, hubungi kami melalui Pusat Bantuan.</p>
                        <form onSubmit={(e) => { e.preventDefault(); if (confirm('Hapus akun secara permanen?')) del.delete(route('profile.destroy'), { preserveScroll: true }); }} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                            <Input className="sm:w-72" label="Konfirmasi kata sandi" type="password" value={del.data.password} onChange={(e) => del.setData('password', e.target.value)} error={del.errors.password} />
                            <button disabled={del.processing} className="btn-danger">Hapus Akun</button>
                        </form>
                    </Card>
                )}
            </div>
        </Layout>
    );
}
