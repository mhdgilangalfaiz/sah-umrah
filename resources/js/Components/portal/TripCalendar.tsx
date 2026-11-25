import { Link } from '@inertiajs/react';
import { CalendarDays, ChevronLeft, ChevronRight, CircleDollarSign, Landmark, Plane, Stamp, TimerReset } from 'lucide-react';
import { useMemo, useState } from 'react';
import { cn, formatDate, formatRupiah } from '@/Components/landing/lib';
import PortalCard from './PortalCard';
import type { CalendarEvent } from './types';

const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
/** Penanda per jenis jadwal: warna titik di tanggal + ikon di rincian & legenda */
const TYPE = {
    umrah: { dot: 'bg-primary-700', icon: Landmark, tone: 'bg-primary-100 text-primary-700', label: 'Paket umrah' },
    flight: { dot: 'bg-sky-500', icon: Plane, tone: 'bg-sky-100 text-sky-700', label: 'Tiket pesawat' },
    visa: { dot: 'bg-violet-500', icon: Stamp, tone: 'bg-violet-100 text-violet-700', label: 'Visa' },
    installment: { dot: 'bg-red-500', icon: CircleDollarSign, tone: 'bg-red-100 text-red-600', label: 'Jatuh tempo cicilan' },
    deadline: { dot: 'bg-gold-500', icon: TimerReset, tone: 'bg-gold-100 text-amber-700', label: 'Batas pelunasan' },
} as const;
const TRAVEL = ['umrah', 'flight'] as const;

/** "2026-11-24" menurut WIB */
const todayIso = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
const iso = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

/**
 * Kalender bulanan dengan tanggal penting jamaah ditandai titik warna.
 * Klik tanggal → rincian di bawahnya; ringkasan "H-xx" keberangkatan & cicilan berikutnya.
 */
