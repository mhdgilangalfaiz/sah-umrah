import { Link, usePage } from '@inertiajs/react';
import {
    BarChart3, BookOpen, BookUser, Bot, CalendarClock, ChevronsLeft, ClipboardList, CreditCard, FileCheck2, FileText, Globe, Headset, HelpCircle, Image, LayoutDashboard,
    LayoutTemplate, LogOut, Megaphone, MessageSquareQuote, Package, Plane, Receipt, RotateCcw, ScrollText, Settings, ShieldAlert, Stamp, Ticket, UserCog, Users,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useMemo } from 'react';
import { cn } from '@/Components/landing/lib';

// [label, routeName, params, Icon, roles(null = semua admin), badgeKey, activePattern]
// Peran: 'admin' = kelola seluruh website; 'super_admin' = lihat pembelian, laporan & invoice, buat akun admin.
const A = ['admin'];
const VIEW = ['admin', 'super_admin'];
const SA = ['super_admin'];
export const GROUPS = [
    ['Utama', [['Dashboard', 'admin.dashboard', null, LayoutDashboard, null]]],
    ['Pembelian', [
        ['Pesanan Umrah', 'admin.bookings.index', null, ClipboardList, VIEW, null, 'admin.bookings.*'],
        ['Pesanan Tiket', 'admin.flight-orders.index', null, Ticket, VIEW, null, 'admin.flight-orders.*'],
        ['Pengajuan Visa', 'admin.visa.index', null, Stamp, VIEW, 'visa', 'admin.visa.*'],
        ['Pembayaran', 'admin.payments.index', null, CreditCard, VIEW, null, 'admin.payments.*'],
    ]],
    ['Laporan', [
        ['Rekap Penjualan', 'admin.reports.index', null, BarChart3, VIEW],
        ['Laporan Invoice', 'admin.invoices.index', null, Receipt, VIEW],
    ]],
    ['Jamaah & Pengguna', [
        ['Kelola Pengguna', 'admin.users.index', null, Users, A],
        ['Data Jamaah', 'admin.jamaah.index', null, BookUser, A, null, 'admin.jamaah.*'],
    ]],
    ['Produk & Layanan', [
        ['Paket Umrah', 'admin.packages.index', null, Package, A, null, 'admin.packages.*'],
        ['Keberangkatan', 'admin.departures.index', null, CalendarClock, A],
        ['Jadwal Penerbangan', 'admin.flights.index', null, Plane, A, null, 'admin.flights.*'],
        ['Layanan Visa', 'admin.crud.index', 'visa', Globe, A],
        ['Verifikasi Dokumen', 'admin.documents.index', null, FileCheck2, A, 'documents'],
    ]],
    ['Keuangan', [
        ['Refund', 'admin.refunds.index', null, RotateCcw, A, 'refunds'],
        ['Keamanan Keuangan', 'admin.finance.bank.index', null, ShieldAlert, A],
    ]],
    ['Layanan Pelanggan', [
        ['Pusat Bantuan', 'admin.support.index', null, Headset, A, 'support', 'admin.support.*'],
        ['Jawaban Chatbot', 'admin.crud.index', 'chatbot', Bot, A],
        ['FAQ', 'admin.crud.index', 'faq', HelpCircle, A],
    ]],
    ['Konten Website', [
        ['Konten Beranda', 'admin.landing.edit', null, LayoutTemplate, A],
        ['Galeri', 'admin.galeri.index', null, Image, A],
        ['Testimoni', 'admin.crud.index', 'testimoni', MessageSquareQuote, A],
        ['Blog', 'admin.crud.index', 'blog', BookOpen, A],
        ['Halaman', 'admin.pages.index', null, FileText, A],
        ['Kirim Promo', 'admin.promotions.index', null, Megaphone, A],
    ]],
    ['Sistem', [
        ['Audit Log', 'admin.audit.index', null, ScrollText, A],
        ['Pengaturan', 'admin.settings.index', null, Settings, A],
        ['Akun Admin', 'admin.admins.index', null, UserCog, SA],
    ]],
];

/** Pathname dari URL route Ziggy: "http://x.test/admin/pesanan-tiket" → "/admin/pesanan-tiket" */
const pathOf = (url) => { try { return new URL(url, window.location.origin).pathname.replace(/\/+$/, '') || '/'; } catch { return url; } };

