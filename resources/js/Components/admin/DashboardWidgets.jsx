import { CalendarDays, ChevronLeft, ChevronRight, Clock, MapPin } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/Components/landing/lib';

const TZ = 'Asia/Jakarta';
const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const panel = 'rounded-3xl border border-white bg-gradient-to-br from-white/90 via-white/80 to-white/65 shadow-[0_10px_30px_-16px_rgba(11,77,42,0.3),inset_0_1px_0_#fff]';

/** Waktu sekarang, diperbarui tiap detik. */
function useNow() {
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const t = window.setInterval(() => setNow(new Date()), 1000);
        return () => window.clearInterval(t);
    }, []);
    return now;
}

/** Tanggal hari ini menurut WIB → { y, m (0-11), d } */
function todayWib(now) {
    const [y, m, d] = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now).split('-').map(Number);
    return { y, m: m - 1, d };
}

/** Kalender bulanan: hari ini ditandai, geser bulan dengan ‹ ›, klik judul untuk kembali ke bulan ini. */
export function CalendarCard({ className }) {
    const now = useNow();
    const today = todayWib(now);
    const [view, setView] = useState({ y: today.y, m: today.m });

    const cells = useMemo(() => {
        const first = new Date(view.y, view.m, 1).getDay();
        const days = new Date(view.y, view.m + 1, 0).getDate();
        const prevDays = new Date(view.y, view.m, 0).getDate();
        const total = Math.ceil((first + days) / 7) * 7;
        return Array.from({ length: total }, (_, i) => {
            const n = i - first + 1;
            if (n < 1) return { d: prevDays + n, out: true };
            if (n > days) return { d: n - days, out: true };
            return { d: n, out: false, today: view.y === today.y && view.m === today.m && n === today.d, sunday: i % 7 === 0 };
        });
    }, [view, today.y, today.m, today.d]);

    const shift = (step) => setView(({ y, m }) => { const t = new Date(y, m + step, 1); return { y: t.getFullYear(), m: t.getMonth() }; });
    const label = new Date(view.y, view.m, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    const isCurrent = view.y === today.y && view.m === today.m;

    return (
        <section className={cn(panel, 'p-4', className)}>
            <h2 className="flex items-center gap-2 font-jakarta text-base font-extrabold tracking-tight"><CalendarDays className="h-5 w-5 text-primary-700" aria-hidden="true" />Kalender</h2>
            <div className="mt-3 flex items-center justify-between">
                <button type="button" onClick={() => shift(-1)} aria-label="Bulan sebelumnya" className="grid h-7 w-7 place-items-center rounded-full text-neutral-600 hover:bg-primary-50 hover:text-primary-700"><ChevronLeft className="h-4 w-4" /></button>
                <button type="button" onClick={() => setView({ y: today.y, m: today.m })} disabled={isCurrent} title={isCurrent ? undefined : 'Kembali ke bulan ini'}
                    className="rounded-lg px-2 text-sm font-bold capitalize text-neutral-900 enabled:hover:text-primary-700">{label}</button>
                <button type="button" onClick={() => shift(1)} aria-label="Bulan berikutnya" className="grid h-7 w-7 place-items-center rounded-full text-neutral-600 hover:bg-primary-50 hover:text-primary-700"><ChevronRight className="h-4 w-4" /></button>
            </div>
            <div className="mt-2 grid grid-cols-7 rounded-lg bg-primary-50 py-1 text-center text-xs font-bold text-primary-900">
                {DAYS.map((d) => <span key={d}>{d}</span>)}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-y-0.5 text-center text-sm">
                {cells.map((c, i) => (
                    <span key={i} aria-current={c.today ? 'date' : undefined}
                        className={cn('mx-auto grid h-7 w-8 place-items-center rounded-full tabular-nums',
                            c.out ? 'text-neutral-600/40' : c.today ? 'bg-gradient-to-r from-primary-700 to-primary-900 font-extrabold text-white shadow-md shadow-primary-700/30' : c.sunday ? 'font-semibold text-red-600' : 'font-medium text-neutral-900')}>
                        {c.d}
                    </span>
                ))}
            </div>
        </section>
    );
}

/** Jam digital WIB real-time + hari & tanggal. */
export function ClockCard({ className }) {
    const now = useNow();
    const time = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(now);
    const day = new Intl.DateTimeFormat('id-ID', { timeZone: TZ, weekday: 'long' }).format(now);
    const date = new Intl.DateTimeFormat('id-ID', { timeZone: TZ, day: 'numeric', month: 'long', year: 'numeric' }).format(now);

    return (
        <section className={cn(panel, 'flex flex-col p-4', className)}>
            <h2 className="flex items-center gap-2 border-b border-primary-900/10 pb-3 font-jakarta text-base font-extrabold tracking-tight"><Clock className="h-5 w-5 text-primary-700" aria-hidden="true" />Jam Sekarang</h2>
            <div className="flex flex-1 flex-col items-center justify-center py-4 text-center">
                <time className="font-jakarta text-[clamp(2rem,2.6vw,2.6rem)] font-extrabold tabular-nums leading-none tracking-tight text-neutral-900" aria-live="off">{time}</time>
                <p className="mt-2 text-sm text-neutral-600">{day}, <span className="font-semibold text-neutral-900">{date}</span></p>
            </div>
            <p className="mx-auto flex items-center gap-1.5 rounded-xl bg-primary-50 px-4 py-2 text-xs font-bold text-primary-900">
                <MapPin className="h-4 w-4 text-primary-700" aria-hidden="true" />WIB (UTC+7)
            </p>
        </section>
    );
}
