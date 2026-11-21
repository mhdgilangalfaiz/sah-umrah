import { Head, Link, usePage } from '@inertiajs/react';
import {
    ChevronDown, Clock, House, Image, Info, Layers, Landmark, Mail, MapPin, Menu, MessageSquareQuote, Phone, Plane, Stamp, X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import ChatWidget from '@/Components/ChatWidget';
import NotificationBell from '@/Components/NotificationBell';
import { Flash, cx } from '@/Components/ui';

/** Menu yang mengarah ke section di landing page (scroll, tidak pindah halaman).
 *  nav: false → tidak tampil di navbar (hanya di footer); logo sudah berfungsi sebagai tombol beranda. */
export const SECTIONS = [
    { id: 'beranda', label: 'Beranda', icon: House, nav: false },
    { id: 'tentang', label: 'Tentang Kami', icon: Info },
    { id: 'layanan', label: 'Layanan Kami', icon: Layers, dropdown: true },
    { id: 'galeri', label: 'Galeri', icon: Image },
    { id: 'testimoni', label: 'Testimoni', icon: MessageSquareQuote },
    { id: 'kontak', label: 'Kontak', icon: Phone },
];

/** Isi dropdown "Layanan Kami" — masing-masing pindah ke halaman sendiri. */
export const SERVICES = [
    { label: 'Paket Umrah', route: 'packages.index', icon: Landmark },
    { label: 'Tiket Pesawat', route: 'flights.index', icon: Plane },
    { label: 'Layanan Visa', route: 'visa.index', icon: Stamp },
];

export function Logo({ className = 'h-10' }) {
    return <img src="/images/logo-sah.png" alt="PT. Sumatera Andalan Haramain" className={cx('w-auto', className)} />;
}

/** Link ke section: di beranda cukup scroll halus, di halaman lain kembali ke beranda lalu ke section. */
function SectionLink({ id, onHome, className, children, onClick }) {
    if (onHome) {
        const go = (e) => {
            e.preventDefault();
            document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            history.replaceState(null, '', id === 'beranda' ? location.pathname : `#${id}`);
            onClick?.();
        };
        return <a href={`#${id}`} onClick={go} className={className}>{children}</a>;
    }
    return <Link href={`${route('home')}#${id}`} onClick={onClick} className={className}>{children}</Link>;
}

function useActiveSection(enabled) {
    const [active, setActive] = useState('beranda');
    useEffect(() => {
        if (!enabled) return;
        const els = SECTIONS.map((s) => document.getElementById(s.id)).filter(Boolean);
        const io = new IntersectionObserver(
            (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
            { rootMargin: '-45% 0px -50% 0px' },
        );
        els.forEach((el) => io.observe(el));
        return () => io.disconnect();
    }, [enabled]);
    return active;
}

function ServicesDropdown({ highlighted }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    useEffect(() => {
        const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
        const esc = (e) => e.key === 'Escape' && setOpen(false);
        document.addEventListener('mousedown', close);
        document.addEventListener('keydown', esc);
        return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
    }, []);

    return (
        <div ref={ref} className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
            <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="true"
                className={cx('nav-pill', highlighted || open ? 'nav-pill-active' : '')}>
                Layanan Kami
                <ChevronDown className={cx('h-3.5 w-3.5 transition', open && 'rotate-180')} />
            </button>
            {open && (
                <div className="absolute left-1/2 top-full z-50 w-52 -translate-x-1/2 pt-3">
                    <div className="animate-pop rounded-2xl border border-slate-100 bg-white p-2 shadow-xl">
                        {SERVICES.map(({ label, route: r }) => (
                            <Link key={r} href={route(r)} className="block rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-brand-50 hover:text-brand-700">
                                {label}
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function PublicLayout({ title, children }) {
    const { auth, company } = usePage().props;
    const [open, setOpen] = useState(false);
    const [mobileServices, setMobileServices] = useState(false);
    const user = auth.user;
    const onHome = route().current('home');
    const active = useActiveSection(onHome);
    const onServicePage = SERVICES.some((s) => route().current(s.route.split('.')[0] + '.*'));
    const dashboardUrl = user ? (user.is_admin ? route('admin.dashboard') : route('dashboard')) : null;

    return (
        <div className="flex min-h-screen flex-col bg-white">
            {title && <Head title={title} />}
            <Flash />

            <header className="sticky top-0 z-40 px-3 pt-3 sm:px-4">
                <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 rounded-full border border-slate-100 bg-white/95 px-3 shadow-[0_8px_30px_-12px_rgba(4,99,42,.25)] backdrop-blur sm:px-4 lg:h-[60px]">
                    <Link href={route('home')} className="shrink-0 pl-1">
                        <Logo className="h-8 lg:h-10" />
                    </Link>

                    <nav className="hidden items-center gap-1 lg:flex">
                        {SECTIONS.filter((s) => s.nav !== false).map(({ id, label, dropdown }) => dropdown ? (
                            <ServicesDropdown key={id} highlighted={onServicePage || (onHome && active === id)} />
                        ) : (
                            <SectionLink key={id} id={id} onHome={onHome} className={cx('nav-pill', onHome && active === id && 'nav-pill-active')}>
                                {label}
                            </SectionLink>
                        ))}
                    </nav>

                    <div className="flex items-center gap-2 pr-1">
                        {user ? (
                            <>
                                <NotificationBell />
                                <Link href={dashboardUrl} className="hidden items-center gap-2 rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-800 sm:inline-flex">
                                    {user.is_admin ? 'Panel Admin' : 'Dashboard'}
                                </Link>
                            </>
                        ) : (
                            <Link href={route('login')} className="hidden items-center gap-2 rounded-full bg-brand-700 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-800 sm:inline-flex">
                                Login
                            </Link>
                        )}
                        <button onClick={() => setOpen(true)} className="rounded-full p-2 text-slate-700 hover:bg-slate-100 lg:hidden" aria-label="Menu">
                            <Menu className="h-6 w-6" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Drawer mobile */}
            {open && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <div className="absolute inset-0 bg-slate-900/40" onClick={() => setOpen(false)} />
                    <div className="absolute right-0 top-0 flex h-full w-[82%] max-w-sm animate-fade-up flex-col bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b px-4 py-3">
                            <Logo className="h-9" />
                            <button onClick={() => setOpen(false)} className="rounded-lg p-2 hover:bg-slate-100" aria-label="Tutup"><X className="h-5 w-5" /></button>
                        </div>
                        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
                            {SECTIONS.filter((s) => s.nav !== false).map(({ id, label, dropdown }) => dropdown ? (
                                <div key={id}>
                                    <button onClick={() => setMobileServices((v) => !v)} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 font-medium text-slate-700 hover:bg-brand-50">
                                        {label}
                                        <ChevronDown className={cx('ml-auto h-4 w-4 transition', mobileServices && 'rotate-180')} />
                                    </button>
                                    {mobileServices && (
                                        <div className="ml-6 space-y-1 border-l-2 border-brand-100 pl-3">
                                            {SERVICES.map(({ label: l, route: r }) => (
                                                <Link key={r} href={route(r)} className="block rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-brand-50 hover:text-brand-700">
                                                    {l}
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <SectionLink key={id} id={id} onHome={onHome} onClick={() => setOpen(false)}
                                    className={cx('flex items-center gap-3 rounded-xl px-4 py-3 font-medium hover:bg-brand-50', onHome && active === id ? 'bg-brand-50 text-brand-700' : 'text-slate-700')}>
                                    {label}
                                </SectionLink>
                            ))}
                        </nav>
                        <div className="space-y-2 border-t p-4">
                            {user ? (
                                <>
                                    <Link href={dashboardUrl} className="btn-primary w-full">{user.is_admin ? 'Panel Admin' : 'Dashboard Saya'}</Link>
                                    <Link href={route('logout')} method="post" as="button" className="btn-outline w-full">Keluar</Link>
                                </>
                            ) : (
                                <>
                                    <Link href={route('login')} className="btn-primary w-full">Login</Link>
                                    <Link href={route('register')} className="btn-outline w-full">Daftar Akun</Link>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <main className="flex-1 animate-page-in">{children}</main>

            <footer id="kontak" className="scroll-mt-24 bg-brand-900 text-brand-100">
                <div className="container-app grid gap-8 py-6 sm:grid-cols-2 lg:grid-cols-[1.15fr_0.75fr_1.5fr] lg:gap-0 lg:divide-x lg:divide-white/15">
                    <div className="lg:pr-8">
                        <div className="flex w-fit flex-col items-center">
                            <img src="/images/logo-sah-footer.png" alt="SAH" className="h-10 w-auto" />
                            <p className="mt-1.5 text-sm font-bold uppercase tracking-wide text-white">{company.name}</p>
                        </div>
                        <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-brand-200">Melayani perjalanan ibadah umrah dengan amanah, terpercaya, dan profesional.</p>
                        <p className="mt-1.5 text-xs text-brand-300">{company.license}</p>
                        <div className="mt-3 flex items-center gap-3">
                            <span className="text-sm font-semibold text-white">Ikuti Kami</span>
                            <div className="flex gap-2">
                                {SOCIALS.map(({ label, href, path }) => (
                                    <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}
                                        className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/20 transition hover:-translate-y-0.5 hover:bg-white hover:text-brand-900">
                                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true"><path d={path} /></svg>
                                    </a>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="flex lg:justify-center lg:px-8">
                        <div className="w-fit">
                        <FooterHeading>Navigasi</FooterHeading>
                        <ul className="space-y-1.5 text-sm">
                            {SECTIONS.filter((x) => x.id !== 'beranda').map(({ id, label, icon: Icon }) => (
                                <li key={id}>
                                    <SectionLink id={id} onHome={onHome} className="inline-flex items-center gap-2 transition hover:text-white">
                                        <Icon className="h-4 w-4 shrink-0" /> {label}
                                    </SectionLink>
                                </li>
                            ))}
                        </ul>
                        </div>
                    </div>
                    <div className="lg:pl-8">
                        <FooterHeading>Alamat & Kontak</FooterHeading>
                        <ul className="space-y-1.5 text-sm">
                            <li className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0" />{company.address}</li>
                            <li className="flex gap-2"><Phone className="mt-0.5 h-4 w-4 shrink-0" />{company.phone}</li>
                            <li className="flex gap-2"><Mail className="mt-0.5 h-4 w-4 shrink-0" /><span className="break-all">{company.email}</span></li>
                            {company.hours && <li className="flex gap-2"><Clock className="mt-0.5 h-4 w-4 shrink-0" />{company.hours}</li>}
                        </ul>
                    </div>
                </div>
                <div className="border-t border-white/10 bg-white text-slate-600">
                    <div className="container-app flex flex-col gap-2 py-3 text-xs sm:flex-row sm:items-center sm:justify-between">
                        <p>© {new Date().getFullYear()} {company.name}. All Rights Reserved.</p>
                        <p className="flex flex-wrap items-center gap-3">
                            <Link href={route('pages.show', 'kebijakan-privasi')} className="hover:text-brand-700">Kebijakan Privasi</Link>
                            <span className="text-slate-300">|</span>
                            <Link href={route('pages.show', 'syarat-ketentuan')} className="hover:text-brand-700">Syarat & Ketentuan</Link>
                            <span className="text-slate-300">|</span>
                            <Link href={route('pages.show', 'kebijakan-refund')} className="hover:text-brand-700">Kebijakan Refund</Link>
                        </p>
                    </div>
                </div>
            </footer>

            {!user?.is_admin && <ChatWidget />}
        </div>
    );
}

function FooterHeading({ children }) {
    return (
        <p className="mb-3 text-sm font-bold uppercase tracking-wider text-white">
            {children}
            <span className="mt-1.5 block h-0.5 w-8 rounded-full bg-gold-400" />
        </p>
    );
}

// Ganti href dengan akun media sosial resmi perusahaan.
const SOCIALS = [
    { label: 'Instagram', href: '#', path: 'M12 2.2c3.2 0 3.6 0 4.8.1 1.2.1 1.8.2 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.4 1.1.4 2.2.1 1.3.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 1.2-.2 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1.1.4-2.2.4-1.3.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-1.2-.1-1.8-.2-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1.1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8c.1-1.2.2-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1.1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2zm0 4.7a5.1 5.1 0 100 10.2 5.1 5.1 0 000-10.2zm0 8.4a3.3 3.3 0 110-6.6 3.3 3.3 0 010 6.6zm5.3-9.8a1.2 1.2 0 100 2.4 1.2 1.2 0 000-2.4z' },
    { label: 'Facebook', href: '#', path: 'M22 12a10 10 0 10-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.3v7A10 10 0 0022 12z' },
    { label: 'YouTube', href: '#', path: 'M23.5 6.2a3 3 0 00-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 00.5 6.2 31 31 0 000 12a31 31 0 00.5 5.8 3 3 0 002.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 002.1-2.1A31 31 0 0024 12a31 31 0 00-.5-5.8zM9.6 15.6V8.4l6.2 3.6-6.2 3.6z' },
    { label: 'TikTok', href: '#', path: 'M19.6 6.7a4.8 4.8 0 01-3.8-4.2V2h-3.4v13.4a2.9 2.9 0 11-2-2.7V9.2a6.3 6.3 0 105.4 6.2V8.7a8.2 8.2 0 004.8 1.5V6.8a4.8 4.8 0 01-1-.1z' },
];
