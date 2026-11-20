import { router, usePage } from '@inertiajs/react';
import { Download, Mail, MessageSquare, XCircle } from 'lucide-react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Card, DefList, PageHeader, Progress, StatusBadge } from '@/Components/ui';
import { date, dateTime, rupiah } from '@/lib/format';

export default function Show({ booking: b, customer, passengers, payments, outstanding, overdue, reminders, documents }) {
    const { auth } = usePage().props;
    const canOps = ['super_admin', 'operasional'].includes(auth.user.role);
    const cancel = () => {
        const reason = prompt('Alasan pembatalan:');
        if (reason) router.post(route('admin.bookings.cancel', b.code), { reason });
    };

    return (
        <AdminLayout title={b.code}>
            <PageHeader back={route('admin.bookings.index')} title={b.code} subtitle={`${b.departure.package.name} · berangkat ${date(b.departure.departure_date)}`}
                actions={<>
                    <StatusBadge status={b.status} />
                    {canOps && !['dibatalkan', 'selesai', 'kedaluwarsa'].includes(b.status) && <button onClick={cancel} className="btn-outline btn-sm text-red-600"><XCircle className="h-4 w-4" />Batalkan</button>}
                </>} />
            {overdue && <div className="mb-6 rounded-2xl bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200">Pesanan melewati batas pelunasan ({date(b.payment_deadline)}). Pengingat email & WhatsApp dikirim otomatis setiap hari.</div>}

            <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
                <div className="min-w-0 space-y-6">
                    <Card title="Pembayaran">
                        <div className="grid grid-cols-3 gap-3 text-center text-sm">
                            <div className="rounded-xl bg-sand-100 p-3"><p className="text-slate-500">Total</p><p className="font-bold">{rupiah(b.total_amount)}</p></div>
                            <div className="rounded-xl bg-emerald-50 p-3"><p className="text-slate-500">Dibayar</p><p className="font-bold text-emerald-700">{rupiah(b.paid_amount)}</p></div>
                            <div className="rounded-xl bg-amber-50 p-3"><p className="text-slate-500">Sisa</p><p className="font-bold text-amber-700">{rupiah(outstanding)}</p></div>
                        </div>
                        <Progress className="mt-3" value={(b.paid_amount / b.total_amount) * 100} />
                        <table className="table-app mt-4">
                            <thead><tr><th>Termin</th><th>Jatuh tempo</th><th className="!text-right">Nominal</th><th className="!text-right">Dibayar</th><th>Status</th><th>Pengingat</th></tr></thead>
                            <tbody className="divide-y divide-slate-100">{b.installments.map((i) => <tr key={i.id}><td>{i.label}</td><td>{date(i.due_date)}</td><td className="text-right">{rupiah(i.amount)}</td><td className="text-right">{rupiah(i.paid_amount)}</td><td><StatusBadge status={i.status} /></td><td>{i.reminder_count}×</td></tr>)}</tbody>
                        </table>
                    </Card>
                    <Card title="Transaksi" pad={false}>
                        <div className="overflow-x-auto"><table className="table-app">
                            <thead><tr><th>Kode</th><th>Metode</th><th>VA</th><th className="!text-right">Nominal</th><th>Status</th><th>Waktu</th></tr></thead>
                            <tbody className="divide-y divide-slate-100">{payments.map((p) => <tr key={p.id}><td className="font-medium">{p.code}</td><td>{p.method_label}</td><td className="font-mono text-xs">{p.va_number ?? '-'}</td><td className="text-right">{rupiah(p.amount)}</td><td><StatusBadge status={p.status} /></td><td>{dateTime(p.paid_at ?? p.created_at)}</td></tr>)}</tbody>
                        </table></div>
                    </Card>
                    <Card title={`Jamaah (${passengers.length})`} pad={false}>
                        <div className="overflow-x-auto"><table className="table-app">
                            <thead><tr><th>Nama</th><th>L/P</th><th>Tgl lahir</th><th>Paspor</th><th>Exp</th><th>NIK</th><th>Mahram</th></tr></thead>
                            <tbody className="divide-y divide-slate-100">{passengers.map((p) => <tr key={p.id}><td className="font-medium">{p.full_name}</td><td>{p.gender}</td><td>{p.birth_date}</td><td className="font-mono">{p.passport_number ?? '-'}</td><td>{p.passport_expiry ?? '-'}</td><td className="font-mono text-xs">{p.nik ?? '-'}</td><td>{p.mahram_name ? `${p.mahram_name} (${p.mahram_relation})` : '-'}</td></tr>)}</tbody>
                        </table></div>
                    </Card>
                    {documents.length > 0 && (
                        <Card title="Dokumen jamaah">
                            <ul className="space-y-2">{documents.map((d) => <li key={d.id} className="flex items-center justify-between text-sm"><a href={d.url} className="text-brand-700 hover:underline">{d.type_label} — {d.file_name}</a><StatusBadge status={d.status} /></li>)}</ul>
                        </Card>
                    )}
                </div>
                <div className="space-y-6">
                    <Card title="Pemesan">
                        <DefList items={[['Nama', customer.name], ['Kode', customer.customer_code], ['Email', customer.email], ['HP', customer.phone], ['Kota', customer.city]]} />
                    </Card>
                    <Card title="Detail">
                        <DefList items={[['Kamar', b.room_type.toUpperCase()], ['Harga/pax', rupiah(b.unit_price)], ['Skema', b.payment_scheme], ['Batas lunas', date(b.payment_deadline)], ['Kursi', b.seats_confirmed ? 'Terkonfirmasi' : 'Ditahan'], ['Catatan', b.notes]]} />
                    </Card>
                    <Card title="Invoice">
                        {b.invoices.map((i) => <div key={i.id} className="flex items-center justify-between py-1 text-sm"><span>{i.number}</span><a target="_blank" rel="noopener" href={route('invoices.pdf', i.id)} className="btn-ghost btn-sm"><Download className="h-4 w-4" /></a></div>)}
                    </Card>
                    <Card title="Log pengingat otomatis">
                        {reminders.length === 0 ? <p className="text-sm text-slate-500">Belum ada pengingat terkirim.</p> : (
                            <ul className="space-y-1.5 text-xs">{reminders.map((r) => <li key={r.id} className="flex items-center gap-2">{r.channel === 'whatsapp' ? <MessageSquare className="h-3.5 w-3.5 text-emerald-600" /> : <Mail className="h-3.5 w-3.5 text-sky-600" />}<span className="font-medium">{r.type}</span><span className="text-slate-400">{date(r.sent_on)}</span></li>)}</ul>
                        )}
                    </Card>
                </div>
            </div>
        </AdminLayout>
    );
}
