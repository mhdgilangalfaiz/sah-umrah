import { Link } from '@inertiajs/react';
import { AlertTriangle, CalendarClock, CalendarDays, Landmark, Plus, Wallet } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { cn, formatDate, formatRupiah } from '@/Components/landing/lib';
import PortalCard from './PortalCard';
import type { ActiveTrip as Trip } from './types';

const STATUS_TONE: Record<string, string> = {
    menunggu_pembayaran: 'bg-amber-50 text-amber-800 ring-amber-600/20',
    cicilan_berjalan: 'bg-sky-50 text-sky-800 ring-sky-600/20',
    lunas: 'bg-emerald-50 text-emerald-800 ring-emerald-600/20',
};

export default function ActiveTrip({ trip }: { trip: Trip | null }) {
    const reduce = useReducedMotion();
    const action = (
        <Link href={route('packages.index')} className="flex shrink-0 items-center gap-1 whitespace-nowrap text-sm font-bold text-primary-700 hover:underline">
            <Plus className="h-4 w-4" aria-hidden="true" /> Pesan Paket
        </Link>
    );

    if (!trip) {
        return (
            <PortalCard title="Perjalanan Umrah Aktif" icon={Landmark} action={action}>
                <div className="flex flex-col items-center rounded-2xl border border-dashed border-primary-500/30 bg-white/60 px-6 py-10 text-center">
                    <img src="/images/landing/layanan/kaabah.webp" alt="" className="h-20 w-auto opacity-90" />
                    <p className="mt-4 font-extrabold text-neutral-900">Belum ada perjalanan aktif</p>
                    <p className="mt-1 max-w-sm text-sm text-neutral-600">Temukan paket umrah yang sesuai untuk Anda dan keluarga.</p>
                    <Link href={route('packages.index')} className="mt-5 rounded-full bg-gradient-to-r from-primary-700 to-primary-900 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-primary-700/25">
                        Lihat Paket Umrah
                    </Link>
                </div>
            </PortalCard>
        );
    }

    const pct = trip.total > 0 ? Math.min(100, Math.round((trip.paid / trip.total) * 100)) : 0;

    return (
        <PortalCard title="Perjalanan Umrah Aktif" icon={Landmark} action={action}>
            <Link href={trip.url}
                className={cn('group flex flex-col gap-4 rounded-2xl border bg-white p-3 shadow-[0_6px_20px_-12px_rgba(11,77,42,0.3)] transition hover:shadow-[0_14px_32px_-14px_rgba(11,77,42,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 sm:flex-row',
                    trip.overdue ? 'border-red-200' : 'border-primary-100')}>
                <img src={trip.image} alt={`Foto ${trip.package}`} loading="lazy" className="h-40 w-full shrink-0 rounded-xl object-cover sm:h-auto sm:w-40" />
                <div className="min-w-0 flex-1 py-1 pr-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                        <span className="rounded-lg bg-primary-100 px-2.5 py-1 text-xs font-bold text-primary-700">Paket Umrah</span>
                        <span className={cn('rounded-full px-3 py-1 text-xs font-bold ring-1', STATUS_TONE[trip.status] ?? 'bg-slate-100 text-slate-700 ring-slate-500/20')}>{trip.status_label}</span>
                    </div>
                    <h3 className="mt-2 truncate font-jakarta text-lg font-extrabold tracking-tight text-neutral-900">{trip.package}</h3>
                    <p className="text-sm font-semibold text-primary-700">{trip.code}</p>
                    <p className="mt-2 flex items-center gap-2 text-sm text-neutral-600">
                        <CalendarDays className="h-4 w-4 text-primary-500" aria-hidden="true" /> Berangkat: {formatDate(trip.departure_date)}
                    </p>

                    <div className="mt-3 flex items-center gap-3">
                        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-primary-900/10" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progres pembayaran">
                            <motion.div className="h-full origin-left rounded-full bg-gradient-to-r from-primary-500 to-primary-700"
                                initial={reduce ? false : { scaleX: 0 }} animate={{ scaleX: pct / 100 }} transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }} />
                        </div>
                        <span className="w-10 text-right text-sm font-extrabold tabular-nums text-neutral-900">{pct}%</span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                        <span className="flex items-center gap-2 text-neutral-600">
                            <Wallet className="h-4 w-4 text-primary-500" aria-hidden="true" /> Dibayar: {formatRupiah(trip.paid)} dari {formatRupiah(trip.total)}
                        </span>
                        {trip.days_left >= 0 && (
                            <span className="flex items-center gap-1.5 font-extrabold text-primary-700"><CalendarClock className="h-4 w-4" aria-hidden="true" /> H-{trip.days_left}</span>
                        )}
                    </div>
                    {trip.overdue && (
                        <p className="mt-2 flex items-center gap-1.5 text-xs font-bold text-red-600"><AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" /> Melewati batas pelunasan</p>
                    )}
                </div>
            </Link>
        </PortalCard>
    );
}
