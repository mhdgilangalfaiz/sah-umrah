import { Link } from '@inertiajs/react';
import { House, Images, Info, Layers, LayoutDashboard, LogIn, Phone, type LucideIcon } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useState, type MouseEvent, type ReactNode } from 'react';
import BottomNav from './BottomNav';
import { useActiveSection, type ScrollState } from './hooks';
import { cn, scrollToSection } from './lib';
import NavServices, { SERVICE_LINKS } from './NavServices';

export const NAV_ITEMS: Array<{ id: string; label: string; short: string; icon: LucideIcon }> = [
    { id: 'beranda', label: 'Beranda', short: 'Beranda', icon: House },
    { id: 'tentang', label: 'Tentang Kami', short: 'Tentang', icon: Info },
    { id: 'layanan', label: 'Layanan Kami', short: 'Layanan', icon: Layers },
    { id: 'galeri', label: 'Galeri', short: 'Galeri', icon: Images },
    { id: 'kontak', label: 'Kontak', short: 'Kontak', icon: Phone },
];
const IDS = NAV_ITEMS.map((n) => n.id);
const SERVICE_PAGES = ['packages.*', 'flights.*', 'visa.*', 'checkout.*'];

interface NavbarProps {
    scroll: ScrollState;
    account: { label: string; href: string } | null;
    /** true di beranda: menu menggulir ke section; di halaman lain menuju beranda#section */
    onHome: boolean;
}

/** Tautan ke section. Kontak (footer) ada di setiap halaman, jadi selalu cukup digulir. */
export function SectionLink({ id, onHome, className, onNavigate, children }: { id: string; onHome: boolean; className?: string; onNavigate?: (id: string) => void; children: ReactNode }) {
    if (onHome || id === 'kontak') {
        const go = (e: MouseEvent) => { e.preventDefault(); onNavigate ? onNavigate(id) : scrollToSection(id); };
        return <a href={`#${id}`} onClick={go} className={className}>{children}</a>;
    }
    return <Link href={id === 'beranda' ? route('home') : `${route('home')}#${id}`} className={className}>{children}</Link>;
}

/**
 * Navbar melayang: kaca putih, menu aktif bergeser halus, tersembunyi saat gulir ke bawah.
 * Di HP/tablet menu pindah ke bar kaca di bawah layar (BottomNav); di atas tinggal logo + Login/Dashboard.
 */
