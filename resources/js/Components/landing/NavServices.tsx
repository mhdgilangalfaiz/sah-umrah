import { Link } from '@inertiajs/react';
import { ChevronDown, Landmark, Plane, Stamp, type LucideIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { cn } from './lib';

/** Isi dropdown "Layanan Kami": masing-masing ke halaman layanannya. */
export const SERVICE_LINKS: Array<{ label: string; route: string; icon: LucideIcon; image: string; text: string }> = [
    { label: 'Paket Umrah', route: 'packages.index', icon: Landmark, image: '/images/landing/layanan/kaabah.webp', text: 'Pilihan paket lengkap & terjadwal' },
    { label: 'Tiket Pesawat', route: 'flights.index', icon: Plane, image: '/images/landing/layanan/pesawat.webp', text: 'Tiket keberangkatan umrah' },
    { label: 'Layanan Visa', route: 'visa.index', icon: Stamp, image: '/images/landing/layanan/paspor.webp', text: 'Pengurusan visa cepat & resmi' },
];

interface NavServicesProps {
    active: boolean;
    onHome: boolean;
    onSection: () => void;
}

/** Menu "Layanan Kami" desktop: terbuka saat hover / klik / fokus keyboard, tutup dengan Esc atau klik di luar. */
export default function NavServices({ active, onHome, onSection }: NavServicesProps) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLLIElement>(null);

    useEffect(() => {
        if (!open) return;
        const outside = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('mousedown', outside);
        document.addEventListener('keydown', esc);
        return () => { document.removeEventListener('mousedown', outside); document.removeEventListener('keydown', esc); };
    }, [open]);

    return (
        <li ref={ref} className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}
            onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false); }}>
            {active && <motion.span layoutId="nav-active" className="absolute inset-0 rounded-full bg-primary-100" transition={{ type: 'spring', stiffness: 380, damping: 32 }} />}
            <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="true"
                className={cn('relative flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 xl:px-4',
                    active || open ? 'text-primary-900' : 'text-neutral-600 hover:text-primary-700')}>
                Layanan Kami
                <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} aria-hidden="true" />
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div className="absolute left-1/2 top-full z-50 w-72 -translate-x-1/2 pt-3"
                        initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
                        <ul className="rounded-2xl border border-primary-100 bg-white p-2 shadow-[0_18px_40px_-14px_rgba(11,77,42,0.3)]">
                            {SERVICE_LINKS.map(({ label, route: r, image, text }) => (
                                <li key={r}>
                                    <Link href={route(r)} onClick={() => setOpen(false)}
                                        className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-primary-50 focus-visible:bg-primary-50 focus-visible:outline-none">
                                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gold-100">
                                            <img src={image} alt="" className={`h-auto object-contain transition-transform duration-300 group-hover:scale-110 ${r === 'flights.index' ? 'w-[125%] max-w-none' : 'w-[78%]'}`} />
                                        </span>
                                        <span>
                                            <span className="block text-sm font-bold text-neutral-900">{label}</span>
                                            <span className="block text-xs text-neutral-600">{text}</span>
                                        </span>
                                    </Link>
                                </li>
                            ))}
                            <li className="mt-1 border-t border-primary-100 pt-1">
                                {onHome ? (
                                    <a href="#layanan" onClick={(e) => { e.preventDefault(); setOpen(false); onSection(); }}
                                        className="block rounded-xl px-3 py-2 text-center text-xs font-bold text-primary-700 hover:bg-primary-50">Lihat semua layanan</a>
                                ) : (
                                    <Link href={`${route('home')}#layanan`} className="block rounded-xl px-3 py-2 text-center text-xs font-bold text-primary-700 hover:bg-primary-50">Lihat semua layanan</Link>
                                )}
                            </li>
                        </ul>
                    </motion.div>
                )}
            </AnimatePresence>
        </li>
    );
}
