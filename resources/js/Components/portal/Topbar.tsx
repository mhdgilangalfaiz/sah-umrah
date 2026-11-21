import { Link, usePage } from '@inertiajs/react';
import { Bell, ChevronDown, House, LogOut, Menu, User } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/Components/landing/lib';
import UserAvatar from './UserAvatar';
import NavServices from '@/Components/landing/NavServices';
import type { SharedProps } from '@/Components/landing/types';

type Props = SharedProps & { unreadNotifications: number; auth: { user: { name: string; email: string; is_admin: boolean; avatar: string | null } } };

const SITE_LINKS: Array<[string, string]> = [['Tentang Kami', 'tentang'], ['Galeri', 'galeri'], ['Testimoni', 'testimoni'], ['Kontak', 'kontak']];
const linkCls = 'rounded-full px-4 py-2 text-sm font-semibold text-neutral-900 transition hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500';

/** Bar atas portal: tautan ke situs (≥1280px), lonceng notifikasi, menu akun. */
export default function Topbar({ onMenu }: { onMenu: () => void }) {
    const { auth, unreadNotifications } = usePage<Props>().props;

    return (
        <header className="flex items-center gap-3">
            <button type="button" onClick={onMenu} aria-label="Buka menu portal"
                className="grid h-11 w-11 place-items-center rounded-full border border-white bg-white/80 text-primary-900 shadow-sm lg:hidden">
                <Menu className="h-5 w-5" />
            </button>
            <Link href={route('home')} className="lg:hidden"><img src="/images/logo-sah.png" alt="SAH" className="h-10 w-auto" /></Link>

            <nav aria-label="Tautan situs" className="hidden flex-1 xl:block">
                <ul className="flex w-fit items-center gap-1 rounded-full border border-white bg-white/85 p-1 shadow-[0_8px_24px_-14px_rgba(11,77,42,0.3),inset_0_1px_0_#fff]">
                    <li>
                        <Link href={route('home')} className="flex items-center gap-2 rounded-full bg-primary-100 px-4 py-2 text-sm font-bold text-primary-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
                            <House className="h-4 w-4" aria-hidden="true" /> Beranda
                        </Link>
                    </li>
                    <li><Link href={`${route('home')}#tentang`} className={linkCls}>Tentang Kami</Link></li>
                    <NavServices active={false} onHome={false} onSection={() => undefined} />
                    {SITE_LINKS.slice(1).map(([label, id]) => (
                        <li key={id}><Link href={`${route('home')}#${id}`} className={linkCls}>{label}</Link></li>
                    ))}
                </ul>
            </nav>

            <div className="ml-auto flex items-center gap-3">
                <Link href={route('notifications.index')} aria-label={`Notifikasi, ${unreadNotifications} belum dibaca`}
                    className="relative grid h-11 w-11 place-items-center rounded-full border border-white bg-white text-neutral-900 shadow-md shadow-primary-900/5 transition hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
                    <Bell className="h-5 w-5" />
                    {unreadNotifications > 0 && (
                        <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
                            {unreadNotifications > 9 ? '9+' : unreadNotifications}
                        </span>
                    )}
                </Link>
                <AccountMenu name={auth.user.name} email={auth.user.email} avatar={auth.user.avatar} />
            </div>
        </header>
    );
}

function AccountMenu({ name, email, avatar }: { name: string; email: string; avatar: string | null }) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!open) return;
        const outside = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('mousedown', outside);
        document.addEventListener('keydown', esc);
        return () => { document.removeEventListener('mousedown', outside); document.removeEventListener('keydown', esc); };
    }, [open]);

    return (
        <div ref={ref} className="relative">
            <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu" aria-label="Menu akun"
                className="flex h-11 items-center gap-2 rounded-full border border-white bg-white pl-1 pr-3 shadow-md shadow-primary-900/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
                <UserAvatar name={name} src={avatar} className="h-9 w-9 text-sm" />
                <ChevronDown className={cn('h-4 w-4 text-neutral-600 transition-transform', open && 'rotate-180')} aria-hidden="true" />
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div role="menu" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.16 }}
                        className="absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl border border-primary-100 bg-white p-2 shadow-[0_18px_40px_-14px_rgba(11,77,42,0.3)]">
                        <div className="border-b border-primary-100 px-3 pb-3 pt-2">
                            <p className="truncate text-sm font-bold text-neutral-900">{name}</p>
                            <p className="truncate text-xs text-neutral-600">{email}</p>
                        </div>
                        <Link href={route('profile.edit')} role="menuitem" className="mt-1 flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-neutral-900 hover:bg-primary-50">
                            <User className="h-4 w-4 text-primary-700" aria-hidden="true" /> Profil
                        </Link>
                        <Link href={route('logout')} method="post" as="button" role="menuitem" className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50">
                            <LogOut className="h-4 w-4" aria-hidden="true" /> Keluar
                        </Link>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
