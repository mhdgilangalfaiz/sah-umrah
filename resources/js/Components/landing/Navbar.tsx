import { Link } from '@inertiajs/react';
import { ChevronDown, House, Images, Info, Layers, LayoutDashboard, LogIn, Menu, Phone, type LucideIcon } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useState, type MouseEvent, type ReactNode } from 'react';
import { useActiveSection, type ScrollState } from './hooks';
import { cn, scrollToSection } from './lib';
import NavServices, { SERVICE_LINKS } from './NavServices';
import { Sheet } from './ui/sheet';

export const NAV_ITEMS: Array<{ id: string; label: string; icon: LucideIcon }> = [
    { id: 'beranda', label: 'Beranda', icon: House },
    { id: 'layanan', label: 'Layanan Kami', icon: Layers },
    { id: 'galeri', label: 'Galeri', icon: Images },
    { id: 'tentang', label: 'Tentang Kami', icon: Info },
    { id: 'kontak', label: 'Kontak', icon: Phone },
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

/** Navbar melayang: kaca putih, menu aktif bergeser halus, tersembunyi saat gulir ke bawah. */
export default function Navbar({ scroll, account, onHome }: NavbarProps) {
    const [open, setOpen] = useState(false);
    const [servicesOpen, setServicesOpen] = useState(false);
    const section = useActiveSection(onHome ? IDS : []);
    const active = onHome ? section : SERVICE_PAGES.some((p) => route().current(p)) ? 'layanan' : '';
    const reduce = useReducedMotion();
    const { scrolled, hidden } = scroll;
    const cta = account ?? { label: 'Login', href: route('login') };
    const CtaIcon = account ? LayoutDashboard : LogIn;

    const go = (id: string) => {
        const wasOpen = open;
        setOpen(false);
        // tunggu sheet tertutup agar scroll tidak terkunci
        window.setTimeout(() => scrollToSection(id), wasOpen ? 320 : 0);
    };
    const pill = (id: string) => cn('relative flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 xl:px-4',
        active === id ? 'text-primary-900' : 'text-neutral-600 hover:text-primary-700');
    const sheetItem = (on: boolean) => cn('flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
        on ? 'bg-primary-100 text-primary-900' : 'text-neutral-900 hover:bg-primary-50');

    return (
        <>
            <motion.header className="fixed inset-x-0 top-0 z-40 px-3" initial={false}
                animate={{ y: hidden && !open ? -120 : scrolled ? 12 : 48 }} transition={{ duration: reduce ? 0 : 0.35, ease: 'easeOut' }}>
                <nav aria-label="Navigasi utama"
                    className={cn('mx-auto flex max-w-7xl items-center justify-between gap-4 rounded-3xl border px-4 transition-[height,background-color,box-shadow] duration-300 sm:px-5',
                        scrolled ? 'h-16 border-primary-100 bg-white shadow-[0_12px_32px_-12px_rgba(11,77,42,0.3)]' : 'h-20 border-white/80 bg-white/80 shadow-[0_8px_30px_-14px_rgba(11,77,42,0.25)]')}>
                    <SectionLink id="beranda" onHome={onHome} onNavigate={go} className="shrink-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
                        <img src="/images/logo-sah.png" alt="SAH - PT. Sumatera Andalan Haramain" className={cn('w-auto transition-[height] duration-300', scrolled ? 'h-11' : 'h-14')} />
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

                    <div className="flex items-center gap-2">
                        <Link href={cta.href}
                            className="hidden items-center gap-2 rounded-full bg-gradient-to-r from-primary-700 to-primary-900 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-primary-700/25 transition hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 sm:inline-flex">
                            <CtaIcon className="h-4 w-4" aria-hidden="true" /> {cta.label}
                        </Link>
                        <button type="button" onClick={() => setOpen(true)} aria-label="Buka menu" aria-expanded={open}
                            className="grid h-11 w-11 place-items-center rounded-full text-primary-900 transition hover:bg-primary-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 lg:hidden">
                            <Menu className="h-6 w-6" />
                        </button>
                    </div>
                </nav>
            </motion.header>

            <Sheet open={open} onOpenChange={setOpen} title="Menu navigasi">
                <div className="border-b border-primary-100 px-5 py-4">
                    <img src="/images/logo-sah.png" alt="SAH - PT. Sumatera Andalan Haramain" className="h-12 w-auto" />
                </div>
                <ul className="flex-1 space-y-1 overflow-y-auto p-4">
                    {NAV_ITEMS.map(({ id, label, icon: Icon }, i) => (
                        <motion.li key={id} initial={reduce ? false : { opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.12 + i * 0.06, duration: 0.3 }}>
                            {id === 'layanan' ? (
                                <>
                                    <button type="button" onClick={() => setServicesOpen((v) => !v)} aria-expanded={servicesOpen} className={sheetItem(active === id)}>
                                        <Icon className="h-5 w-5 text-primary-500" aria-hidden="true" /> {label}
                                        <ChevronDown className={cn('ml-auto h-4 w-4 transition-transform', servicesOpen && 'rotate-180')} aria-hidden="true" />
                                    </button>
                                    <AnimatePresence initial={false}>
                                        {servicesOpen && (
                                            <motion.ul className="ml-7 overflow-hidden border-l-2 border-primary-100 pl-3"
                                                initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}>
                                                {SERVICE_LINKS.map(({ label: l, route: r, image }) => (
                                                    <li key={r}>
                                                        <Link href={route(r)} onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold text-neutral-900 hover:bg-primary-50">
                                                            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gold-100">
                                                                <img src={image} alt="" className={`h-auto object-contain ${r === 'flights.index' ? 'w-[125%] max-w-none' : 'w-[78%]'}`} />
                                                            </span>
                                                            {l}
                                                        </Link>
                                                    </li>
                                                ))}
                                            </motion.ul>
                                        )}
                                    </AnimatePresence>
                                </>
                            ) : (
                                <SectionLink id={id} onHome={onHome} onNavigate={go} className={sheetItem(active === id)}>
                                    <Icon className="h-5 w-5 text-primary-500" aria-hidden="true" /> {label}
                                </SectionLink>
                            )}
                        </motion.li>
                    ))}
                </ul>
                <div className="border-t border-primary-100 p-4">
                    <Link href={cta.href} className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary-700 to-primary-900 py-3.5 font-bold text-white shadow-md shadow-primary-700/25">
                        <CtaIcon className="h-4 w-4" aria-hidden="true" /> {cta.label}
                    </Link>
                </div>
            </Sheet>
        </>
    );
}