export default function TripCalendar({ events }: { events: CalendarEvent[] }) {
    const today = todayIso();
    const upcoming = events.filter((e) => e.date >= today);
    const firstFocus = upcoming[0]?.date ?? today;
    const [view, setView] = useState(() => ({ y: Number(firstFocus.slice(0, 4)), m: Number(firstFocus.slice(5, 7)) - 1 }));
    const [selected, setSelected] = useState(firstFocus);

    const byDate = useMemo(() => events.reduce<Record<string, CalendarEvent[]>>((acc, e) => { (acc[e.date] ??= []).push(e); return acc; }, {}), [events]);

    const cells = useMemo(() => {
        const first = new Date(view.y, view.m, 1).getDay();
        const days = new Date(view.y, view.m + 1, 0).getDate();
        return Array.from({ length: Math.ceil((first + days) / 7) * 7 }, (_, i) => {
            const d = i - first + 1;
            return d >= 1 && d <= days ? iso(view.y, view.m, d) : null;
        });
    }, [view]);

    const shift = (step: number) => setView(({ y, m }) => { const t = new Date(y, m + step, 1); return { y: t.getFullYear(), m: t.getMonth() }; });
    const nextDeparture = upcoming.find((e) => (TRAVEL as readonly string[]).includes(e.type) && !/kembali|pulang/i.test(e.title));
    const nextPayment = events.find((e) => (e.type === 'installment' || e.type === 'deadline') && (e.date >= today || e.overdue));
    const dayEvents = byDate[selected] ?? [];

    return (
        <PortalCard title="Kalender Perjalanan Saya" icon={CalendarDays}>
            {/* ringkasan */}
            <div className="mb-4 grid grid-cols-2 gap-2">
                <div className="rounded-2xl bg-primary-50 p-3">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-primary-700">Keberangkatan</p>
                    <p className="font-jakarta text-lg font-extrabold text-neutral-900">{nextDeparture ? `H-${daysBetween(today, nextDeparture.date)}` : '–'}</p>
                    <p className="truncate text-xs text-neutral-600">{nextDeparture ? `${formatDate(nextDeparture.date)} · ${TYPE[nextDeparture.type].label}` : 'Belum ada jadwal'}</p>
                </div>
                <div className={cn('rounded-2xl p-3', nextPayment?.overdue ? 'bg-red-50' : 'bg-gold-100/60')}>
                    <p className={cn('text-[11px] font-bold uppercase tracking-wide', nextPayment?.overdue ? 'text-red-600' : 'text-amber-700')}>{nextPayment?.overdue ? 'Terlambat bayar' : 'Bayar berikutnya'}</p>
                    <p className="font-jakarta text-lg font-extrabold text-neutral-900">{nextPayment?.amount ? formatRupiah(nextPayment.amount) : nextPayment ? 'Pelunasan' : '–'}</p>
                    <p className="truncate text-xs text-neutral-600">{nextPayment ? formatDate(nextPayment.date) : 'Tidak ada tagihan'}</p>
                </div>
            </div>

            {/* kalender */}
            <div className="flex items-center justify-between">
                <button type="button" onClick={() => shift(-1)} aria-label="Bulan sebelumnya" className="grid h-8 w-8 place-items-center rounded-full text-neutral-600 hover:bg-primary-50 hover:text-primary-700"><ChevronLeft className="h-4 w-4" /></button>
                <p className="text-sm font-bold capitalize text-neutral-900">{new Date(view.y, view.m, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</p>
                <button type="button" onClick={() => shift(1)} aria-label="Bulan berikutnya" className="grid h-8 w-8 place-items-center rounded-full text-neutral-600 hover:bg-primary-50 hover:text-primary-700"><ChevronRight className="h-4 w-4" /></button>
            </div>
            <div className="mt-2 grid grid-cols-7 rounded-lg bg-primary-50 py-1 text-center text-xs font-bold text-primary-900">{DAYS.map((d) => <span key={d}>{d}</span>)}</div>
            <div className="mt-1 grid grid-cols-7 gap-y-1 text-center text-sm">
                {cells.map((date, i) => {
                    if (!date) return <span key={i} />;
                    const evs = byDate[date] ?? [];
                    const isToday = date === today;
                    return (
                        <button key={date} type="button" onClick={() => setSelected(date)} aria-pressed={selected === date}
                            aria-label={`${formatDate(date)}${evs.length ? `, ${evs.map((e) => e.title).join(', ')}` : ''}`}
                            className={cn('relative mx-auto grid h-9 w-9 place-items-center rounded-full tabular-nums transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
                                selected === date ? 'bg-gradient-to-r from-primary-700 to-primary-900 font-extrabold text-white shadow-md' : isToday ? 'font-extrabold text-primary-700 ring-2 ring-primary-500' : evs.length ? 'font-bold text-neutral-900 hover:bg-primary-50' : 'text-neutral-900/70 hover:bg-primary-50')}>
                            {Number(date.slice(8))}
                            {evs.length > 0 && (
                                <span className="absolute -bottom-0.5 left-1/2 flex -translate-x-1/2 gap-0.5" aria-hidden="true">
                                    {[...new Set(evs.map((e) => e.type))].map((t) => <span key={t} className={cn('h-2 w-2 rounded-full ring-2 ring-white', TYPE[t].dot, evs.some((e) => e.type === t && e.overdue) && 'bg-red-700')} />)}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* rincian tanggal terpilih */}
            <div className="mt-4 border-t border-primary-900/10 pt-3">
                <p className="mb-2 text-xs font-bold text-neutral-600">{formatDate(selected)}{selected === today && ' · Hari ini'}</p>
                {dayEvents.length === 0 ? <p className="text-sm text-neutral-600">Tidak ada jadwal di tanggal ini.</p> : (
                    <ul className="space-y-2">
                        {dayEvents.map((e, i) => {
                            const t = TYPE[e.type];
                            const Icon = t.icon;
                            return (
                                <li key={i}>
                                    <Link href={e.url} className="flex items-center gap-3 rounded-2xl border border-primary-100 bg-white p-3 transition hover:shadow-md">
                                        <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-full', e.overdue ? 'bg-red-100 text-red-600' : t.tone)}><Icon className="h-4 w-4" /></span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-sm font-bold text-neutral-900">{e.title}{e.overdue && <span className="ml-1.5 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">Terlambat</span>}</span>
                                            <span className="block truncate text-xs text-neutral-600">{e.detail}</span>
                                        </span>
                                        {e.amount ? <span className="shrink-0 whitespace-nowrap text-sm font-extrabold text-neutral-900">{formatRupiah(e.amount)}</span> : null}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-neutral-600">
                {Object.values(TYPE).map((t) => <span key={t.label} className="flex items-center gap-1.5"><span className={cn('h-2.5 w-2.5 rounded-full', t.dot)} /><t.icon className="h-3 w-3 text-neutral-500" aria-hidden="true" />{t.label}</span>)}
            </div>
        </PortalCard>
    );
}
