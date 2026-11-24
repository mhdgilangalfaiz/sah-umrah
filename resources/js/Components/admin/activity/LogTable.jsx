import { Link, router } from '@inertiajs/react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Download, History, KeyRound, Layers, LogIn, LogOut, Monitor, MoreHorizontal, ShieldAlert, User } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import UserAvatar from '@/Components/portal/UserAvatar';
import { Empty, cx } from '@/Components/ui';
import { BrowserIcon, panel } from './widgets';

const ACTION = {
    'auth.login': [LogIn, 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'],
    'auth.logout': [LogOut, 'bg-slate-100 text-slate-700 ring-slate-400/30'],
    'auth.login_gagal': [ShieldAlert, 'bg-red-50 text-red-700 ring-red-600/20'],
};

/** Daftar log: tabel ber-ikon, detail (⋯), info jumlah data, pilihan per halaman, paginasi, ekspor CSV. */
export default function LogTable({ logs, filters }) {
    const go = (params) => router.get(route('admin.activity.index'), { ...filters, ...params }, { preserveState: true, preserveScroll: true, replace: true });
    const exportUrl = route('admin.activity.export', Object.fromEntries(Object.entries(filters).filter(([k, v]) => v && k !== 'per')));
    const th = (Icon, label) => <th className="px-3 py-3 text-left"><span className="flex items-center gap-1.5"><Icon className="h-4 w-4" />{label}</span></th>;

    return (
        <section className={cx(panel, 'overflow-hidden')}>
            <div className="flex items-center justify-between gap-3 px-5 py-4">
                <h2 className="flex items-center gap-2.5 font-jakarta text-lg font-extrabold"><Monitor className="h-5 w-5 text-primary-700" />Daftar Log Aktivitas</h2>
                <a href={exportUrl} className="inline-flex items-center gap-2 rounded-xl border-2 border-primary-700 bg-white px-4 py-1.5 text-sm font-bold text-primary-700 hover:bg-primary-50"><Download className="h-4 w-4" />Ekspor</a>
            </div>

            {logs.data.length === 0 ? <Empty icon={History} title="Belum ada aktivitas" text="Aktivitas tercatat setiap kali Admin atau Super Admin login, logout, atau gagal login." /> : (
                <div className="overflow-x-auto px-3">
                    <table className="w-full min-w-[820px] text-sm">
                        <thead><tr className="bg-primary-50 text-xs font-bold text-primary-900 [&>th:first-child]:rounded-l-xl [&>th:last-child]:rounded-r-xl">
                            {th(Clock, 'Waktu (WIB)')}{th(User, 'Akun')}{th(Layers, 'Aktivitas')}{th(Monitor, 'IP')}{th(Monitor, 'Perangkat')}<th className="w-10" />
                        </tr></thead>
                        <tbody className="divide-y divide-primary-900/5">
                            {logs.data.map((l) => {
                                const [Icon, cls] = ACTION[l.action] ?? [History, 'bg-slate-100 text-slate-600 ring-slate-300'];
                                return (
                                    <tr key={l.id} className={l.action === 'auth.login_gagal' ? 'bg-red-50/40' : undefined}>
                                        <td className="px-3 py-3"><span className="flex items-center gap-3"><CalendarDays className="h-5 w-5 shrink-0 text-primary-700" /><span><span className="block font-semibold text-slate-900">{l.at}</span><span className="text-xs text-slate-500">{l.ago}</span></span></span></td>
                                        <td className="px-3 py-3"><span className="flex items-center gap-3"><UserAvatar name={l.name} className="h-9 w-9 text-xs" />
                                            <span className="min-w-0"><span className="flex items-center gap-1 font-semibold text-slate-900">{l.role === 'super_admin' && <KeyRound className="h-3.5 w-3.5 text-gold-500" />}{l.name}</span><span className="block truncate text-xs text-slate-500">{l.email}</span></span></span></td>
                                        <td className="px-3 py-3"><span className={cx('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ring-1', cls)}><Icon className="h-3.5 w-3.5" />{l.action_label}</span></td>
                                        <td className="px-3 py-3 font-mono text-xs text-slate-700">{l.ip ?? '-'}</td>
                                        <td className="px-3 py-3"><span className="flex items-center gap-2 text-slate-700">{l.browser && <BrowserIcon name={l.browser} />}{l.device ?? '-'}</span></td>
                                        <td className="px-1 py-3"><RowMenu log={l} /></td>
                                    </tr>
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
                        <select value={filters.per} onChange={(e) => go({ per: e.target.value, page: 1 })} className="rounded-xl border-slate-200 py-1.5 pl-3 pr-8 text-sm">
                            {[10, 25, 50].map((n) => <option key={n} value={n}>{n}</option>)}
                        </select>
                    </label>
                    <span className="flex items-center gap-1">
                        <PageBtn url={logs.prev_page_url} label="Sebelumnya"><ChevronLeft className="h-4 w-4" /></PageBtn>
                        {pageList(logs.current_page, logs.last_page).map((p, i) => p === '…'
                            ? <span key={`e${i}`} className="px-1 text-slate-400">…</span>
                            : <button key={p} type="button" onClick={() => go({ page: p })} aria-current={p === logs.current_page ? 'page' : undefined}
                                className={cx('grid h-9 min-w-9 place-items-center rounded-xl px-2 font-bold', p === logs.current_page ? 'bg-gradient-to-r from-primary-700 to-primary-900 text-white' : 'border border-slate-200 bg-white hover:bg-primary-50')}>{p}</button>)}
                        <PageBtn url={logs.next_page_url} label="Berikutnya"><ChevronRight className="h-4 w-4" /></PageBtn>
                    </span>
                </span>
            </div>
        </section>
    );
}

function pageList(cur, last) {
    const set = [...new Set([1, cur - 1, cur, cur + 1, last].filter((p) => p >= 1 && p <= last))].sort((a, b) => a - b);
    return set.flatMap((p, i) => (i && p - set[i - 1] > 1 ? ['…', p] : [p]));
}

function PageBtn({ url, label, children }) {
    const cls = 'grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white';
    return url ? <Link href={url} preserveScroll aria-label={label} className={cx(cls, 'hover:bg-primary-50')}>{children}</Link> : <span aria-disabled="true" className={cx(cls, 'opacity-40')}>{children}</span>;
}

/** Tombol ⋯: rincian lengkap satu log. */
function RowMenu({ log }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    useEffect(() => {
        if (!open) return undefined;
        const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, [open]);

    return (
        <div ref={ref} className="relative">
            <button type="button" onClick={() => setOpen((o) => !o)} aria-label="Rincian" aria-expanded={open} className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"><MoreHorizontal className="h-5 w-5" /></button>
            {open && (
                <div className="absolute right-0 top-full z-30 mt-1 w-72 rounded-2xl border border-primary-100 bg-white p-4 text-xs shadow-xl">
                    <p className="font-bold text-slate-900">{log.description}</p>
                    <dl className="mt-2 space-y-1.5 text-slate-600">
                        <div><dt className="font-semibold text-slate-800">Waktu</dt><dd>{log.at} WIB</dd></div>
                        <div><dt className="font-semibold text-slate-800">Alamat IP</dt><dd className="font-mono">{log.ip ?? '-'}</dd></div>
                        <div><dt className="font-semibold text-slate-800">Browser lengkap</dt><dd className="break-all">{log.user_agent ?? '-'}</dd></div>
                    </dl>
                </div>
            )}
        </div>
    );
}
