import { useForm, usePage } from '@inertiajs/react';
import { Ticket } from 'lucide-react';
import AdminLayout from '@/Layouts/AdminLayout';
import { FlightCard } from '@/Components/Cards';
import { Card, DefList, Input, PageHeader, StatusBadge } from '@/Components/ui';
import { dateTime, rupiah } from '@/lib/format';

export default function Show({ order: o, passengers, payments, documents }) {
    const { auth } = usePage().props;
    const issue = useForm({ pnr: o.pnr ?? '', file: null });
    const canIssue = auth.user.role === 'admin' && ['dibayar', 'tiket_terbit'].includes(o.status);

    return (
        <AdminLayout title={o.code}>
            <PageHeader back={route('admin.flight-orders.index')} title={o.code} subtitle={`${o.user.name} · ${o.user.customer_code}`} actions={<StatusBadge status={o.status} />} />
            <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
                <div className="min-w-0 space-y-6">
                    <FlightCard f={o.flight} pax={o.pax_count} />
                    <Card title="Penumpang (sesuai paspor)" pad={false}>
                        <div className="overflow-x-auto"><table className="table-app">
                            <thead><tr><th>Nama</th><th>L/P</th><th>Lahir</th><th>Paspor</th><th>Exp</th><th>Negara</th></tr></thead>
                            <tbody className="divide-y divide-slate-100">{passengers.map((p) => <tr key={p.id}><td className="font-medium">{p.title} {p.full_name}</td><td>{p.gender}</td><td>{p.birth_date}</td><td className="font-mono">{p.passport_number}</td><td>{p.passport_expiry}</td><td>{p.nationality}</td></tr>)}</tbody>
                        </table></div>
                    </Card>
                    <Card title="Transaksi" pad={false}>
                        <table className="table-app"><tbody className="divide-y divide-slate-100">{payments.map((p) => <tr key={p.id}><td>{p.code}</td><td>{p.method_label}</td><td>{rupiah(p.amount)}</td><td><StatusBadge status={p.status} /></td><td>{dateTime(p.paid_at ?? p.created_at)}</td></tr>)}</tbody></table>
                    </Card>
                </div>
                <div className="space-y-6">
                    <Card title="Kontak"><DefList items={[['Email', o.contact_email], ['HP', o.contact_phone], ['Total', rupiah(o.total_amount)], ['Batas bayar', dateTime(o.expires_at)]]} /></Card>
                    {canIssue && (
                        <Card title={o.status === 'tiket_terbit' ? 'Terbitkan ulang e-ticket' : 'Terbitkan e-ticket'}>
                            <form onSubmit={(e) => { e.preventDefault(); issue.post(route('admin.flight-orders.issue', o.code), { forceFormData: true }); }} className="space-y-3">
                                <Input label="Kode booking (PNR)" value={issue.data.pnr} onChange={(e) => issue.setData('pnr', e.target.value.toUpperCase())} error={issue.errors.pnr} required />
                                <div><label className="label">File e-ticket (PDF/JPG)</label><input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => issue.setData('file', e.target.files[0])} className="text-sm" />{issue.errors.file && <p className="error">{issue.errors.file}</p>}</div>
                                <button disabled={issue.processing} className="btn-primary w-full"><Ticket className="h-4 w-4" />Terbitkan & kirim ke pelanggan</button>
                            </form>
                        </Card>
                    )}
                    {documents.length > 0 && <Card title="Dokumen">{documents.map((d) => <a key={d.id} href={d.url} className="block text-sm text-brand-700 hover:underline">{d.type_label}: {d.file_name}</a>)}</Card>}
                </div>
            </div>
        </AdminLayout>
    );
}
