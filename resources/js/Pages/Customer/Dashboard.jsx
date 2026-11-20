import { Link, router } from '@inertiajs/react';
import { AlertTriangle, CalendarClock, FileWarning, Landmark, Plane, Stamp, Wallet } from 'lucide-react';
import CustomerLayout from '@/Layouts/CustomerLayout';
import { Card, Empty, Progress, Stat, StatusBadge, cx } from '@/Components/ui';
import { date, rupiah } from '@/lib/format';

export default function Dashboard({ stats, activeBookings, nextInstallments, notifications, visas }) {
    return (
        <CustomerLayout title="Dashboard">
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                <Stat label="Umrah" value={stats.bookings} icon={Landmark} />
                <Stat label="Tiket" value={stats.flights} icon={Plane} tone="blue" />
                <Stat label="Visa" value={stats.visas} icon={Stamp} tone="gold" />
                <Stat label="Sisa tagihan" value={rupiah(stats.outstanding)} icon={Wallet} tone={stats.outstanding ? 'red' : 'slate'} />
            </div>

            {stats.documents_pending > 0 && (
                <Link href={route('customer.documents.index')} className="mt-4 flex items-center gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
                    <FileWarning className="h-5 w-5 shrink-0" />{stats.documents_pending} dokumen belum terverifikasi. Pastikan dokumen lengkap sebelum keberangkatan →
                </Link>
            )}

            <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
                <Card title="Perjalanan umrah aktif" actions={<Link href={route('packages.index')} className="text-sm font-medium text-brand-700">+ Pesan paket</Link>}>
                    {activeBookings.length === 0 ? <Empty title="Belum ada perjalanan aktif" text="Temukan paket umrah yang sesuai untuk Anda dan keluarga." action={<Link href={route('packages.index')} className="btn-primary">Lihat Paket Umrah</Link>} /> : (
                        <div className="space-y-4">
                            {activeBookings.map((b) => (
                                <Link key={b.code} href={route('customer.bookings.show', b.code)} className={cx('block rounded-2xl border p-4 transition hover:shadow-soft', b.overdue ? 'border-red-200 bg-red-50/40' : 'border-slate-200')}>
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                        <div><p className="font-semibold">{b.package}</p><p className="text-xs text-slate-500">{b.code} · berangkat {date(b.departure_date)}</p></div>
                                        <StatusBadge status={b.status} />
                                    </div>
                                    <div className="mt-3 flex items-center gap-3">
                                        <Progress value={(b.paid / b.total) * 100} />
                                        <span className="shrink-0 text-xs font-semibold text-slate-600">{Math.round((b.paid / b.total) * 100)}%</span>
                                    </div>
                                    <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-slate-500">
                                        <span>Dibayar {rupiah(b.paid)} dari {rupiah(b.total)}</span>
                                        {b.days_left >= 0 && <span className="flex items-center gap-1 font-medium text-brand-700"><CalendarClock className="h-3.5 w-3.5" />H-{b.days_left}</span>}
                                    </div>
                                    {b.overdue && <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-red-700"><AlertTriangle className="h-3.5 w-3.5" />Melewati batas pelunasan — sisa {rupiah(b.outstanding)}</p>}
                                </Link>
                            ))}
                        </div>
                    )}
                </Card>

                <div className="space-y-6">
                    <Card title="Jadwal cicilan terdekat">
                        {nextInstallments.length === 0 ? <p className="text-sm text-slate-500">Tidak ada tagihan cicilan.</p> : (
                            <ul className="divide-y divide-slate-100">
                                {nextInstallments.map((i) => (
                                    <li key={i.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                                        <div><p className="font-medium">{i.label} · {i.booking.code}</p><p className="text-xs text-slate-500">Jatuh tempo {date(i.due_date)}</p></div>
                                        <div className="text-right"><p className="font-semibold">{rupiah(i.amount - i.paid_amount)}</p><StatusBadge status={i.status} /></div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Card>
                    <Card title="Notifikasi terbaru" actions={<Link href={route('notifications.index')} className="text-sm text-brand-700">Semua</Link>}>
                        {notifications.length === 0 ? <p className="text-sm text-slate-500">Belum ada notifikasi.</p> : (
                            <ul className="space-y-3">
                                {notifications.map((n) => (
                                    <li key={n.id}>
                                        <button onClick={() => router.post(route('notifications.read', n.id))} className="w-full text-left">
                                            <p className={cx('text-sm', n.read_at ? 'text-slate-600' : 'font-semibold text-slate-900')}>{n.data.title}</p>
                                            <p className="text-xs text-slate-400">{n.created_at}</p>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Card>
                    {visas.length > 0 && (
                        <Card title="Visa">
                            <ul className="divide-y divide-slate-100">
                                {visas.map((v) => (
                                    <li key={v.id}><Link href={route('customer.visa.show', v.code)} className="flex items-center justify-between py-3 text-sm"><span>{v.code} · {v.pax_count} org</span><StatusBadge status={v.status} /></Link></li>
                                ))}
                            </ul>
                        </Card>
                    )}
                </div>
            </div>
        </CustomerLayout>
    );
}
