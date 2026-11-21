import { Link } from '@inertiajs/react';
import { BedDouble, CalendarDays, Plane, Star } from 'lucide-react';
import { date, rupiah } from '@/lib/format';
import { Badge, CoverImage, cx } from './ui';

const TYPE_LABEL = { hemat: 'Hemat', reguler: 'Reguler', plus: 'Plus', vip: 'VIP' };

export function PackageCard({ p }) {
    const next = p.upcoming_departures?.[0];
    const remaining = next?.remaining ?? 0;
    return (
        <Link href={route('packages.show', p.slug)} className="card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lift">
            <div className="relative overflow-hidden bg-slate-50">
                {p.cover_url
                    // Poster tampil utuh; tinggi kartu mengikuti rasio poster
                    ? <img src={p.cover_url} alt={`Poster ${p.name}`} loading="lazy" className="block h-auto w-full transition duration-500 group-hover:scale-[1.03]" />
                    : <div className="aspect-[16/10]"><CoverImage src={null} alt={p.name} /></div>}
                {/* Label di atas gambar hanya untuk sampul bawaan, agar tidak menutupi isi poster */}
                {!p.cover_url && (
                    <div className="absolute left-3 top-3 flex gap-2">
                        <Badge className="bg-white/95 text-brand-800 ring-white">{TYPE_LABEL[p.type] ?? p.type}</Badge>
                        <Badge className="bg-brand-800/90 text-white ring-brand-800">{p.duration_days} Hari</Badge>
                    </div>
                )}
                {next && (
                    <div className={cx('absolute bottom-3 right-3 rounded-lg px-2.5 py-1 text-xs font-semibold shadow', remaining <= 10 ? 'bg-red-600 text-white' : 'bg-white/95 text-slate-700')}>
                        Sisa {remaining} kursi
                    </div>
                )}
            </div>
            <div className="flex flex-1 flex-col p-4">
                {p.cover_url && (
                    <div className="mb-2 flex gap-2">
                        <Badge className="bg-gold-50 text-gold-800 ring-gold-200">{TYPE_LABEL[p.type] ?? p.type}</Badge>
                        <Badge className="bg-brand-50 text-brand-800 ring-brand-200">{p.duration_days} Hari</Badge>
                    </div>
                )}
                <h3 className="text-base leading-snug group-hover:text-brand-700">{p.name}</h3>
                <div className="mt-2.5 space-y-1 text-xs text-slate-600">
                    <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-gold-500" />{next ? `Berangkat ${date(next.departure_date)}` : 'Jadwal segera hadir'}</p>
                    <p className="flex items-center gap-2"><Plane className="h-4 w-4 text-gold-500" />{p.airline} · dari {p.departure_city}</p>
                    <p className="flex items-center gap-2"><BedDouble className="h-4 w-4 text-gold-500" /><span className="truncate">Makkah: {p.hotel_makkah}</span><span className="flex shrink-0 text-gold-400">{Array.from({ length: p.hotel_makkah_star }).map((_, i) => <Star key={i} className="h-3 w-3 fill-current" />)}</span></p>
                    <p className="flex items-center gap-2"><BedDouble className="h-4 w-4 text-gold-500" /><span className="truncate">Madinah: {p.hotel_madinah}</span><span className="flex shrink-0 text-gold-400">{Array.from({ length: p.hotel_madinah_star }).map((_, i) => <Star key={i} className="h-3 w-3 fill-current" />)}</span></p>
                </div>
                <div className="mt-auto flex items-end justify-between gap-2 border-t border-slate-100 pt-3">
                    <div>
                        <p className="text-xs text-slate-500">Mulai dari</p>
                        <p className="text-lg font-bold text-brand-700">{rupiah(p.price_quad)}</p>
                        <p className="text-[11px] text-slate-500">DP {rupiah(p.min_deposit)}/jamaah</p>
                    </div>
                    <span className="btn-gold btn-sm shrink-0 px-3">Detail</span>
                </div>
            </div>
        </Link>
    );
}

// Kartu penerbangan (sekali jalan / PP, transit, sisa seat) ada di FlightOffer.jsx
export { FlightCard } from './FlightOffer';
