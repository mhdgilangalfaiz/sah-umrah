import { ArrowLeftRight, ArrowRight, Clock, Luggage, Plane, PlaneLanding, PlaneTakeoff, RefreshCw } from 'lucide-react';
import { date, dateTime, rupiah, time } from '@/lib/format';
import { cx } from './ui';

export const CLASS_LABEL = { ekonomi: 'Ekonomi', bisnis: 'Bisnis', first: 'First' };

/** Status seat: warna & teks dipakai konsisten di kartu, tabel, dan panel admin. */
export function seatStatus(available, pax = 1) {
    if (available <= 0) return { label: 'Habis', tone: 'bg-slate-100 text-slate-500 ring-slate-200', bar: 'bg-slate-300', text: 'text-slate-500' };
    if (available < pax) return { label: `Sisa ${available}`, tone: 'bg-red-50 text-red-700 ring-red-200', bar: 'bg-red-500', text: 'text-red-600' };
    if (available <= 5) return { label: 'Hampir habis', tone: 'bg-red-50 text-red-700 ring-red-200', bar: 'bg-red-500', text: 'text-red-600' };
    if (available <= 15) return { label: 'Terbatas', tone: 'bg-amber-50 text-amber-800 ring-amber-200', bar: 'bg-amber-500', text: 'text-amber-700' };
    return { label: 'Tersedia', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200', bar: 'bg-emerald-500', text: 'text-emerald-700' };
}

export function TripBadges({ f, className = '' }) {
    const stops = f.itinerary?.outbound?.stops ?? f.transit_count;
    return (
        <div className={cx('flex flex-wrap gap-1.5 text-[11px] font-semibold', className)}>
            <span className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 ring-1', f.trip_type === 'pp' ? 'bg-brand-700 text-white ring-brand-700' : 'bg-white text-brand-800 ring-brand-200')}>
                {f.trip_type === 'pp' ? <><ArrowLeftRight className="h-3 w-3" />Pulang-Pergi</> : <><ArrowRight className="h-3 w-3" />Sekali Jalan</>}
            </span>
            <span className={cx('rounded-full px-2 py-0.5 ring-1', stops ? 'bg-amber-50 text-amber-800 ring-amber-200' : 'bg-emerald-50 text-emerald-700 ring-emerald-200')}>
                {stops ? `${stops}x Transit` : 'Langsung'}
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600 ring-1 ring-slate-200">{CLASS_LABEL[f.cabin_class] ?? f.cabin_class}</span>
        </div>
    );
}

/** Satu arah perjalanan: jam berangkat — garis rute dengan titik transit — jam tiba. */
export function ItineraryRow({ dir, label, icon: Icon = PlaneTakeoff }) {
    if (!dir) return null;
    const first = dir.legs[0];
    const last = dir.legs[dir.legs.length - 1];
    return (
        <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                <Icon className="h-3.5 w-3.5 text-brand-600" />{label} · {date(dir.depart_at, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
            <div className="flex items-center gap-3">
                <div className="w-16 shrink-0">
                    <p className="text-xl font-bold leading-none text-slate-900">{time(dir.depart_at)}</p>
                    <p className="mt-1 text-xs font-bold text-slate-600">{first.origin_code}</p>
                    <p className="truncate text-[11px] text-slate-400">{first.origin_city}</p>
                </div>
                <div className="flex min-w-0 flex-1 flex-col items-center">
                    <span className="flex items-center gap-1 text-[11px] text-slate-500"><Clock className="h-3 w-3" />{dir.duration}</span>
                    <div className="relative my-1.5 flex w-full items-center">
                        <span className="h-0.5 flex-1 rounded bg-brand-200" />
                        {dir.layovers.map((l) => (
                            <span key={l.code} className="flex flex-1 items-center">
                                <span className="relative grid place-items-center">
                                    <span className="h-2.5 w-2.5 rounded-full border-2 border-amber-500 bg-white" />
                                    <span className="absolute top-3 whitespace-nowrap text-[10px] font-bold text-amber-700">{l.code}</span>
                                </span>
                                <span className="h-0.5 flex-1 rounded bg-brand-200" />
                            </span>
                        ))}
                        <Plane className="ml-1 h-4 w-4 text-brand-600" />
                    </div>
                    <span className={cx('mt-2 text-center text-[11px]', dir.stops ? 'text-amber-700' : 'text-emerald-700')}>
                        {dir.stops ? dir.layovers.map((l) => `Transit di ${l.city}`).join(' · ') : 'Penerbangan langsung'}
                    </span>
                </div>
                <div className="w-16 shrink-0 text-right">
                    <p className="text-xl font-bold leading-none text-slate-900">{time(dir.arrive_at)}{dir.next_day > 0 && <sup className="ml-0.5 text-[10px] font-bold text-red-600">+{dir.next_day}</sup>}</p>
                    <p className="mt-1 text-xs font-bold text-slate-600">{last.destination_code}</p>
                    <p className="truncate text-[11px] text-slate-400">{last.destination_city}</p>
                </div>
            </div>
            <p className="mt-1.5 text-[11px] text-slate-400">{dir.legs.map((l) => `${l.flight_number || '-'} ${l.origin_code}–${l.destination_code}`).join('  ·  ')}</p>
        </div>
    );
}

/** Panel sisa seat yang menonjol (angka besar + bar alokasi bila diketahui). */
export function SeatPanel({ f, pax = 1, className = '' }) {
    const s = seatStatus(f.seats_available, pax);
    const pct = f.seats_total ? Math.max(0, Math.min(100, (f.seats_available / f.seats_total) * 100)) : null;
    return (
        <div className={cx('rounded-xl p-3 ring-1', s.tone, className)}>
            <div className="flex items-baseline justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wide">Sisa seat</span>
                <span className="text-[11px] font-semibold">{s.label}</span>
            </div>
            <p className={cx('mt-0.5 text-3xl font-extrabold leading-none tabular-nums', s.text)}>
                {Math.max(0, f.seats_available)}
                {f.seats_total ? <span className="text-sm font-semibold text-slate-400"> / {f.seats_total}</span> : <span className="text-sm font-semibold"> kursi</span>}
            </p>
            {pct !== null && <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/70"><div className={cx('h-full rounded-full', s.bar)} style={{ width: `${pct}%` }} /></div>}
        </div>
    );
}

export function SeatUpdated({ at, className = '' }) {
    if (!at) return null;
    return <span className={cx('inline-flex items-center gap-1', className)}><RefreshCw className="h-3 w-3" />Seat diperbarui {dateTime(at)}</span>;
}

/** booked: dipakai di halaman pesanan → sembunyikan stok seat publik, tampilkan jumlah seat yang dibeli */
export function FlightCard({ f, pax = 1, action, footer, booked = false }) {
    const it = f.itinerary ?? {};
    return (
        <div className={cx('card overflow-hidden', !booked && f.seats_available <= 0 && 'opacity-75')}>
            <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_240px]">
                <div className="min-w-0">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 font-bold text-brand-700">{f.airline_code || <PlaneTakeoff className="h-5 w-5" />}</div>
                            <div>
                                <p className="font-semibold text-slate-900">{f.airline}</p>
                                <p className="text-xs font-semibold text-brand-700">{f.route_label}</p>
                            </div>
                        </div>
                        <TripBadges f={f} />
                    </div>
                    <div className="space-y-4">
                        <ItineraryRow dir={it.outbound} label="Berangkat" icon={PlaneTakeoff} />
                        {it.inbound && <div className="border-t border-dashed border-slate-200 pt-4"><ItineraryRow dir={it.inbound} label="Kembali" icon={PlaneLanding} /></div>}
                    </div>
                </div>

                <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 lg:justify-center lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
                    {booked ? (
                        <div className="rounded-xl bg-brand-50 p-3 ring-1 ring-brand-100">
                            <span className="text-[11px] font-bold uppercase tracking-wide text-brand-800">Seat dipesan</span>
                            <p className="mt-0.5 text-3xl font-extrabold leading-none tabular-nums text-brand-800">{pax}<span className="text-sm font-semibold"> seat</span></p>
                        </div>
                    ) : <SeatPanel f={f} pax={pax} />}
                    <div>
                        <p className="text-[11px] text-slate-500">Harga per {booked ? 'seat' : 'orang'}{f.trip_type === 'pp' ? ' (PP)' : ''}</p>
                        <p className="text-2xl font-extrabold text-brand-800">{rupiah(f.price)}</p>
                        {pax > 1 && <p className="text-xs text-slate-500">Total {pax} {booked ? 'seat' : 'org'}: <b className="text-slate-700">{rupiah(f.price * pax)}</b></p>}
                    </div>
                    {action}
                </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-100 bg-slate-50/70 px-4 py-2.5 text-xs text-slate-500 sm:px-5">
                <span className="flex items-center gap-1"><Luggage className="h-3.5 w-3.5" />Bagasi {f.baggage_kg} kg + kabin {f.cabin_baggage_kg} kg</span>
                {!booked && <SeatUpdated at={f.seats_updated_at} />}
                {footer}
            </div>
        </div>
    );
}
