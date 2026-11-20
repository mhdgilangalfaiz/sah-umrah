import { FileDown, FileSpreadsheet, Landmark, Receipt, RotateCcw, Users, Wallet } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import AdminLayout from '@/Layouts/AdminLayout';
import FilterBar from '@/Components/FilterBar';
import { Card, PageHeader, Stat } from '@/Components/ui';
import { date, rupiah, shortRupiah } from '@/lib/format';

export default function Reports({ period, summary, byService, byMethod, daily, rows }) {
    return (
        <AdminLayout title="Laporan">
            <PageHeader title="Laporan Keuangan & Pesanan" subtitle={`Periode ${date(period.dari)} – ${date(period.sampai)}`} actions={<>
                <a href={route('admin.reports.export', { ...period, format: 'xlsx' })} className="btn-outline"><FileSpreadsheet className="h-4 w-4 text-emerald-700" />Excel</a>
                <a href={route('admin.reports.export', { ...period, format: 'pdf' })} className="btn-outline"><FileDown className="h-4 w-4 text-red-600" />PDF</a>
            </>} />
            <FilterBar routeName="admin.reports.index" filters={period} fields={[{ name: 'dari', type: 'date', label: 'Dari' }, { name: 'sampai', type: 'date', label: 'Sampai' }]} />
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                <Stat label="Pemasukan" value={shortRupiah(summary.revenue)} icon={Wallet} sub={`${summary.transactions} transaksi`} />
                <Stat label="Refund dibayar" value={shortRupiah(summary.refunds)} icon={RotateCcw} tone="red" />
                <Stat label="Pesanan baru" value={summary.new_bookings + summary.new_flights + summary.new_visas} icon={Receipt} tone="blue" sub={`${summary.new_bookings} umrah · ${summary.new_flights} tiket · ${summary.new_visas} visa`} />
                <Stat label="Jamaah baru" value={summary.jamaah} icon={Users} tone="gold" sub={`Piutang ${shortRupiah(summary.receivable)}`} />
            </div>
            <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
                <Card title="Pemasukan harian">
                    <div className="h-64">
                        <ResponsiveContainer>
                            <AreaChart data={daily}>
                                <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0B5D3B" stopOpacity={0.35} /><stop offset="100%" stopColor="#0B5D3B" stopOpacity={0} /></linearGradient></defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="tanggal" tickFormatter={(d) => date(d, { day: 'numeric', month: 'short' })} tick={{ fontSize: 11 }} />
                                <YAxis tickFormatter={(v) => shortRupiah(v).replace('Rp', '')} tick={{ fontSize: 11 }} width={56} />
                                <Tooltip formatter={(v) => rupiah(v)} labelFormatter={(d) => date(d)} />
                                <Area type="monotone" dataKey="total" stroke="#0B5D3B" strokeWidth={2} fill="url(#g)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
                <div className="space-y-6">
                    <Card title="Per layanan">{byService.map((s) => <div key={s.service} className="flex justify-between py-1.5 text-sm"><span className="flex items-center gap-2"><Landmark className="h-4 w-4 text-gold-500" />{s.service} ({s.count})</span><b>{rupiah(s.total)}</b></div>)}</Card>
                    <Card title="Per metode">{byMethod.map((m) => <div key={m.method} className="flex justify-between py-1.5 text-sm"><span>{m.method} ({m.count})</span><b>{rupiah(m.total)}</b></div>)}</Card>
                </div>
            </div>
            <Card title="Rincian transaksi" pad={false} className="mt-6">
                <div className="max-h-[480px] overflow-auto"><table className="table-app">
                    <thead className="sticky top-0"><tr><th>Tanggal</th><th>Kode</th><th>Pesanan</th><th>Layanan</th><th>Pelanggan</th><th>Metode</th><th className="!text-right">Nominal</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">{rows.map((r) => <tr key={r.kode}><td>{r.tanggal}</td><td>{r.kode}</td><td>{r.pesanan}</td><td>{r.layanan}</td><td>{r.pelanggan}</td><td>{r.metode}</td><td className="text-right">{rupiah(r.nominal)}</td></tr>)}</tbody>
                </table></div>
            </Card>
        </AdminLayout>
    );
}
