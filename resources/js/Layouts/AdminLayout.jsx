import { Head, Link, usePage } from '@inertiajs/react';
import {
    BarChart3, BookOpen, Bot, CalendarClock, ClipboardList, CreditCard, FileCheck2, FileText, Globe, Headset, Image, KeyRound, LayoutDashboard,
    LogOut, Megaphone, Menu, MessageSquareQuote, Package, Plane, RotateCcw, ScrollText, Settings, ShieldAlert, Stamp, Ticket, UserCog, Users, X, HelpCircle, Scale,
} from 'lucide-react';
import { useState } from 'react';
import NotificationBell from '@/Components/NotificationBell';
import { Flash, cx } from '@/Components/ui';

// [label, routeName, params, Icon, roles(null = semua admin), badgeKey, activePattern]
const GROUPS = [
    ['Utama', [
        ['Dashboard', 'admin.dashboard', null, LayoutDashboard, null],
    ]],
    ['Operasional', [
        ['Paket Umrah', 'admin.packages.index', null, Package, ['operasional'], null, 'admin.packages.*'],
        ['Keberangkatan', 'admin.departures.index', null, CalendarClock, ['operasional']],
        ['Pesanan Umrah', 'admin.bookings.index', null, ClipboardList, ['operasional', 'finance', 'cs'], null, 'admin.bookings.*'],
        ['Jadwal Penerbangan', 'admin.flights.index', null, Plane, ['operasional'], null, 'admin.flights.*'],
        ['Pesanan Tiket', 'admin.flight-orders.index', null, Ticket, ['operasional', 'finance', 'cs'], null, 'admin.flight-orders.*'],
        ['Pengajuan Visa', 'admin.visa.index', null, Stamp, ['operasional', 'finance', 'cs'], 'visa', 'admin.visa.*'],
        ['Layanan Visa', 'admin.crud.index', 'visa', Globe, ['operasional']],
        ['Verifikasi Dokumen', 'admin.documents.index', null, FileCheck2, ['operasional'], 'documents'],
    ]],
    ['Keuangan', [
        ['Pembayaran', 'admin.payments.index', null, CreditCard, ['finance']],
        ['Rekonsiliasi', 'admin.payments.reconcile', null, Scale, ['finance']],
        ['Refund', 'admin.refunds.index', null, RotateCcw, ['finance'], 'refunds'],
        ['Laporan', 'admin.reports.index', null, BarChart3, ['finance']],
        ['Keamanan Keuangan', 'admin.finance.bank.index', null, ShieldAlert, ['finance']],
    ]],
    ['Layanan Pelanggan', [
        ['Pusat Bantuan', 'admin.support.index', null, Headset, ['cs'], 'support', 'admin.support.*'],
        ['Jawaban Chatbox', 'admin.crud.index', 'chatbot', Bot, ['cs']],
        ['FAQ', 'admin.crud.index', 'faq', HelpCircle, ['cs']],
    ]],
    ['Konten & Sistem', [
        ['Halaman', 'admin.pages.index', null, FileText, ['super_admin']],
        ['Blog', 'admin.crud.index', 'blog', BookOpen, ['super_admin']],
        ['Testimoni', 'admin.crud.index', 'testimoni', MessageSquareQuote, ['super_admin']],
        ['Galeri', 'admin.crud.index', 'galeri', Image, ['super_admin']],
        ['Kirim Promo', 'admin.promotions.index', null, Megaphone, ['super_admin']],
        ['Pelanggan', 'admin.users.index', null, Users, ['super_admin']],
        ['Audit Log', 'admin.audit.index', null, ScrollText, ['super_admin']],
        ['Pengaturan', 'admin.settings.index', null, Settings, ['super_admin']],
        ['Akun Admin', 'admin.admins.index', null, UserCog, ['primary']],
    ]],
];

