import { Download, Ticket } from 'lucide-react';
import CustomerLayout from '@/Layouts/CustomerLayout';
import PayBox from '@/Components/PayBox';
import { FlightCard } from '@/Components/Cards';
import { Card, DefList, PageHeader, StatusBadge, Stepper } from '@/Components/ui';
import { dateTime, rupiah } from '@/lib/format';

export default function FlightOrderShow({ order: o, payments, documents, payBox, flightDetails, revisionNote }) {
    const step = { menunggu_pembayaran: 2, dibayar: 3, tiket_terbit: 4 }[o.status] ?? 2;
    return (
        <CustomerLayout title={o.code}>
            <PageHeader back={route('customer.flight-orders.index')} title="Pesanan Tiket" subtitle={`${o.code} · ${dateTime(o.created_at)}`} actions={<StatusBadge status={o.status} />} />
            {!['dibatalkan', 'kedaluwarsa'].includes(o.status) && <div className="card mb-6 p-4"><Stepper steps={['Pilih', 'Data Penumpang', 'Pembayaran', 'Penerbitan', 'E-Ticket']} current={step} /></div>}
            <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
                <div className="min-w-0 space-y-6">
                    {revisionNote && (
                        <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
                            <b>Invoice diperbarui</b> ({revisionNote.number}, {revisionNote.at}). {revisionNote.notes}
                        </div>
                    )}
                    {flightDetails ? (
                        <Card title={`Detail penerbangan · ${o.pax_count} seat`}>
                            <DefList items={[['Maskapai', flightDetails.airline], ['No. flight', flightDetails.flight_number], ['Rute', flightDetails.route], ['Berangkat', flightDetails.depart], ['Kembali', flightDetails.return], ['PNR', flightDetails.pnr ?? o.pnr]]} />
                        </Card>
                    ) : <FlightCard f={o.flight} pax={o.pax_count} />}
                    {o.status === 'tiket_terbit' && (
                        <Card title="E-Ticket">
                            <p className="text-sm">Kode booking (PNR): <b className="font-mono text-lg text-brand-700">{o.pnr}</b></p>
                            <div className="mt-3 space-y-2">
                                {documents.filter((d) => d.type === 'eticket').map((d) => <a key={d.id} href={d.url} className="btn-primary"><Ticket className="h-4 w-4" />Unduh {d.file_name}</a>)}
                            </div>
                        </Card>
                    )}
                    {o.status === 'dibayar' && <div className="rounded-2xl bg-sky-50 p-4 text-sm text-sky-900 ring-1 ring-sky-200">Pembayaran diterima. Tim kami sedang menerbitkan e-ticket — Anda akan menerima email & notifikasi setelah terbit.</div>}
                    <Card title="Penumpang">
                        <ul className="divide-y divide-slate-100">
                            {o.passengers.map((p) => <li key={p.id} className="py-2.5 text-sm"><b>{p.title} {p.full_name}</b> <span className="text-slate-500">· {p.nationality}</span></li>)}
                        </ul>
                    </Card>
                    <Card title="Kebijakan">
                        <p className="text-sm"><b>Refund:</b> {o.flight.refund_policy}</p>
                        <p className="mt-2 text-sm"><b>Reschedule:</b> {o.flight.reschedule_policy}</p>
                    </Card>
                </div>
                <div className="space-y-6">
                    <PayBox box={payBox} />
                    <Card title="Invoice & kwitansi">
                        {o.invoices.map((i) => (
                            <div key={i.id} className="flex items-center justify-between py-1.5 text-sm">
                                <span className="min-w-0">{i.number}<br /><span className="flex items-center gap-2 text-xs text-slate-500">{rupiah(i.amount)} <StatusBadge status={i.status} /></span></span>
                                <a target="_blank" rel="noopener" href={route('invoices.pdf', i.id)} className="btn-outline btn-sm"><Download className="h-3.5 w-3.5" />PDF</a>
                            </div>
                        ))}
                        {payments.length > 0 && <p className="mt-3 text-xs text-slate-500">{payments.length} transaksi tercatat.</p>}
                    </Card>
                </div>
            </div>
        </CustomerLayout>
    );
}
