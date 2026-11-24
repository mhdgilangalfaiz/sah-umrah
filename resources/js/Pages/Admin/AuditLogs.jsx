import { Link, router } from '@inertiajs/react';
import {
    Box, CalendarDays, ChevronLeft, ChevronRight, ClipboardList, Download, FileText, Filter, Image, KeyRound, Layers, ListChecks, LogIn, LogOut,
    Monitor, Pencil, Search, ShieldAlert, ShoppingBag, User, Wallet, Wifi,
} from 'lucide-react';
import { Fragment, useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import UserAvatar from '@/Components/portal/UserAvatar';
import { panel } from '@/Components/admin/activity/widgets';
import { Empty, cx } from '@/Components/ui';

const field = 'h-11 w-full rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:border-primary-500 focus:ring-primary-500/30';
const ROLE_TONE = { admin: 'bg-primary-100 text-primary-900', super_admin: 'bg-gold-100 text-amber-800', customer: 'bg-sky-100 text-sky-800', system: 'bg-violet-100 text-violet-800' };

/** Warna & ikon label aksi per kelompok. */
function actionStyle(action) {
    if (action === 'auth.login') return [LogIn, 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'];
    if (action === 'auth.logout') return [LogOut, 'bg-slate-100 text-slate-700 ring-slate-400/30'];
    if (action === 'auth.login_gagal') return [ShieldAlert, 'bg-red-50 text-red-700 ring-red-600/20'];
    const g = action.split('.')[0];
    if (g === 'konten') return [action.includes('galeri') ? Image : Pencil, 'bg-violet-50 text-violet-700 ring-violet-600/20'];
    if (g === 'pembayaran' || g === 'keuangan' || g === 'refund') return [Wallet, 'bg-amber-50 text-amber-800 ring-amber-600/20'];
    if (g === 'pesanan' || g === 'paket' || g === 'tiket' || g === 'visa') return [ShoppingBag, 'bg-sky-50 text-sky-700 ring-sky-600/20'];
    return [Layers, 'bg-slate-100 text-slate-700 ring-slate-300'];
}

/** Audit Log: siapa melakukan apa dan kapan. Super Admin melihat semua; Admin tanpa aktivitas Super Admin. */
export default function AuditLogs({ logs, filters, groups, roles, isSuper }) {
    const [f, setF] = useState(filters);
    const [open, setOpen] = useState(null);
    const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
    const visit = (params) => router.get(route('admin.audit.index'), Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null)), { preserveState: true, preserveScroll: true, replace: true });
    const exportUrl = route('admin.audit.export', Object.fromEntries(Object.entries(filters).filter(([k, v]) => v && k !== 'per')));
    const th = (Icon, label) => <th className="px-3 py-3 text-left"><span className="flex items-center gap-1.5"><Icon className="h-4 w-4" />{label}</span></th>;

    return (
        <AdminLayout title="Audit Log" icon={ClipboardList}>
            <div className="mb-5 flex items-center gap-4">
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-primary-100 bg-white text-primary-700 shadow-sm"><ClipboardList className="h-7 w-7" /></span>
                <div className="min-w-0">
                    <h1 className="font-serif text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Audit Log</h1>
                    <p className="text-sm text-slate-500">Catatan permanen: siapa melakukan apa dan kapan. Data sensitif disamarkan otomatis.{!isSuper && ' Aktivitas Super Admin tidak ditampilkan.'}</p>
                </div>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); visit({ ...f, page: undefined }); }} className={cx(panel, 'mb-5 grid items-end gap-3 p-4 md:grid-cols-3 2xl:grid-cols-[1.6fr_1fr_1fr_1fr_1fr_auto]')}>
                <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-600">Pencarian</span>
                    <span className="relative block"><Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input className={cx(field, 'pl-10')} placeholder="Cari deskripsi / pengguna / IP…" value={f.q ?? ''} onChange={(e) => set('q', e.target.value)} /></span>
                </label>
                <Select label="Aksi" icon={Layers} value={f.action} onChange={(v) => set('action', v)} options={{ '': 'Semua aksi', ...groups }} />
                <Select label="Pelaku" icon={User} value={f.role} onChange={(v) => set('role', v)} options={{ '': 'Semua pelaku', ...roles }} />
                <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-600">Dari</span><input type="date" className={field} value={f.dari ?? ''} onChange={(e) => set('dari', e.target.value)} /></label>
                <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-600">Sampai</span><input type="date" className={field} value={f.sampai ?? ''} onChange={(e) => set('sampai', e.target.value)} /></label>
                <button className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-700 to-primary-900 px-5 text-sm font-bold text-white shadow-md shadow-primary-700/25"><Filter className="h-4 w-4" />Terapkan</button>
            </form>

            <section className={cx(panel, 'overflow-hidden')}>
                <div className="flex items-center justify-between gap-3 px-5 py-4">
                    <h2 className="flex items-center gap-2.5 font-jakarta text-lg font-extrabold"><ListChecks className="h-5 w-5 text-primary-700" />Daftar Audit Log</h2>
                    <a href={exportUrl} className="inline-flex items-center gap-2 rounded-xl border-2 border-primary-700 bg-white px-4 py-1.5 text-sm font-bold text-primary-700 hover:bg-primary-50"><Download className="h-4 w-4" />Ekspor</a>
                </div>

                {logs.data.length === 0 ? <Empty title="Tidak ada log" /> : (
                    <div className="overflow-x-auto px-3">
                        <table className="w-full min-w-[920px] text-sm">
                            <thead><tr className="bg-primary-50 text-xs font-bold text-primary-900 [&>th:first-child]:rounded-l-xl [&>th:last-child]:rounded-r-xl">
                                {th(CalendarDays, 'Waktu')}{th(User, 'Pelaku')}{th(Layers, 'Aksi')}{th(FileText, 'Deskripsi')}{th(Box, 'Objek')}{th(Wifi, 'IP')}
                            </tr></thead>
                            <tbody className="divide-y divide-primary-900/5">
                                {logs.data.map((l) => {
                                    const [Icon, cls] = actionStyle(l.action);
                                    const hasDetail = !!(l.old_values || l.new_values);
                                    return (
                                        <Fragment key={l.id}>
                                            <tr onClick={() => hasDetail && setOpen(open === l.id ? null : l.id)} className={cx(hasDetail && 'cursor-pointer hover:bg-primary-50/50', open === l.id && 'bg-primary-50/60')}>
                                                <td className="px-3 py-3"><span className="flex items-center gap-2.5 whitespace-nowrap font-semibold text-slate-900"><CalendarDays className="h-5 w-5 shrink-0 text-primary-700" />{l.created_at}</span></td>
                                                <td className="px-3 py-3"><span className="flex items-center gap-3">
                                                    <UserAvatar name={l.user_name ?? 'Sistem'} className="h-9 w-9 text-xs" />
                                                    <span><span className="flex items-center gap-1 font-semibold text-slate-900">{l.role === 'super_admin' && <KeyRound className="h-3.5 w-3.5 text-gold-500" />}{l.user_name ?? 'Sistem'}</span>
                                                        <span className={cx('mt-0.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold', ROLE_TONE[l.role] ?? 'bg-slate-100 text-slate-600')}>{roles[l.role] ?? l.role}</span></span>
                                                </span></td>
                                                <td className="px-3 py-3"><span className={cx('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ring-1', cls)} title={l.action}><Icon className="h-3.5 w-3.5" />{l.action_label}</span></td>
                                                <td className="max-w-sm px-3 py-3 text-slate-700">{l.description}{hasDetail && <span className="ml-1.5 text-xs font-semibold text-primary-700">[lihat perubahan]</span>}</td>
                                                <td className="px-3 py-3 text-xs text-slate-600">{l.subject ? <span className="flex items-center gap-1.5"><Box className="h-4 w-4 text-slate-400" />{l.subject}</span> : '–'}</td>
                                                <td className="px-3 py-3"><span className="flex items-center gap-1.5 font-mono text-xs text-slate-700"><Monitor className="h-4 w-4 text-slate-400" />{l.ip ?? '-'}</span></td>
                                            </tr>
                                            {open === l.id && (
                                                <tr><td colSpan={6} className="bg-primary-50/40 px-4 py-3">
                                                    <div className="grid gap-3 text-xs md:grid-cols-2">
                                                        <div><p className="mb-1 font-bold text-red-700">Sebelum</p><pre className="whitespace-pre-wrap rounded-xl bg-white p-3">{JSON.stringify(l.old_values, null, 2)}</pre></div>
                                                        <div><p className="mb-1 font-bold text-emerald-700">Sesudah</p><pre className="whitespace-pre-wrap rounded-xl bg-white p-3">{JSON.stringify(l.new_values, null, 2)}</pre></div>
                                                    </div>
                                                    {l.device && <p className="mt-2 text-xs text-slate-500">Perangkat: {l.device}</p>}
                                                </td></tr>
                                            )}
                                        </Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-sm text-slate-600">
                    <span>Menampilkan {logs.from ?? 0}–{logs.to ?? 0} dari {logs.total} data</span>
                    <span className="flex items-center gap-3">
                        <label className="flex items-center gap-2">Per Halaman:
                            <select value={filters.per} onChange={(e) => visit({ ...filters, per: e.target.value, page: undefined })} className="rounded-xl border-slate-200 py-1.5 pl-3 pr-8 text-sm">
                                {[10, 25, 50].map((n) => <option key={n} value={n}>{n}</option>)}
                            </select>
                        </label>
                        <span className="flex items-center gap-1">
                            <PageBtn url={logs.prev_page_url} label="Sebelumnya"><ChevronLeft className="h-4 w-4" /></PageBtn>
                            <span className="grid h-9 min-w-9 place-items-center rounded-xl bg-gradient-to-r from-primary-700 to-primary-900 px-2 font-bold text-white">{logs.current_page}</span>
                            <span className="px-1 text-xs text-slate-400">/ {logs.last_page}</span>
                            <PageBtn url={logs.next_page_url} label="Berikutnya"><ChevronRight className="h-4 w-4" /></PageBtn>
                        </span>
                    </span>
                </div>
            </section>
        </AdminLayout>
    );
}

function Select({ label, icon: Icon, value, onChange, options }) {
    return (
        <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-600">{label}</span>
            <span className="relative block"><Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <select className={cx(field, 'pl-10')} value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
                    {Object.entries(options).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select></span>
        </label>
    );
}

function PageBtn({ url, label, children }) {
    const cls = 'grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white';
    return url ? <Link href={url} preserveScroll aria-label={label} className={cx(cls, 'hover:bg-primary-50')}>{children}</Link> : <span aria-disabled="true" className={cx(cls, 'opacity-40')}>{children}</span>;
}
