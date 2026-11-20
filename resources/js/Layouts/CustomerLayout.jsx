import { Link, usePage } from '@inertiajs/react';
import { Bell, FileText, Headset, Home, LogOut, Plane, Receipt, RotateCcw, Stamp, User, Users, Landmark } from 'lucide-react';
import PublicLayout from './PublicLayout';
import { cx } from '@/Components/ui';

const MENU = [
    ['Ringkasan', 'dashboard', Home],
    ['Umrah Saya', 'customer.bookings.index', Landmark, 'customer.bookings.*'],
    ['Tiket Pesawat', 'customer.flight-orders.index', Plane, 'customer.flight-orders.*'],
    ['Visa', 'customer.visa.index', Stamp, 'customer.visa.*'],
    ['Tagihan & Pembayaran', 'customer.billing', Receipt],
    ['Dokumen', 'customer.documents.index', FileText],
    ['Data Jamaah', 'customer.jamaah.index', Users],
    ['Refund', 'customer.refunds.index', RotateCcw],
    ['Riwayat Bantuan', 'customer.support.index', Headset],
    ['Notifikasi', 'notifications.index', Bell],
    ['Profil', 'profile.edit', User],
];

export default function CustomerLayout({ title, children }) {
    const { auth } = usePage().props;
    const active = (name, pattern) => route().current(name) || (pattern && route().current(pattern));

    return (
        <PublicLayout title={title}>
            <div className="border-b border-slate-200 bg-white">
                <div className="container-app flex items-center gap-3 py-4">
                    <div className="grid h-11 w-11 place-items-center rounded-full bg-brand-700 font-serif text-lg text-white">
                        {auth.user.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900">Assalamu'alaikum, {auth.user.name}</p>
                        <p className="text-xs text-slate-500">Kode pelanggan <b className="text-brand-700">{auth.user.customer_code}</b></p>
                    </div>
                </div>
                {/* Menu tab horizontal di mobile */}
                <nav className="container-app flex gap-1 overflow-x-auto pb-2 scrollbar-none lg:hidden">
                    {MENU.map(([label, name, Icon, pattern]) => (
                        <Link key={name} href={route(name)} className={cx('flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium', active(name, pattern) ? 'bg-brand-700 text-white' : 'bg-slate-100 text-slate-600')}>
                            <Icon className="h-3.5 w-3.5" />{label}
                        </Link>
                    ))}
                </nav>
            </div>
            <div className="container-app grid gap-8 py-8 lg:grid-cols-[230px_1fr]">
                <aside className="hidden lg:block">
                    <nav className="sticky top-24 space-y-1">
                        {MENU.map(([label, name, Icon, pattern]) => (
                            <Link key={name} href={route(name)} className={cx('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition', active(name, pattern) ? 'bg-brand-700 text-white shadow-sm' : 'text-slate-600 hover:bg-white hover:text-brand-700')}>
                                <Icon className="h-4 w-4" />{label}
                            </Link>
                        ))}
                        <Link href={route('logout')} method="post" as="button" className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50">
                            <LogOut className="h-4 w-4" />Keluar
                        </Link>
                    </nav>
                </aside>
                <div className="min-w-0 animate-fade-up">{children}</div>
            </div>
        </PublicLayout>
    );
}
