import { Link, router } from '@inertiajs/react';
import { Bell, CalendarDays, ChevronRight, CreditCard, Info, MessageSquareText, Plane, ShoppingBag, type LucideIcon } from 'lucide-react';
import { cn, formatDate, formatRupiah } from '@/Components/landing/lib';
import PortalCard from './PortalCard';
import type { DashboardNotification, Installment } from './types';

export function InstallmentsCard({ items }: { items: Installment[] }) {
    return (
        <PortalCard title="Jadwal Cicilan Terdekat" icon={CalendarDays}>
            {items.length === 0 ? (
                <p className="rounded-2xl bg-white/70 p-4 text-sm text-neutral-600">Tidak ada tagihan cicilan. Alhamdulillah.</p>
            ) : (
                <ul className="space-y-2.5">
                    {items.map((i) => (
                        <li key={i.id}>
                            <Link href={i.url} className="flex items-center justify-between gap-3 rounded-2xl border border-primary-100 bg-white p-4 transition hover:shadow-[0_10px_24px_-14px_rgba(11,77,42,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
                                <span className="min-w-0">
                                    <span className="block truncate text-sm font-bold text-neutral-900">{i.label} - {i.code}</span>
                                    {i.due_date && <span className={cn('block text-xs', i.overdue ? 'font-semibold text-red-600' : 'text-neutral-600')}>Jatuh tempo: {formatDate(i.due_date)}</span>}
                                </span>
                                <span className="shrink-0 text-right">
                                    <span className="block whitespace-nowrap font-jakarta text-base font-extrabold text-neutral-900">{formatRupiah(i.amount)}</span>
                                    <span className={cn('mt-1 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold', i.overdue ? 'bg-red-100 text-red-700' : 'bg-neutral-900/5 text-neutral-900')}>
                                        {i.overdue ? 'Terlambat' : 'Belum Dibayar'}
                                    </span>
                                </span>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </PortalCard>
    );
}

/** Ikon bulat per jenis notifikasi. */
const KIND: Record<string, LucideIcon> = {
    pesanan: ShoppingBag, keberangkatan: Plane, tiket: Plane, pembayaran: CreditCard, cicilan: CreditCard, refund: CreditCard,
    bantuan: MessageSquareText,
};

export function NotificationsCard({ items }: { items: DashboardNotification[] }) {
    const action = <Link href={route('notifications.index')} className="text-sm font-bold text-primary-700 hover:underline">Lihat Semua</Link>;
    return (
        <PortalCard title="Notifikasi Terbaru" icon={Bell} action={action}>
            {items.length === 0 ? (
                <p className="rounded-2xl bg-white/70 p-4 text-sm text-neutral-600">Belum ada notifikasi.</p>
            ) : (
                <ul className="divide-y divide-primary-100">
                    {items.map((n) => {
                        const Icon = KIND[n.category] ?? Info;
                        return (
                            <li key={n.id}>
                                <button type="button" onClick={() => router.post(route('notifications.read', n.id))}
                                    className="group flex w-full items-center gap-3 rounded-xl px-1 py-3 text-left transition hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
                                    <span className={cn('h-2 w-2 shrink-0 rounded-full', n.read ? 'bg-transparent' : 'bg-primary-500')} aria-label={n.read ? undefined : 'Belum dibaca'} />
                                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-100 text-primary-700"><Icon className="h-[18px] w-[18px]" aria-hidden="true" /></span>
                                    <span className="min-w-0 flex-1">
                                        <span className={cn('block truncate text-sm', n.read ? 'font-medium text-neutral-900/80' : 'font-bold text-neutral-900')}>{n.title}</span>
                                        <span className="block text-xs text-neutral-600">{n.time}</span>
                                    </span>
                                    <ChevronRight className="h-4 w-4 shrink-0 text-neutral-600 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </PortalCard>
    );
}
