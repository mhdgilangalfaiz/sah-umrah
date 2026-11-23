import { Link, usePage } from '@inertiajs/react';
import {
    AlertTriangle, BarChart3, BookUser, CalendarDays, ChevronRight, LayoutGrid, Package, Receipt, ShieldAlert, Stamp, Ticket, UserCog, Wallet,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { cn } from '@/Components/landing/lib';
import { Reveal, Stagger, StaggerItem } from '@/Components/landing/motion';
import AdminLayout from '@/Layouts/AdminLayout';
import { date, rupiah, shortRupiah } from '@/lib/format';

const urgency = (d) => (d <= 1 ? ['H-1', 'bg-red-600 text-white'] : d <= 7 ? ['H-7', 'bg-orange-500 text-white'] : d <= 15 ? ['H-15', 'bg-yellow-300 text-yellow-950'] : d <= 30 ? ['H-30', 'bg-emerald-200 text-emerald-900'] : [`H-${d}`, 'bg-slate-100 text-slate-600']);
const panel = 'rounded-3xl border border-white bg-gradient-to-br from-white/90 via-white/80 to-white/65 shadow-[0_10px_30px_-16px_rgba(11,77,42,0.3),inset_0_1px_0_#fff]';

function PanelHead({ icon: Icon, title, action }) {
    return (
        <div className="relative z-10 flex items-center justify-between gap-3 border-b border-primary-900/10 px-5 py-4">
            <h2 className="flex items-center gap-2.5 font-jakarta text-base font-extrabold tracking-tight sm:text-lg"><Icon className="h-5 w-5 text-primary-700" aria-hidden="true" />{title}</h2>
            {action}
        </div>
    );
}
const seeAll = (href) => <Link href={href} className="flex items-center gap-0.5 text-sm font-bold text-primary-700 hover:underline">Semua <ChevronRight className="h-4 w-4" /></Link>;

export default function Dashboard({ stats, chart, departures, recentPayments, alerts }) {
    const isAdmin = usePage().props.auth.user.role === 'admin'; // Super Admin: hanya lihat pembelian & laporan
    const orders = stats.orders.umrah + stats.orders.tiket + stats.orders.visa;

    const cards = [
        ['Omzet bulan ini', shortRupiah(stats.revenue_month), `Total ${shortRupiah(stats.revenue_total)}`, '/images/admin/omzet.webp', route('admin.reports.index'), 'from-[#E7F4EA]', 'bg-primary-500'],
        ['Total pesanan', orders, 'Umrah · Tiket · Visa', '/images/admin/pesanan.webp', route('admin.bookings.index'), 'from-[#E6F1FB]', 'bg-sky-400'],
        ['Pembayaran pending', stats.pending_payments, `Piutang ${shortRupiah(stats.outstanding)}`, '/images/admin/pembayaran.webp', route('admin.payments.index'), 'from-[#FBF3E2]', 'bg-amber-400'],
        ['Sisa kuota', stats.quota_remaining, stats.overdue ? `${stats.overdue} pesanan terlambat bayar` : 'Semua kursi mendatang', '/images/admin/kuota.webp', route(isAdmin ? 'admin.departures.index' : 'admin.bookings.index'), 'from-[#F0ECFB]', 'bg-violet-400'],
    ];

    const shortcuts = isAdmin
        ? [['Kelola Jamaah', 'admin.jamaah.index', BookUser], ['Kelola Keberangkatan', 'admin.departures.index', CalendarDays], ['Kelola Paket Umrah', 'admin.packages.index', Package], ['Laporan & Rekap', 'admin.reports.index', BarChart3]]
        : [['Pengajuan Visa', 'admin.visa.index', Stamp], ['Pesanan Tiket', 'admin.flight-orders.index', Ticket], ['Laporan Invoice', 'admin.invoices.index', Receipt], ['Akun Admin', 'admin.admins.index', UserCog]];

    return (
        <AdminLayout title="Dashboard">
            {isAdmin && alerts.length > 0 && (
                <Link href={route('admin.finance.bank.index')} className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50/95 p-4 text-sm text-red-800">
                    <ShieldAlert className="h-5 w-5 shrink-0" /><div><p className="font-bold">{alerts.length} peringatan keamanan keuangan belum ditangani</p><p>{alerts[0].message}</p></div>
                </Link>
            )}

            <Stagger gap={0.08} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {cards.map(([label, value, sub, img, href, from, accent]) => (
                    <StaggerItem key={label}>
                        <Link href={href} className={cn(panel, 'group relative flex h-full min-h-[120px] items-stretch overflow-hidden bg-gradient-to-br to-white transition hover:-translate-y-0.5', from)}>
                            <img src={img} alt="" className="w-[27%] max-w-[118px] shrink-0 object-cover [mask-image:linear-gradient(to_right,#000_70%,transparent)]" />
                            <span className="min-w-0 flex-1 py-4 pl-2 pr-9">
                                <span className="block text-[11px] font-extrabold uppercase tracking-wider text-neutral-600">{label}</span>
                                <span className="mt-1 block whitespace-nowrap font-jakarta text-[clamp(1.15rem,1.75vw,1.9rem)] font-extrabold leading-none tracking-tight">{value}</span>
                                <span className="mt-1.5 block truncate text-xs text-neutral-600">{sub}</span>
                            </span>
                            <ChevronRight className="absolute right-2.5 top-1/2 h-7 w-7 -translate-y-1/2 rounded-full bg-white/80 p-1.5 text-primary-700 shadow-sm transition group-hover:translate-x-0.5" aria-hidden="true" />
                            <span className={cn('absolute inset-x-0 bottom-0 h-1 opacity-70', accent)} aria-hidden="true" />
                        </Link>
                    </StaggerItem>
                ))}
            </Stagger>

            <div className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
                <Reveal delay={0.1} className={panel}>
                    <PanelHead icon={BarChart3} title="Omzet 6 bulan terakhir per layanan" />
                    <div className="h-72 p-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chart} margin={{ left: 0, right: 8, top: 8 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#dfe9e2" />
                                <XAxis dataKey="bulan" tick={{ fontSize: 12, fill: '#555' }} axisLine={false} tickLine={false} />
                                <YAxis tickFormatter={(v) => shortRupiah(v).replace('Rp', '')} tick={{ fontSize: 11, fill: '#555' }} axisLine={false} tickLine={false} width={56} />
                                <Tooltip formatter={(v) => rupiah(v)} cursor={{ fill: '#FDF3D7' }} contentStyle={{ borderRadius: 12, border: '1px solid #E8F3EC' }} />
                                <Legend wrapperStyle={{ fontSize: 12 }} iconType="square" />
                                <Bar dataKey="tiket" name="Tiket" stackId="a" fill="#E8B923" />
                                <Bar dataKey="umrah" name="Umrah" stackId="a" fill="#0B4D2A" />
                                <Bar dataKey="visa" name="Visa" stackId="a" fill="#8FD19E" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Reveal>

                <Reveal delay={0.15} className={cn(panel, 'relative overflow-hidden')}>
                    <PanelHead icon={CalendarDays} title="Keberangkatan 45 hari ke depan" action={isAdmin && seeAll(route('admin.departures.index'))} />
                    <img src="/images/admin/nabawi-ilustrasi.webp" alt="" aria-hidden="true" className="pointer-events-none absolute bottom-0 right-0 w-[45%] max-w-[240px] opacity-90 sm:w-[55%] [mask-image:linear-gradient(to_left,#000_60%,transparent)]" />
                    <div className="relative p-5">
                        {departures.length === 0 ? <p className="text-sm text-neutral-600">Tidak ada keberangkatan dekat.</p> : (
                            <ul className="space-y-3">
                                {departures.map((d) => {
                                    const [label, cls] = urgency(d.days_left);
                                    return (
                                        <li key={d.id} className="flex items-center gap-3">
                                            <span className={cn('w-14 shrink-0 rounded-lg py-1 text-center text-xs font-bold', cls)}>{label}</span>
                                            <div className="min-w-0"><p className="truncate text-sm font-semibold">{d.package}</p><p className="text-xs text-neutral-600">{date(d.date)} · {d.booked}/{d.quota} jamaah</p></div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                        <p className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
                            {[['H-1', 'bg-red-600 text-white'], ['H-7', 'bg-orange-500 text-white'], ['H-15', 'bg-yellow-300'], ['H-30', 'bg-emerald-200']].map(([l, c]) => <span key={l} className={cn('rounded-md px-2 py-0.5', c)}>{l}</span>)}
                        </p>
                    </div>
                </Reveal>
            </div>

            <div className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
                <Reveal delay={0.2} className={panel}>
                    <PanelHead icon={Wallet} title="Pembayaran terbaru" action={seeAll(route('admin.payments.index'))} />
                    <div className="overflow-x-auto p-3">
                        <table className="w-full min-w-[560px] text-sm">
                            <thead><tr className="bg-primary-50 text-left text-xs font-bold uppercase tracking-wide text-neutral-600">
                                <th className="rounded-l-xl px-3 py-2.5">Kode</th><th className="px-3 py-2.5">Pelanggan</th><th className="px-3 py-2.5">Metode</th><th className="px-3 py-2.5 text-right">Nominal</th><th className="rounded-r-xl px-3 py-2.5">Waktu</th>
                            </tr></thead>
                            <tbody className="divide-y divide-primary-900/5">
                                {recentPayments.length === 0 && (
                                    <tr><td colSpan={5} className="py-10 text-center text-neutral-600"><Wallet className="mx-auto mb-2 h-10 w-10 text-neutral-600/40" />Belum ada pembayaran</td></tr>
                                )}
                                {recentPayments.map((p) => (
                                    <tr key={p.code}><td className="px-3 py-2.5 font-semibold">{p.code}</td><td className="px-3 py-2.5">{p.user}</td><td className="px-3 py-2.5">{p.method}</td><td className="px-3 py-2.5 text-right font-bold">{rupiah(p.amount)}</td><td className="px-3 py-2.5 text-neutral-600">{p.paid_at}</td></tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Reveal>

                <Reveal delay={0.25} className={panel}>
                    <PanelHead icon={LayoutGrid} title="Menu Utama" />
                    {/* Ubin seragam: ikon di atas, label di bawah — tinggi sama walau label 2 baris */}
                    <div className="grid auto-rows-fr grid-cols-2 gap-3 p-4">
                        {shortcuts.map(([label, r, Icon]) => (
                            <Link key={r} href={route(r)}
                                className="group relative flex min-w-0 flex-col items-start gap-3 rounded-2xl border border-primary-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary-500/40 hover:shadow-md">
                                <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-50 text-primary-700 transition group-hover:bg-primary-700 group-hover:text-white">
                                    <Icon className="h-5 w-5" aria-hidden="true" />
                                </span>
                                <span className="min-w-0 pr-4 text-sm font-bold leading-snug text-neutral-900">{label}</span>
                                <ChevronRight className="absolute right-3 top-4 h-4 w-4 text-neutral-600/60 transition group-hover:translate-x-0.5 group-hover:text-primary-700" aria-hidden="true" />
                            </Link>
                        ))}
                    </div>
                    {stats.overdue > 0 && (
                        <Link href={route('admin.bookings.index', { terlambat: 1 })} className="mx-4 mb-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">
                            <AlertTriangle className="h-4 w-4" />{stats.overdue} pesanan melewati batas pelunasan
                        </Link>
                    )}
                </Reveal>
            </div>
        </AdminLayout>
    );
}