export default function AdminLayout({ title, children }) {
    const { auth, adminBadges, paymentMode } = usePage().props;
    const user = auth.user;
    const [open, setOpen] = useState(false);

    const allowed = (roles) => {
        if (!roles) return true;
        if (roles.includes('primary')) return user.is_primary_admin;
        return user.role === 'super_admin' || roles.includes(user.role);
    };
    const isActive = (name, param, pattern) => {
        if (param) return route().current(name, { resource: param }) || route().current(name, param);
        return route().current(name) || (pattern && route().current(pattern));
    };

    const nav = (
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4 scrollbar-none">
            {GROUPS.map(([group, items]) => {
                const visible = items.filter((i) => allowed(i[4]));
                if (!visible.length) return null;
                return (
                    <div key={group}>
                        <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-brand-300/80">{group}</p>
                        <div className="space-y-0.5">
                            {visible.map(([label, name, param, Icon, , badge, pattern]) => {
                                const count = badge ? adminBadges?.[badge] : 0;
                                return (
                                    <Link key={label} href={param ? route(name, param) : route(name)} onClick={() => setOpen(false)}
                                        className={cx('flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition', isActive(name, param, pattern) ? 'bg-white/10 font-semibold text-white' : 'text-brand-100 hover:bg-white/5 hover:text-white')}>
                                        <Icon className="h-4 w-4 shrink-0" />
                                        <span className="flex-1 truncate">{label}</span>
                                        {count > 0 && <span className="rounded-full bg-gold-400 px-1.5 text-[10px] font-bold text-brand-950">{count}</span>}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </nav>
    );

    const sidebar = (
        <div className="flex h-full flex-col bg-brand-900">
            <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
                <img src="/images/logo-sah-footer.png" alt="SAH" className="h-10 w-auto" />
            </div>
            {nav}
            <div className="border-t border-white/10 p-3">
                <Link href={route('logout')} method="post" as="button" className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-brand-100 hover:bg-white/5">
                    <LogOut className="h-4 w-4" />Keluar
                </Link>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50">
            <Head title={title ? `${title} · Admin` : 'Admin'} />
            <Flash />
            <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">{sidebar}</aside>
            {open && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <div className="absolute inset-0 bg-slate-900/50" onClick={() => setOpen(false)} />
                    <div className="absolute inset-y-0 left-0 w-72 animate-fade-up">{sidebar}</div>
                    <button onClick={() => setOpen(false)} className="absolute right-4 top-4 rounded-full bg-white p-2"><X className="h-5 w-5" /></button>
                </div>
            )}
            <div className="lg:pl-64">
                <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
                    <button onClick={() => setOpen(true)} className="rounded-lg p-2 hover:bg-slate-100 lg:hidden" aria-label="Menu"><Menu className="h-5 w-5" /></button>
                    <p className="flex-1 truncate font-semibold text-slate-800">{title}</p>
                    {paymentMode === 'simulator' && <span className="hidden rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-800 sm:inline">Mode Simulasi Pembayaran</span>}
                    <Link href={route('home')} className="btn-ghost btn-sm hidden sm:inline-flex"><Globe className="h-4 w-4" />Situs</Link>
                    <NotificationBell />
                    <Link href={route('profile.edit')} className="flex items-center gap-2 rounded-xl px-2 py-1 hover:bg-slate-100">
                        <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-700 text-sm font-bold text-white">{user.name.charAt(0)}</span>
                        <span className="hidden text-left leading-tight md:block">
                            <span className="block text-sm font-semibold">{user.name}</span>
                            <span className="flex items-center gap-1 text-[11px] text-slate-500">{user.is_primary_admin && <KeyRound className="h-3 w-3 text-gold-500" />}{user.is_primary_admin ? 'Admin Utama' : user.role_label}</span>
                        </span>
                    </Link>
                </header>
                <main className="animate-fade-up p-4 sm:p-6 lg:p-8">{children}</main>
            </div>
        </div>
    );
}
