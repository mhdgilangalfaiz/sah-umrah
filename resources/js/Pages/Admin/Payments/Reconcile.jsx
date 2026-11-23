import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import AdminLayout from '@/Layouts/AdminLayout';
import FilterBar from '@/Components/FilterBar';
import { Card, PageHeader, Stat } from '@/Components/ui';
import { date, dateTime, rupiah, shortRupiah } from '@/lib/format';

export default function Reconcile({ period, totals, missingWebhook, problems, daily, stalePending }) {
    const ok = missingWebhook.length === 0 && problems.length === 0;
    return (
        <AdminLayout title="Rekonsiliasi">
            <PageHeader back={route('admin.payments.index')} title="Rekonsiliasi Pembayaran" subtitle="Membandingkan pembayaran yang tercatat di sistem dengan webhook dari payment gateway." />
            <FilterBar routeName="admin.payments.reconcile" filters={period} fields={[{ name: 'dari', type: 'date', label: 'Dari' }, { name: 'sampai', type: 'date', label: 'Sampai' }]} />
            <div className="mb-6 grid gap-4 sm:grid-cols-3">
                <Stat label="Total dibayar (sistem)" value={shortRupiah(totals.system)} sub={`${totals.system_count} transaksi`} />
                <Stat label="Webhook 'dibayar' diterima" value={totals.webhook_count} tone="blue" />
                <div className={`card flex items-center gap-3 p-5 ${ok ? 'text-emerald-700' : 'text-red-700'}`}>{ok ? <CheckCircle2 className="h-8 w-8" /> : <AlertTriangle className="h-8 w-8" />}<p className="font-semibold">{ok ? 'Data sesuai' : 'Ada selisih yang perlu dicek'}</p></div>
            </div>
            <div className="grid gap-6 xl:grid-cols-2">
                <Card title="Dibayar tanpa webhook tercatat" pad={false}>
                    <div className="overflow-x-auto"><table className="table-app"><thead><tr><th>Kode</th><th>Nominal</th><th>Dibayar</th><th>Gateway</th></tr></thead>
                        <tbody className="divide-y divide-slate-100">{missingWebhook.length === 0 ? <tr><td colSpan={4} className="text-center text-slate-400">Tidak ada</td></tr> : missingWebhook.map((p) => <tr key={p.code}><td>{p.code}</td><td>{rupiah(p.amount)}</td><td>{p.paid_at}</td><td>{p.gateway}</td></tr>)}</tbody></table></div>
                    <p className="px-4 py-2 text-xs text-slate-500">Biasanya hasil sinkron manual "Cek ke gateway". Cocokkan dengan laporan settlement di dashboard gateway.</p>
                </Card>
                <Card title="Webhook bermasalah" pad={false}>
                    <div className="overflow-x-auto"><table className="table-app"><thead><tr><th>Waktu</th><th>Gateway</th><th>Event</th><th>Hasil</th></tr></thead>
                        <tbody className="divide-y divide-slate-100">{problems.length === 0 ? <tr><td colSpan={4} className="text-center text-slate-400">Tidak ada</td></tr> : problems.map((e) => <tr key={e.id}><td>{e.created_at}</td><td>{e.gateway}</td><td>{e.event_type}</td><td className={e.signature_valid ? 'text-amber-700' : 'font-semibold text-red-600'}>{e.signature_valid ? e.result : 'SIGNATURE TIDAK VALID'}</td></tr>)}</tbody></table></div>
                </Card>
                <Card title="Rekap harian" pad={false}>
                    <div className="overflow-x-auto"><table className="table-app"><thead><tr><th>Tanggal</th><th>Transaksi</th><th className="!text-right">Total</th></tr></thead>
                        <tbody className="divide-y divide-slate-100">{daily.map((d) => <tr key={d.tanggal}><td>{date(d.tanggal)}</td><td>{d.jumlah}</td><td className="text-right">{rupiah(d.total)}</td></tr>)}</tbody></table></div>
                </Card>
                <Card title="Pending > 2 jam (perlu dipantau)" pad={false}>
                    <div className="overflow-x-auto"><table className="table-app"><thead><tr><th>Kode</th><th>Metode</th><th>Nominal</th><th>Dibuat</th></tr></thead>
                        <tbody className="divide-y divide-slate-100">{stalePending.length === 0 ? <tr><td colSpan={4} className="text-center text-slate-400">Tidak ada</td></tr> : stalePending.map((p) => <tr key={p.code}><td>{p.code}</td><td>{p.method}</td><td>{rupiah(p.amount)}</td><td>{dateTime(p.created_at)}</td></tr>)}</tbody></table></div>
                </Card>
            </div>
        </AdminLayout>
    );
}
