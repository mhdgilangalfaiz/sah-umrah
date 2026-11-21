import { Link, usePage } from '@inertiajs/react';
import {
    ChevronsLeft, FileText, Headset, House, Landmark, Plane, Receipt, RotateCcw, Stamp, User, Users, type LucideIcon,
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn, waLink } from '@/Components/landing/lib';
import { WhatsAppIcon } from '@/Components/landing/shared';
import type { SharedProps } from '@/Components/landing/types';

interface MenuItem { label: string; route: string; icon: LucideIcon; match?: string }

export const PORTAL_MENU: MenuItem[] = [
    { label: 'Dashboard', route: 'dashboard', icon: House },
    { label: 'Umrah Saya', route: 'customer.bookings.index', icon: Landmark, match: 'customer.bookings.*' },
    { label: 'Tiket Pesawat', route: 'customer.flight-orders.index', icon: Plane, match: 'customer.flight-orders.*' },
    { label: 'Visa', route: 'customer.visa.index', icon: Stamp, match: 'customer.visa.*' },
    { label: 'Tagihan & Pembayaran', route: 'customer.billing', icon: Receipt },
    { label: 'Dokumen', route: 'customer.documents.index', icon: FileText },
    { label: 'Data Jamaah', route: 'customer.jamaah.index', icon: Users },
    { label: 'Refund', route: 'customer.refunds.index', icon: RotateCcw },
    { label: 'Riwayat Bantuan', route: 'customer.support.index', icon: Headset },
    { label: 'Profil', route: 'profile.edit', icon: User },
];

interface SidebarNavProps {
    collapsed?: boolean;
    /** layoutId berbeda untuk sidebar desktop & sheet HP agar animasi tidak bentrok */
    pillId: string;
    onToggle?: () => void;
    onNavigate?: () => void;
}

/** Isi sidebar: logo, menu dengan pill aktif yang bergeser, kartu bantuan. */
export default function SidebarNav({ collapsed = false, pillId, onToggle, onNavigate }: SidebarNavProps) {
    const { company } = usePage<SharedProps>().props;
    const isActive = (m: MenuItem) => route().current(m.route) || (!!m.match && route().current(m.match));

    return (
        <div className="flex h-full flex-col">
            {/* Lebar: logo kiri + tombol lipat kanan. Terlipat: ikon Ka'bah di atas, tombol lebarkan di bawahnya, rata tengah. */}
            <div className={cn('flex border-b border-primary-900/10 pb-4 short:pb-3', collapsed ? 'flex-col items-center gap-3 short:gap-2' : 'items-center justify-between pl-2')}>
                <Link href={route('home')} aria-label="Ke beranda SAH" className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
                    {collapsed
                        ? <img src="/images/logo-sah-mark.png" alt="SAH" className="h-11 w-11 short:h-9 short:w-9" />
                        : <img src="/images/logo-sah.png" alt="SAH - PT. Sumatera Andalan Haramain" className="h-12 w-auto short:h-10" />}
                </Link>
                {onToggle && (
                    <button type="button" onClick={onToggle} aria-label={collapsed ? 'Lebarkan sidebar' : 'Lipat sidebar'} title={collapsed ? 'Lebarkan sidebar' : 'Lipat sidebar'}
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-primary-100 bg-white text-primary-700 shadow-sm transition hover:bg-primary-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
                        <ChevronsLeft className={cn('h-4 w-4 transition-transform duration-300', collapsed && 'rotate-180')} />
                    </button>
                )}
            </div>

            <nav aria-label="Menu portal jamaah" className="-mx-1 mt-4 flex-1 overflow-y-auto px-1 scrollbar-none short:mt-2">
                <ul className="space-y-1 short:space-y-0.5">
                    {PORTAL_MENU.map((m) => {
                        const active = isActive(m);
                        const Icon = m.icon;
                        return (
                            <li key={m.route} className="relative">
                                {active && (
                                    <motion.span layoutId={pillId} className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary-700 to-primary-900 shadow-md shadow-primary-700/30"
                                        transition={{ type: 'spring', stiffness: 400, damping: 34 }} />
                                )}
                                <Link href={route(m.route)} onClick={onNavigate} title={collapsed ? m.label : undefined} aria-current={active ? 'page' : undefined}
                                    className={cn('relative flex h-11 items-center gap-3 rounded-2xl text-sm short:h-9 font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
                                        collapsed ? 'justify-center px-0' : 'px-4', active ? 'text-white' : 'text-neutral-900 hover:bg-white/70 hover:text-primary-700')}>
                                    <Icon className={cn('h-5 w-5 shrink-0', active ? 'text-white' : 'text-primary-700')} aria-hidden="true" />
                                    {!collapsed && <span className="truncate">{m.label}</span>}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            <div className={cn('mt-4 rounded-2xl border border-white short:mt-2 bg-gradient-to-br from-white/85 to-primary-50/80 shadow-[inset_0_1px_0_#fff]', collapsed ? 'p-2' : 'p-4')}>
                {!collapsed && (
                    <div className="flex items-start gap-3 short:hidden">
                        <Headset className="mt-0.5 h-7 w-7 shrink-0 text-primary-700" aria-hidden="true" />
                        <div>
                            <p className="text-sm font-extrabold text-neutral-900">Butuh Bantuan?</p>
                            <p className="text-xs text-neutral-600">Hubungi tim SAH sekarang.</p>
                        </div>
                    </div>
                )}
                <a href={waLink(company.whatsapp, "Assalamu'alaikum, saya jamaah SAH dan butuh bantuan.")} target="_blank" rel="noopener noreferrer"
                    aria-label="Hubungi CS via WhatsApp" title="Hubungi CS"
                    className={cn('flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary-700 to-primary-900 text-sm font-bold text-white shadow-md shadow-primary-700/25 transition hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
                        collapsed ? 'h-11 w-full' : 'mt-3 h-10 w-full short:mt-0')}>
                    <WhatsAppIcon className="h-4 w-4" /> {!collapsed && 'Hubungi CS'}
                </a>
            </div>
        </div>
    );
}
