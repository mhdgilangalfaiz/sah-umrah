import { Link } from '@inertiajs/react';
import { ChevronRight, Wallet } from 'lucide-react';
import { cn, formatRupiah } from '@/Components/landing/lib';
import { Stagger, StaggerItem } from '@/Components/landing/motion';
import type { DashboardStats } from './types';

interface StatDef {
    label: string;
    value: string;
    unit?: string;
    href: string;
    /** gambar cut-out asli; tanpa gambar → ikon */
    image?: string;
    tone: { card: string; circle: string; arrow: string };
}

/**
 * Empat kartu ringkasan: Umrah (hijau), Tiket (biru), Visa (amber), Sisa Tagihan (merah).
 * Ringkas: 4 sejajar mulai 1280px; ukuran angka mengikuti lebar layar agar nominal Rupiah tidak terpotong.
 */
export default function StatCards({ stats }: { stats: DashboardStats }) {
    const items: StatDef[] = [
        { label: 'Umrah', value: String(stats.umrah), unit: 'Paket', href: route('customer.bookings.index'), image: '/images/landing/layanan/kaabah.webp',
            tone: { card: 'from-[#EAF6EE] to-white', circle: 'bg-primary-100', arrow: 'text-primary-700' } },
        { label: 'Tiket', value: String(stats.tiket), unit: 'Tiket', href: route('customer.flight-orders.index'), image: '/images/landing/layanan/pesawat.webp',
            tone: { card: 'from-[#E6F1FB] to-white', circle: 'bg-sky-100', arrow: 'text-sky-700' } },
        { label: 'Visa', value: String(stats.visa), unit: 'Visa', href: route('customer.visa.index'), image: '/images/landing/layanan/paspor.webp',
            tone: { card: 'from-[#FBF3E2] to-white', circle: 'bg-amber-100', arrow: 'text-amber-700' } },
        { label: 'Sisa Tagihan', value: formatRupiah(stats.outstanding), href: route('customer.billing'), image: '/images/landing/layanan/tagihan.webp',
            tone: { card: 'from-[#FCEBEC] to-white', circle: 'bg-red-100', arrow: 'text-red-600' } },
    ];

    return (
        <Stagger gap={0.08} className="grid grid-cols-2 gap-3 xl:grid-cols-4 xl:gap-4">
            {items.map((s) => (
                <StaggerItem key={s.label}>
                    <Link href={s.href}
                        className={cn('group relative flex h-full flex-col items-start gap-2 rounded-2xl sm:flex-row sm:items-center sm:gap-3 border border-white bg-gradient-to-br p-3 pr-7 shadow-[0_8px_24px_-16px_rgba(11,77,42,0.35),inset_0_1px_0_#fff] transition hover:-translate-y-0.5 hover:shadow-[0_14px_32px_-16px_rgba(11,77,42,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 sm:p-3.5 sm:pr-8', s.tone.card)}>
                        <span className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-full sm:h-12 sm:w-12', s.tone.circle)}>
                            {s.image
                                ? <img src={s.image} alt="" className={cn('h-auto object-contain transition-transform duration-300 group-hover:scale-110', s.label === 'Tiket' ? 'w-[125%] max-w-none' : 'w-[78%]')} />
                                : <Wallet className="h-5 w-5 text-primary-700" aria-hidden="true" />}
                        </span>
                        <span className="w-full min-w-0 flex-1">
                            <span className="block truncate text-[11px] font-bold uppercase tracking-wider text-neutral-600">{s.label}</span>
                            <span className="block whitespace-nowrap font-jakarta text-[clamp(0.95rem,1.15vw,1.25rem)] font-extrabold leading-tight tracking-tight text-neutral-900">
                                {s.value}{s.unit && <span className="ml-1 text-[0.8em] font-semibold text-neutral-900/75">{s.unit}</span>}
                            </span>
                        </span>
                        <ChevronRight className={cn('absolute right-2.5 top-3.5 h-4 w-4 transition-transform sm:top-1/2 sm:-translate-y-1/2 group-hover:translate-x-0.5', s.tone.arrow)} aria-hidden="true" />
                    </Link>
                </StaggerItem>
            ))}
        </Stagger>
    );
}
