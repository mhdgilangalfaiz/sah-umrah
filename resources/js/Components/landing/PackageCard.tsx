import { Link } from '@inertiajs/react';
import { ArrowRight, CalendarDays, Check, Clock, Hotel, Star, UtensilsCrossed, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { formatDate, formatRupiah } from './lib';
import { arrowShift, card } from './shared';
import type { LandingPackage } from './types';

interface PackageCardProps {
    p: LandingPackage;
    badge: string;
}

export default function PackageCard({ p, badge }: PackageCardProps) {
    const info: Array<[LucideIcon, string]> = [
        [Clock, `${p.duration_days} Hari`],
        [CalendarDays, p.departure_date ? formatDate(p.departure_date) : 'Jadwal segera hadir'],
    ];
    if (p.hotel) info.push([Hotel, p.hotel_star ? `${p.hotel} (${p.hotel_star}★)` : p.hotel]);
    if (p.meal) info.push([UtensilsCrossed, p.meal]);

    return (
        <article className={`${card} relative flex h-full flex-col p-5`}>
            {p.is_best_seller && (
                <span className="absolute -top-3 left-5 z-10 inline-flex items-center gap-1 overflow-hidden rounded-full bg-gold-500 px-3 py-1 text-xs font-extrabold text-neutral-900 shadow-md shadow-gold-500/30">
                    <Star className="h-3 w-3 fill-current" aria-hidden="true" /> {badge}
                    <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1/2 animate-shimmer bg-gradient-to-r from-transparent via-white/70 to-transparent motion-reduce:hidden" />
                </span>
            )}

            {/* Poster paket — menempel di tepi atas kartu */}
            <Link href={p.url} tabIndex={-1} aria-hidden="true" className="group/poster -mx-5 -mt-5 mb-4 block overflow-hidden rounded-t-2xl bg-primary-100">
                {p.cover_url ? (
                    <img src={p.cover_url} alt="" loading="lazy"
                        className="aspect-[4/5] w-full object-cover object-top transition duration-500 group-hover/poster:scale-105" />
                ) : (
                    <div className="grid aspect-[4/5] place-items-center bg-gradient-to-br from-primary-700 to-primary-900">
                        <img src="/images/logo-sah-footer.png" alt="" className="h-16 w-auto opacity-90" />
                    </div>
                )}
            </Link>

            <h3 className="font-jakarta text-lg font-extrabold leading-snug tracking-tight text-neutral-900">{p.name}</h3>
            <p className="mt-2 font-jakarta text-2xl font-extrabold tracking-tight text-primary-700">
                {formatRupiah(p.price)}<span className="text-sm font-semibold text-neutral-600"> /Pax</span>
            </p>

            <AirlineLogo name={p.airline} logo={p.airline_logo} />

            <ul className="space-y-2 text-sm text-neutral-600">
                {info.map(([Icon, text]) => (
                    <li key={text} className="flex items-start gap-2.5">
                        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" aria-hidden="true" />
                        <span className="min-w-0">{text}</span>
                    </li>
                ))}
            </ul>

            {p.facilities.length > 0 && (
                <ul className="mt-4 space-y-1.5 rounded-xl bg-primary-100 p-3.5 text-xs font-medium text-primary-900">
                    {p.facilities.map((f) => (
                        <li key={f} className="flex items-start gap-2">
                            <Check className="mt-px h-3.5 w-3.5 shrink-0 text-primary-700" strokeWidth={3} aria-hidden="true" /> {f}
                        </li>
                    ))}
                </ul>
            )}

            {/* pengisi ruang: tombol rata bawah antar kartu */}
            <div className="min-h-5 flex-1" />
            {/* Menuju halaman detail paket yang dipilih */}
            <Link href={p.url} aria-label={`Lihat detail paket ${p.name}`}
                className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary-700 to-primary-900 py-3 text-sm font-bold text-white shadow-md shadow-primary-700/25 transition hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2">
                Pilih Paket <ArrowRight className={arrowShift} aria-hidden="true" />
            </Link>
        </article>
    );
}

/** Logo maskapai; bila tidak ada / gagal dimuat → nama maskapai tebal. */
function AirlineLogo({ name, logo }: { name: string | null; logo: string | null }) {
    const [failed, setFailed] = useState(false);
    if (!name) return <div className="my-4 h-px bg-primary-100" />;
    return (
        <div className="my-4 flex h-12 items-center justify-center rounded-xl border border-primary-100 bg-white px-3">
            {logo && !failed
                ? <img src={logo} alt={name} loading="lazy" onError={() => setFailed(true)} className="max-h-8 w-auto object-contain" />
                : <span className="truncate text-sm font-extrabold uppercase tracking-wide text-neutral-900">{name}</span>}
        </div>
    );
}