export default function Navbar({ scroll, account, onHome }: NavbarProps) {
    const [servicesOpen, setServicesOpen] = useState(false);
    const section = useActiveSection(onHome ? IDS : []);
    /*
     * Menu yang baru diklik langsung jadi aktif selama halaman bergulir ke sana, supaya penanda
     * tidak "mampir" ke section yang dilewati (Beranda → Tentang → Galeri → Kontak).
     * Dilepas lagi begitu pengguna menggulir sendiri.
     */
    const [target, setTarget] = useState<string | null>(null);
    useEffect(() => {
        if (!target) return;
        const release = () => setTarget(null);
        const opts = { passive: true, once: true } as const;
        window.addEventListener('wheel', release, opts);
        window.addEventListener('touchstart', release, opts);
        window.addEventListener('keydown', release, opts);
        return () => {
            window.removeEventListener('wheel', release);
            window.removeEventListener('touchstart', release);
            window.removeEventListener('keydown', release);
        };
    }, [target]);
    const active = target ?? (onHome ? section : SERVICE_PAGES.some((p) => route().current(p)) ? 'layanan' : '');
    const reduce = useReducedMotion();
    const { scrolled, hidden } = scroll;
    const cta = account ?? { label: 'Login', href: route('login') };
    const CtaIcon = account ? LayoutDashboard : LogIn;

    const go = (id: string) => { setTarget(id); scrollToSection(id); };
    const pill = (id: string) => cn('relative flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 xl:px-4',
        active === id ? 'text-primary-900' : 'text-neutral-600 hover:text-primary-700');

    return (
        <>
            <motion.header className="fixed inset-x-0 top-0 z-40 px-3" initial={false}
                animate={{ y: hidden ? -120 : scrolled ? 12 : 48 }} transition={{ duration: reduce ? 0 : 0.35, ease: 'easeOut' }}>
                <nav aria-label="Navigasi utama"
                    className={cn('mx-auto flex max-w-7xl items-center justify-between gap-4 rounded-2xl border px-3 transition-[height,background-color,box-shadow] duration-300 sm:rounded-3xl sm:px-5',
                        scrolled ? 'h-12 border-primary-100 bg-white shadow-[0_12px_32px_-12px_rgba(11,77,42,0.3)] sm:h-16' : 'h-14 border-white/80 bg-white/80 shadow-[0_8px_30px_-14px_rgba(11,77,42,0.25)] sm:h-20')}>
                    <SectionLink id="beranda" onHome={onHome} onNavigate={go} className="shrink-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
                        <img src="/images/logo-sah.png" alt="SAH - PT. Sumatera Andalan Haramain" className={cn('w-auto transition-[height] duration-300', scrolled ? 'h-8 sm:h-11' : 'h-10 sm:h-14')} />
                    </SectionLink>

                    <ul className="hidden items-center gap-1 lg:flex">
                        {NAV_ITEMS.map(({ id, label }) => id === 'layanan' ? (
                            <NavServices key={id} active={active === id} onHome={onHome} onSection={() => go('layanan')} />
                        ) : (
                            <li key={id} className="relative">
                                {active === id && <motion.span layoutId="nav-active" className="absolute inset-0 rounded-full bg-primary-100" transition={{ type: 'spring', stiffness: 380, damping: 32 }} />}
                                <SectionLink id={id} onHome={onHome} onNavigate={go} className={pill(id)}>
                                    {label}
                                </SectionLink>
                            </li>
                        ))}
                    </ul>

                    <Link href={cta.href}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-r from-primary-700 to-primary-900 px-3.5 py-1.5 text-xs font-bold text-white shadow-md shadow-primary-700/25 transition hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 sm:gap-2 sm:px-6 sm:py-2.5 sm:text-sm">
                        <CtaIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" /> {cta.label}
                    </Link>
                </nav>
            </motion.header>

            {/* HP/tablet: menu pindah ke bar kaca melayang di bawah (pengganti sidebar) */}
            <BottomNav label="Menu utama" idPrefix="site-bnav" raised={servicesOpen} items={NAV_ITEMS.map(({ id, short, icon }) => {
                if (id === 'layanan') {
                    return { key: id, label: short, icon, active: active === id || servicesOpen, expanded: servicesOpen, onClick: () => setServicesOpen((v) => !v) };
                }
                const scrolls = onHome || id === 'kontak';
                return {
                    key: id, label: short, icon, active: active === id && !servicesOpen,
                    href: scrolls ? undefined : id === 'beranda' ? route('home') : `${route('home')}#${id}`,
                    onClick: () => { setServicesOpen(false); if (scrolls) go(id); },
                };
            })}>
                <AnimatePresence>
                    {servicesOpen && (
                        <>
                            <motion.button key="backdrop" type="button" aria-label="Tutup menu layanan" onClick={() => setServicesOpen(false)}
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="fixed inset-0 -z-10 cursor-default bg-primary-900/20 backdrop-blur-[2px]" />
                            <motion.ul key="menu" className="absolute inset-x-0 bottom-full mb-3 space-y-1 rounded-3xl border border-white/70 bg-white/90 p-2 shadow-[0_18px_40px_-12px_rgba(11,77,42,0.4)] backdrop-blur-xl"
                                initial={reduce ? false : { opacity: 0, y: 12, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.97 }} transition={{ duration: 0.2 }}>
                                {SERVICE_LINKS.map(({ label, route: r, image, text }) => (
                                    <li key={r}>
                                        <Link href={route(r)} onClick={() => setServicesOpen(false)}
                                            className="flex items-center gap-3 rounded-2xl px-3 py-2.5 transition hover:bg-primary-50 focus-visible:bg-primary-50 focus-visible:outline-none">
                                            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gold-100">
                                                <img src={image} alt="" className={`h-auto object-contain ${r === 'flights.index' ? 'w-[125%] max-w-none' : 'w-[78%]'}`} />
                                            </span>
                                            <span className="min-w-0">
                                                <span className="block text-sm font-bold text-neutral-900">{label}</span>
                                                <span className="block truncate text-xs text-neutral-600">{text}</span>
                                            </span>
                                        </Link>
                                    </li>
                                ))}
                            </motion.ul>
                        </>
                    )}
                </AnimatePresence>
            </BottomNav>
        </>
    );
}