/** Isi sidebar admin: logo + tombol lipat, menu berkelompok dengan pill aktif, badge tugas & notifikasi. */
export default function AdminSidebar({ collapsed = false, pillId, onToggle, onNavigate }) {
    const { auth, adminBadges, unreadByPath } = usePage().props;
    const role = auth.user.role;

    // Notifikasi belum dibaca → menu tujuan (awalan path terpanjang yang cocok)
    const unreadByMenu = useMemo(() => {
        const menus = GROUPS.flatMap(([, items]) => items).map(([label, name, param]) => {
            try { return [label, pathOf(param ? route(name, param) : route(name))]; } catch { return null; }
        }).filter(Boolean);
        const out = {};
        Object.entries(unreadByPath ?? {}).forEach(([path, n]) => {
            const best = menus.filter(([, m]) => path === m || path.startsWith(`${m}/`)).sort((a, b) => b[1].length - a[1].length)[0];
            if (best) out[best[0]] = (out[best[0]] ?? 0) + n;
        });
        return out;
    }, [unreadByPath]);

    // menu aktif selalu terlihat tanpa perlu menggulir
    useEffect(() => {
        document.querySelectorAll('[data-admin-nav]').forEach((nav) => {
            const active = nav.querySelector('[data-active="true"]');
            if (active) nav.scrollTop = active.offsetTop - nav.clientHeight / 2 + active.offsetHeight / 2;
        });
    }, []);

    const isActive = (name, param, pattern) => (param
        ? route().current(name, { resource: param }) || route().current(name, param)
        : route().current(name) || (pattern && route().current(pattern)));

    return (
        <div className="flex h-full flex-col">
            <div className={cn('flex border-b border-primary-900/10 pb-3', collapsed ? 'flex-col items-center gap-2' : 'items-center justify-between pl-1')}>
                <Link href={route('admin.dashboard')} aria-label="Dashboard admin" className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
                    {collapsed ? <img src="/images/logo-sah-mark.png" alt="SAH" className="h-10 w-10" /> : <img src="/images/logo-sah.png" alt="SAH - PT. Sumatera Andalan Haramain" className="h-11 w-auto" />}
                </Link>
                {onToggle && (
                    <button type="button" onClick={onToggle} aria-label={collapsed ? 'Lebarkan sidebar' : 'Lipat sidebar'} title={collapsed ? 'Lebarkan sidebar' : 'Lipat sidebar'}
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-primary-100 bg-white text-primary-700 shadow-sm transition hover:bg-primary-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
                        <ChevronsLeft className={cn('h-4 w-4 transition-transform duration-300', collapsed && 'rotate-180')} />
                    </button>
                )}
            </div>

            <nav data-admin-nav aria-label="Menu admin" className="-mx-1 mt-2 flex-1 space-y-3 overflow-y-auto px-1 pb-2 scrollbar-none">
                {GROUPS.map(([group, items]) => {
                    const visible = items.filter((i) => !i[4] || i[4].includes(role));
                    if (!visible.length) return null;
                    return (
                        <div key={group}>
                            {collapsed
                                ? <span className="mx-auto mb-1 block h-px w-6 bg-primary-900/15" aria-hidden="true" />
                                : <p className="flex items-center gap-2 px-2 pb-1 text-[11px] font-extrabold uppercase tracking-wider text-primary-700">{group}<span className="h-px flex-1 bg-primary-900/10" /></p>}
                            <ul className="space-y-0.5">
                                {visible.map(([label, name, param, Icon, , badge, pattern]) => {
                                    const active = isActive(name, param, pattern);
                                    const count = badge ? adminBadges?.[badge] ?? 0 : 0;
                                    const unread = unreadByMenu[label] ?? 0;
                                    return (
                                        <li key={label} className="relative">
                                            {active && <motion.span layoutId={pillId} className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary-700 to-primary-900 shadow-md shadow-primary-700/30" transition={{ type: 'spring', stiffness: 400, damping: 34 }} />}
                                            <Link href={param ? route(name, param) : route(name)} onClick={onNavigate} data-active={active ? 'true' : undefined} title={collapsed ? label : undefined}
                                                className={cn('relative flex h-9 items-center gap-3 rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
                                                    collapsed ? 'justify-center' : 'px-3', active ? 'text-white' : 'text-neutral-900 hover:bg-white/70 hover:text-primary-700')}>
                                                <span className="relative">
                                                    <Icon className={cn('h-[18px] w-[18px]', active ? 'text-white' : 'text-primary-700')} aria-hidden="true" />
                                                    {collapsed && (unread > 0 || count > 0) && <span className={cn('absolute -right-1.5 -top-1 h-2.5 w-2.5 rounded-full ring-2 ring-white', unread > 0 ? 'bg-red-500' : 'bg-gold-500')} />}
                                                </span>
                                                {!collapsed && <span className="flex-1 truncate">{label}</span>}
                                                {!collapsed && (unread > 0
                                                    ? <span className="grid h-5 min-w-[20px] place-items-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white" title={`${unread} notifikasi baru`}>{unread > 99 ? '99+' : unread}</span>
                                                    : count > 0 && <span className="rounded-full bg-gold-500 px-1.5 text-[10px] font-bold text-neutral-900" title="Menunggu tindakan">{count}</span>)}
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    );
                })}
            </nav>

            <Link href={route('logout')} method="post" as="button" title={collapsed ? 'Keluar' : undefined}
                className={cn('mt-2 flex h-10 w-full items-center gap-3 rounded-xl border-t border-primary-900/10 pt-2 text-sm font-bold text-red-600 transition hover:text-red-700', collapsed ? 'justify-center' : 'px-3')}>
                <LogOut className="h-[18px] w-[18px]" aria-hidden="true" />{!collapsed && 'Keluar'}
            </Link>
        </div>
    );
}
