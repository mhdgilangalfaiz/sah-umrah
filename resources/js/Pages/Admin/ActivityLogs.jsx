import { Link, router } from '@inertiajs/react';
import { ArrowRight, Crown, FileClock, Filter, History, Layers, Monitor, PieChart, Search, User } from 'lucide-react';
import { useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import UserAvatar from '@/Components/portal/UserAvatar';
import { Badge, cx } from '@/Components/ui';
import LogTable from '@/Components/admin/activity/LogTable';
import { ActivityDonut, LogStatCard, panel } from '@/Components/admin/activity/widgets';

const field = 'h-11 w-full rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:border-primary-500 focus:ring-primary-500/30';

/** Log masuk/keluar akun Admin & Super Admin — khusus Super Admin. */
export default function ActivityLogs({ logs, summary, stats, accounts, filters }) {
    const [f, setF] = useState(filters);
    // tanggal hari ini (WIB) untuk filter kartu
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
    const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
    const apply = (e) => {
        e?.preventDefault();
        router.get(route('admin.activity.index'), Object.fromEntries(Object.entries({ ...f, page: undefined }).filter(([, v]) => v !== '' && v != null)), { preserveState: true, replace: true });
    };

    return (
        <AdminLayout title="Log Aktivitas" icon={History}>
            {/* Judul + ilustrasi Masjid Nabawi */}
            <div className="relative mb-5 flex items-center gap-4 overflow-hidden">
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-primary-100 bg-white text-primary-700 shadow-sm"><FileClock className="h-7 w-7" /></span>
                <div className="relative z-10 min-w-0">
                    <h1 className="font-serif text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Log Aktivitas Admin</h1>
                    <p className="text-sm text-slate-500">Riwayat login, logout, dan percobaan login akun Admin & Super Admin. Waktu dalam WIB.</p>
                </div>
            </div>

            <div className="mb-5 grid gap-4 md:grid-cols-3">
                {/* klik kartu → tabel tersaring ke aktivitas hari ini */}
                <LogStatCard label="Total Login Hari Ini" metric={summary.login} image="/images/admin/kartu/log-login.webp" color="#2E8B57"
                    href={route('admin.activity.index', { aksi: 'auth.login', dari: today, sampai: today })} />
                <LogStatCard label="Admin Aktif Hari Ini" metric={summary.admins} image="/images/admin/kartu/log-admin.webp" color="#2E8B57"
                    href={route('admin.activity.index', { aksi: 'auth.login', dari: today, sampai: today })} />
                <LogStatCard label="Login Gagal Hari Ini" metric={summary.failed} image="/images/admin/kartu/log-gagal.webp" color="#7C3AED" invert
                    href={route('admin.activity.index', { aksi: 'auth.login_gagal', dari: today, sampai: today })} />
            </div>

            <form onSubmit={apply} className={cx(panel, 'mb-5 grid items-end gap-3 p-4 md:grid-cols-3 2xl:grid-cols-[1.6fr_1fr_1fr_1fr_1fr_auto]')}>
                <label className="relative block">
                    <span className="sr-only">Cari</span>
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input className={cx(field, 'pl-10')} placeholder="Cari nama admin, email, atau IP…" value={f.q ?? ''} onChange={(e) => set('q', e.target.value)} />
                </label>
                <IconSelect icon={Layers} value={f.aksi} onChange={(v) => set('aksi', v)} options={{ '': 'Semua Aktivitas', 'auth.login': 'Login', 'auth.logout': 'Logout', 'auth.login_gagal': 'Login Gagal' }} />
                <IconSelect icon={User} value={f.peran} onChange={(v) => set('peran', v)} options={{ '': 'Semua Peran', admin: 'Admin', super_admin: 'Super Admin' }} />
                <label className="block"><span className="mb-1 block text-xs text-slate-500">Dari</span><input type="date" className={field} value={f.dari ?? ''} onChange={(e) => set('dari', e.target.value)} /></label>
                <label className="block"><span className="mb-1 block text-xs text-slate-500">Sampai</span><input type="date" className={field} value={f.sampai ?? ''} onChange={(e) => set('sampai', e.target.value)} /></label>
                <button className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-700 to-primary-900 px-5 text-sm font-bold text-white shadow-md shadow-primary-700/25"><Filter className="h-4 w-4" />Terapkan</button>
            </form>

            <LogTable logs={logs} filters={filters} />

            <div className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
                <section className={cx(panel, 'p-5')}>
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <h2 className="flex items-center gap-2.5 font-jakarta text-lg font-extrabold"><History className="h-5 w-5 text-primary-700" />Login terakhir tiap akun</h2>
                        <Link href={route('admin.admins.index')} className="flex items-center gap-1 text-sm font-bold text-primary-700 hover:underline">Lihat Semua Akun <ArrowRight className="h-4 w-4" /></Link>
                    </div>
                    <ul className="divide-y divide-primary-900/5 rounded-2xl border border-primary-100 bg-white">
                        {accounts.map((a) => (
                            <li key={a.id} className="flex items-center gap-3 px-4 py-3">
                                <UserAvatar name={a.name} className="h-11 w-11 text-sm" />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate font-bold text-slate-900">{a.name}</p>
                                    <p className="truncate text-xs text-slate-500">{a.last_login ? <>{a.last_login}{a.last_ip && <span className="font-mono"> · {a.last_ip}</span>}</> : 'Belum pernah login'}</p>
                                </div>
                                {a.role === 'super_admin'
                                    ? <span className="inline-flex items-center gap-1 rounded-full bg-gold-100 px-3 py-1 text-xs font-bold text-amber-800"><Crown className="h-3.5 w-3.5" />Super Admin</span>
                                    : <span className="rounded-full bg-primary-100 px-3 py-1 text-xs font-bold text-primary-900">Admin</span>}
                                {!a.is_active && <Badge className="bg-red-50 text-red-700 ring-red-600/20">Nonaktif</Badge>}
                                <Monitor className="hidden h-5 w-5 text-slate-400 sm:block" aria-hidden="true" />
                            </li>
                        ))}
                    </ul>
                </section>

                <section className={cx(panel, 'p-5')}>
                    <h2 className="mb-4 flex items-center gap-2.5 font-jakarta text-lg font-extrabold"><PieChart className="h-5 w-5 text-primary-700" />Statistik Aktivitas <span className="text-sm font-semibold text-slate-500">(7 Hari Terakhir)</span></h2>
                    <ActivityDonut stats={stats} />
                </section>
            </div>
        </AdminLayout>
    );
}

function IconSelect({ icon: Icon, value, onChange, options }) {
    return (
        <label className="relative block">
            <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <select className={cx(field, 'pl-10')} value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
                {Object.entries(options).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
        </label>
    );
}
