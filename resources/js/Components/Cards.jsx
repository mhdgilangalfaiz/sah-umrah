import { Link } from '@inertiajs/react';
import { BedDouble, CalendarDays, Clock, Luggage, Plane, PlaneTakeoff, Star, Users } from 'lucide-react';
import { date, rupiah, time } from '@/lib/format';
import { Badge, CoverImage, cx } from './ui';

const TYPE_LABEL = { hemat: 'Hemat', reguler: 'Reguler', plus: 'Plus', vip: 'VIP' };

export function PackageCard({ p }) {
    const next = p.upcoming_departures?.[0];
    const remaining = next?.remaining ?? 0;
    return (
        <Link href={route('packages.show', p.slug)} className="card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lift">
            <div className="relative aspect-[16/10] overflow-hidden">
                <CoverImage src={p.cover_url} alt={p.name} className="transition duration-500 group-hover:scale-105" />
                <div className="absolute left-3 top-3 flex gap-2">
                    <Badge className="bg-white/95 text-brand-800 ring-white">{TYPE_LABEL[p.type] ?? p.type}</Badge>
                    <Badge className="bg-brand-800/90 text-white ring-brand-800">{p.duration_days} Hari</Badge>
                </div>
                {next && (
                    <div className={cx('absolute bottom-3 right-3 rounded-lg px-2.5 py-1 text-xs font-semibold shadow', remaining <= 10 ? 'bg-red-600 text-white' : 'bg-white/95 text-slate-700')}>
                        Sisa {remaining} kursi
                    </div>
                )}
            </div>
            <div className="flex flex-1 flex-col p-5">
                <h3 className="text-lg leading-snug group-hover:text-brand-700">{p.name}</h3>
                <div className="mt-3 space-y-1.5 text-sm text-slate-600">
                    <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-gold-500" />{next ? `Berangkat ${date(next.departure_date)}` : 'Jadwal segera hadir'}</p>
                    <p className="flex items-center gap-2"><Plane className="h-4 w-4 text-gold-500" />{p.airline} · dari {p.departure_city}</p>
                    <p className="flex items-center gap-2"><BedDouble className="h-4 w-4 text-gold-500" /><span className="truncate">Makkah: {p.hotel_makkah}</span><span className="flex shrink-0 text-gold-400">{Array.from({ length: p.hotel_makkah_star }).map((_, i) => <Star key={i} className="h-3 w-3 fill-current" />)}</span></p>
                    <p className="flex items-center gap-2"><BedDouble className="h-4 w-4 text-gold-500" /><span className="truncate">Madinah: {p.hotel_madinah}</span><span className="flex shrink-0 text-gold-400">{Array.from({ length: p.hotel_madinah_star }).map((_, i) => <Star key={i} className="h-3 w-3 fill-current" />)}</span></p>
                </div>
                <div className="mt-auto flex items-end justify-between border-t border-slate-100 pt-4">
                    <div>
                        <p className="text-xs text-slate-500">Mulai dari</p>
                        <p className="text-xl font-bold text-brand-700">{rupiah(p.price_quad)}</p>
                        <p className="text-[11px] text-slate-500">DP {rupiah(p.min_deposit)}/jamaah</p>
                    </div>
                    <span className="btn-gold btn-sm">Lihat Detail</span>
                </div>
            </div>
        </Link>
    );
}

export function FlightCard({ f, pax = 1, action }) {
    return (
        <div className="card p-4 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                <div className="flex items-center gap-3 lg:w-48">
                    <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 font-bold text-brand-700">{f.airline_code || <PlaneTakeoff className="h-5 w-5" />}</div>
                    <div>
                        <p className="font-semibold text-slate-900">{f.airline}</p>
                        <p className="text-xs text-slate-500">{f.flight_number} · {f.cabin_class}</p>
                    </div>
                </div>
                <div className="flex flex-1 items-center gap-3">
                    <div className="text-center">
                        <p className="text-xl font-bold">{time(f.depart_at)}</p>
                        <p className="text-xs font-semibold text-slate-500">{f.origin_code}</p>
                    </div>
                    <div className="flex flex-1 flex-col items-center text-xs text-slate-500">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{f.duration_label}</span>
                        <div className="my-1 flex w-full items-center"><span className="h-px flex-1 bg-slate-300" /><Plane className="mx-1 h-4 w-4 text-gold-500" /><span className="h-px flex-1 bg-slate-300" /></div>
                        <span className={f.transit_count ? 'text-amber-700' : 'text-emerald-700'}>{f.transit_count ? `${f.transit_count} transit` : 'Langsung'}</span>
                    </div>
                    <div className="text-center">
                        <p className="text-xl font-bold">{time(f.arrive_at)}</p>
                        <p className="text-xs font-semibold text-slate-500">{f.destination_code}</p>
                    </div>
                </div>
                <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-3 lg:w-56 lg:flex-col lg:items-end lg:border-0 lg:pt-0">
                    <div className="lg:text-right">
                        <p className="text-lg font-bold text-brand-700">{rupiah(f.price)}<span className="text-xs font-normal text-slate-500">/org</span></p>
                        {pax > 1 && <p className="text-xs text-slate-500">Total {rupiah(f.price * pax)}</p>}
                    </div>
                    {action}
                </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-dashed border-slate-200 pt-3 text-xs text-slate-500">
                <span>{date(f.depart_at, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
                <span className="flex items-center gap-1"><Luggage className="h-3.5 w-3.5" />Bagasi {f.baggage_kg} kg + kabin {f.cabin_baggage_kg} kg</span>
                <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />Sisa {f.seats_available} kursi</span>
                {f.transit_info && <span>{f.transit_info}</span>}
            </div>
        </div>
    );
}
