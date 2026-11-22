import { Head, Link, usePage } from '@inertiajs/react';
import { ChevronDown, FlaskConical, Globe, KeyRound, LayoutDashboard, LogOut, Menu, User } from 'lucide-react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import AdminSidebar from '@/Components/admin/AdminSidebar';
import AuthBackground from '@/Components/auth/AuthBackground';
import { cn } from '@/Components/landing/lib';
import { Sheet } from '@/Components/landing/ui/sheet';
import NotificationBell from '@/Components/NotificationBell';
import UserAvatar from '@/Components/portal/UserAvatar';
import { Flash } from '@/Components/ui';

const KEY = 'sah.admin.sidebar';
const readCollapsed = () => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } };

/** Layout panel admin: latar mint, sidebar kaca yang bisa dilipat (diingat browser), topbar ringkas. */
export default function AdminLayout({ title, icon: TitleIcon = LayoutDashboard, children }) {
    const { auth, paymentMode } = usePage().props;
    const user = auth.user;
    const [collapsed, setCollapsed] = useState(readCollapsed);
    const [sheet, setSheet] = useState(false);

    const toggle = () => setCollapsed((c) => {
        try { localStorage.setItem(KEY, c ? '0' : '1'); } catch { /* penyimpanan tidak tersedia */ }
        return !c;
    });

    return (
        <MotionConfig reducedMotion="user">
            <Head title={title ? `${title} · Admin` : 'Admin'} />
            <AuthBackground compact />
            <Flash />

            <div className="landing-ds mx-auto flex min-h-screen max-w-[1680px] gap-5 p-3 font-jakarta text-neutral-900 [color-scheme:light] sm:p-5">
                <aside className={cn('glassy sticky top-5 hidden h-[calc(100vh-2.5rem)] shrink-0 rounded-[1.75rem] from-white/95 via-white/85 to-white/75 p-3 transition-[width] duration-300 lg:block',
                    collapsed ? 'w-[76px]' : 'w-[262px]')}>
                    <AdminSidebar collapsed={collapsed} pillId="admin-pill" onToggle={toggle} />
                </aside>

                <div className="min-w-0 flex-1">
                    <header className="glassy sticky top-3 z-30 flex h-16 items-center gap-3 rounded-[1.5rem] from-white/95 via-white/90 to-white/85 px-3 sm:top-5 sm:px-5">
                        <button type="button" onClick={() => setSheet(true)} aria-label="Buka menu admin" className="grid h-10 w-10 place-items-center rounded-full text-primary-900 hover:bg-primary-100 lg:hidden">
                            <Menu className="h-5 w-5" />
                        </button>
                        <h1 className="flex min-w-0 flex-1 items-center gap-2.5 font-jakarta text-lg font-extrabold tracking-tight text-neutral-900 sm:text-xl">
                            <TitleIcon className="hidden h-6 w-6 shrink-0 text-primary-700 sm:block" aria-hidden="true" /><span className="truncate">{title}</span>
                        </h1>
                        {paymentMode === 'simulator' && (
                            <span className="hidden items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 md:inline-flex" title="Pembayaran tidak sungguhan">
                                <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" /> Mode Simulasi
                            </span>
                        )}
                        <Link href={route('home')} className="hidden items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-neutral-900 hover:bg-primary-50 hover:text-primary-700 sm:inline-flex">
                            <Globe className="h-4 w-4" aria-hidden="true" /> Situs
                        </Link>
                        <NotificationBell />
                        <span className="hidden h-8 w-px bg-primary-900/10 sm:block" aria-hidden="true" />
                        <AccountMenu user={user} />
                    </header>
                    <main className="mt-5">{children}</main>
                </div>
            </div>

            <Sheet open={sheet} onOpenChange={setSheet} title="Menu admin" side="left" className="bg-gradient-to-b from-[#F4FAF6] to-white p-4">
                <AdminSidebar pillId="admin-pill-sheet" onNavigate={() => setSheet(false)} />
            </Sheet>
        </MotionConfig>
    );
}

function AccountMenu({ user }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    useEffect(() => {
        if (!open) return undefined;
        const outside = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('mousedown', outside);
        document.addEventListener('keydown', esc);
        return () => { document.removeEventListener('mousedown', outside); document.removeEventListener('keydown', esc); };
    }, [open]);

    return (
        <div ref={ref} className="relative">
            <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu" aria-label="Menu akun"
                className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-2 hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
                <UserAvatar name={user.name} src={user.avatar} className="h-9 w-9 text-sm" />
                <span className="hidden text-left leading-tight md:block">
                    <span className="block max-w-[140px] truncate text-sm font-bold">{user.name}</span>
                    <span className="flex items-center gap-1 text-[11px] text-neutral-600">{user.role === 'super_admin' && <KeyRound className="h-3 w-3 text-gold-500" />}{user.role_label}</span>
                </span>
                <ChevronDown className={cn('h-4 w-4 text-neutral-600 transition-transform', open && 'rotate-180')} aria-hidden="true" />
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div role="menu" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.16 }}
                        className="absolute right-0 top-full z-50 mt-2 w-60 rounded-2xl border border-primary-100 bg-white p-2 shadow-[0_18px_40px_-14px_rgba(11,77,42,0.3)]">
                        <div className="border-b border-primary-100 px-3 pb-3 pt-2">
                            <p className="truncate text-sm font-bold">{user.name}</p>
                            <p className="truncate text-xs text-neutral-600">{user.email}</p>
                        </div>
                        <Link href={route('profile.edit')} role="menuitem" className="mt-1 flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-primary-50">
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
