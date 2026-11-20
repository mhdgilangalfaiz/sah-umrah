import { Link } from '@inertiajs/react';
import { AlertTriangle, CalendarClock, ClipboardList, Clock, Landmark, ShieldAlert, Ticket, Users, Wallet, Stamp } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import AdminLayout from '@/Layouts/AdminLayout';
import { Card, Stat, cx } from '@/Components/ui';
import { date, rupiah, shortRupiah } from '@/lib/format';

const urgency = (d) => (d <= 1 ? ['H-1', 'bg-red-600 text-white'] : d <= 7 ? ['H-7', 'bg-orange-500 text-white'] : d <= 30 ? ['H-30', 'bg-amber-300 text-amber-950'] : [`H-${d}`, 'bg-slate-100 text-slate-600']);

export default function Dashboard({ stats, chart, departures, recentPayments, alerts }) {
    return (
        <AdminLayout title="Dashboard">
            {alerts.length > 0 && (
                <Link href={route('admin.finance.bank.index')} className="mb-6 flex items-start gap-3 rounded-2xl bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200">
                    <ShieldAlert className="h-5 w-5 shrink-0" />
                    <div><p className="font-semibold">{alerts.length} peringatan keamanan keuangan belum ditangani</p><p>{alerts[0].message}</p></div>
                </Link>
            )}
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                <Stat label="Omzet bulan ini" value={shortRupiah(stats.revenue_month)} icon={Wallet} sub={`Total ${shortRupiah(stats.revenue_total)}`} />
                <Stat label="Total pesanan" value={stats.orders.umrah + stats.orders.tiket + stats.orders.visa} icon={ClipboardList} tone="blue" sub={`${stats.orders.umrah} umrah · ${stats.orders.tiket} tiket · ${stats.orders.visa} visa`} />
                <Stat label="Pembayaran pending" value={stats.pending_payments} icon={Clock} tone="gold" sub={`Piutang ${shortRupiah(stats.outstanding)}`} />
                <Stat label="Sisa kuota" value={stats.quota_remaining} icon={Users} tone="slate" sub={stats.overdue ? `${stats.overdue} pesanan terlambat bayar` : 'Semua kursi mendatang'} />
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
                <Card title="Omzet 6 bulan terakhir per layanan">
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chart} margin={{ left: 0, right: 8 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="bulan" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                <YAxis tickFormatter={(v) => shortRupiah(v).replace('Rp', '')} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={60} />
                                <Tooltip formatter={(v) => rupiah(v)} cursor={{ fill: '#f4f1e8' }} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }} />
                                <Legend wrapperStyle={{ fontSize: 12 }} />
                                <Bar dataKey="umrah" name="Umrah" stackId="a" fill="#0B5D3B" radius={[0, 0, 0, 0]} />
                                <Bar dataKey="tiket" name="Tiket" stackId="a" fill="#C9A24B" />
                                <Bar dataKey="visa" name="Visa" stackId="a" fill="#7bbd9a" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card title="Keberangkatan 45 hari ke depan" actions={<Link href={route('admin.departures.index')} className="text-sm text-brand-700">Semua</Link>}>
                    {departures.length === 0 ? <p className="text-sm text-slate-500">Tidak ada keberangkatan dekat.</p> : (
                        <ul className="space-y-3">
                            {departures.map((d) => {
                                const [label, cls] = urgency(d.days_left);
                                return (
                                    <li key={d.id} className="flex items-center gap-3">
                                        <span className={cx('w-14 shrink-0 rounded-lg py-1 text-center text-xs font-bold', cls)}>{label}</span>
                                        <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{d.package}</p><p className="text-xs text-slate-500">{date(d.date)} · {d.booked}/{d.quota} jamaah</p></div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                    <p className="mt-4 flex flex-wrap gap-2 text-[11px] text-slate-500"><span className="rounded bg-red-600 px-1.5 text-white">H-1</span><span className="rounded bg-orange-500 px-1.5 text-white">≤H-7</span><span className="rounded bg-amber-300 px-1.5">≤H-30</span></p>
                </Card>
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
                <Card title="Pembayaran terbaru" pad={false} actions={<Link href={route('admin.payments.index')} className="text-sm text-brand-700">Semua</Link>}>
                    <div className="overflow-x-auto"><table className="table-app">
                        <thead><tr><th>Kode</th><th>Pelanggan</th><th>Metode</th><th className="!text-right">Nominal</th><th>Waktu</th></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                            {recentPayments.length === 0 && <tr><td colSpan={5} className="text-center text-slate-400">Belum ada pembayaran</td></tr>}
                            {recentPayments.map((p) => <tr key={p.code}><td className="font-medium">{p.code}</td><td>{p.user}</td><td>{p.method}</td><td className="text-right font-semibold">{rupiah(p.amount)}</td><td>{p.paid_at}</td></tr>)}
                        </tbody>
                    </table></div>
                </Card>
                <Card title="Akses cepat">
                    <div className="grid grid-cols-2 gap-3">
                        {[['admin.bookings.index', Landmark, 'Pesanan Umrah'], ['admin.visa.index', Stamp, 'Pengajuan Visa'], ['admin.flight-orders.index', Ticket, 'Pesanan Tiket'], ['admin.departures.index', CalendarClock, 'Keberangkatan']].map(([r, Icon, l]) => (
                            <Link key={r} href={route(r)} className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 p-4 text-center text-sm font-medium hover:border-brand-600 hover:text-brand-700"><Icon className="h-5 w-5 text-gold-500" />{l}</Link>
                        ))}
                    </div>
                    {stats.overdue > 0 && <Link href={route('admin.bookings.index', { terlambat: 1 })} className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700"><AlertTriangle className="h-4 w-4" />{stats.overdue} pesanan melewati batas pelunasan</Link>}
                </Card>
            </div>
        </AdminLayout>
    );
}
