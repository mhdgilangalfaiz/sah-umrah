import { useForm } from '@inertiajs/react';
import { AlertTriangle, CheckCircle2, Clock, Download, FileSpreadsheet, Lock, Ticket, Upload } from 'lucide-react';
import CustomerLayout from '@/Layouts/CustomerLayout';
import PayBox from '@/Components/PayBox';
import { FlightCard } from '@/Components/Cards';
import { Card, DefList, PageHeader, StatusBadge, Stepper } from '@/Components/ui';
import { dateTime, rupiah } from '@/lib/format';

/**
 * Pesanan seat tiket: bayar DP → cicil sampai lunas → unggah manifest (Excel) → e-ticket terbit.
 */
export default function FlightOrderShow({ order: o, payments, documents, payBox, flightDetails, revisionNote, billTo, deposit, manifest }) {
    const closed = ['dibatalkan', 'kedaluwarsa'].includes(o.status);
    const step = { menunggu_pembayaran: 1, cicilan_berjalan: 2, dibayar: manifest.uploaded_at ? 4 : 3, tiket_terbit: 4 }[o.status] ?? 1;
    const outstanding = Math.max(0, Number(o.total_amount) - Number(o.paid_amount));

    return (
        <CustomerLayout title={o.code}>
            <PageHeader back={route('customer.flight-orders.index')} title="Pesanan Tiket" subtitle={`${o.code} · ${dateTime(o.created_at)}`} actions={<StatusBadge status={o.status} />} />
            {!closed && <div className="card mb-6 p-4"><Stepper steps={['Pesan Seat', 'Bayar DP', 'Cicil sampai Lunas', 'Upload Manifest', 'E-Ticket']} current={step} /></div>}
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="min-w-0 space-y-6">
                    <StatusNote o={o} deposit={deposit} manifest={manifest} />
                    {revisionNote && (
                        <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
                            <b>Invoice diperbarui</b> ({revisionNote.number}, {revisionNote.at}). {revisionNote.notes}
                        </div>
                    )}
                    {flightDetails ? (
                        <Card title={`Detail penerbangan · ${o.pax_count} seat`}>
                            <DefList items={[['Maskapai', flightDetails.airline], ['No. flight', flightDetails.flight_number], ['Rute', flightDetails.route], ['Berangkat', flightDetails.depart], ['Kembali', flightDetails.return], ['PNR', flightDetails.pnr ?? o.pnr]]} />
                        </Card>
                    ) : <FlightCard f={o.flight} pax={o.pax_count} booked />}

                    {o.status === 'tiket_terbit' && (
                        <Card title="E-Ticket">
                            <p className="text-sm">Kode booking (PNR): <b className="font-mono text-lg text-brand-700">{o.pnr}</b></p>
                            <div className="mt-3 space-y-2">
                                {documents.filter((d) => d.type === 'eticket').map((d) => <a key={d.id} href={d.url} className="btn-primary"><Ticket className="h-4 w-4" />Unduh {d.file_name}</a>)}
                            </div>
                        </Card>
                    )}

                    <Card title="Tagihan">
                        <div className="grid grid-cols-3 gap-3 text-center text-sm">
                            <div className="rounded-xl bg-sand-100 p-3"><p className="text-slate-500">Total ({o.pax_count} seat)</p><p className="font-bold">{rupiah(o.total_amount)}</p></div>
                            <div className="rounded-xl bg-emerald-50 p-3"><p className="text-slate-500">Dibayar</p><p className="font-bold text-emerald-700">{rupiah(o.paid_amount)}</p></div>
                            <div className="rounded-xl bg-amber-50 p-3"><p className="text-slate-500">Sisa</p><p className="font-bold text-amber-700">{rupiah(outstanding)}</p></div>
                        </div>
                        <div className="mt-4">
                            <DefList items={[
                                ['Ditagihkan kepada', billTo?.company ?? billTo?.name ?? '-'],
                                billTo?.company && ['Penanggung jawab', billTo.name],
                                ['Kontak', [o.contact_email, o.contact_phone].filter(Boolean).join(' · ')],
                                o.settlement_due_at && outstanding > 0 && !closed && ['Batas pelunasan', dateTime(o.settlement_due_at)],
                            ].filter(Boolean)} />
                        </div>
                    </Card>

                    {!closed && <ManifestCard o={o} manifest={manifest} files={documents.filter((d) => d.type === 'manifest')} />}

                    {o.passengers.length > 0 && (
                        <Card title={`Penumpang terbaca dari manifest · ${o.passengers.length}/${o.pax_count}`}>
                            <ol className="grid gap-x-6 text-sm sm:grid-cols-2">
                                {o.passengers.map((p, i) => <li key={p.id} className="flex gap-2 border-b border-slate-100 py-2"><span className="w-6 shrink-0 text-right text-slate-400">{i + 1}.</span><span className="min-w-0 [overflow-wrap:anywhere]"><b>{p.title} {p.full_name}</b>{p.passport_expiry && <span className="text-slate-500"> · exp {p.passport_expiry}</span>}</span></li>)}
                            </ol>
                        </Card>
                    )}

                    <Card title="Kebijakan">
                        <p className="text-sm"><b>Refund:</b> {o.flight.refund_policy}</p>
                        <p className="mt-2 text-sm"><b>Reschedule:</b> {o.flight.reschedule_policy}</p>
                    </Card>
                </div>
                <div className="space-y-6">
                    <PayBox box={payBox} title={Number(o.paid_amount) === 0 ? 'Bayar DP' : 'Cicilan / Pelunasan'} />
                    <Card title="Invoice & kwitansi">
                        {o.invoices.map((i) => (
                            <div key={i.id} className="flex items-center justify-between gap-3 py-1.5 text-sm">
                                <span className="min-w-0">{i.number}<br /><span className="flex items-center gap-2 text-xs text-slate-500">{rupiah(i.amount)} <StatusBadge status={i.status} /></span></span>
                                <a target="_blank" rel="noopener" href={route('invoices.pdf', i.id)} className="btn-outline btn-sm shrink-0"><Download className="h-3.5 w-3.5" />PDF</a>
                            </div>
                        ))}
                        {payments.length > 0 && <p className="mt-3 text-xs text-slate-500">{payments.length} transaksi tercatat.</p>}
                    </Card>
                </div>
            </div>
        </CustomerLayout>
    );
}

function StatusNote({ o, deposit, manifest }) {
    const box = (tone, Icon, children) => (
        <div className={`flex gap-3 rounded-2xl p-4 text-sm ring-1 ${tone}`}><Icon className="h-5 w-5 shrink-0" /><div>{children}</div></div>
    );
    if (o.status === 'menunggu_pembayaran') {
        return box('bg-amber-50 text-amber-900 ring-amber-200', Clock, <><b>{o.pax_count} seat ditahan sampai {dateTime(o.expires_at)}.</b> Bayar DP minimal {rupiah(deposit)} untuk mengunci seat, sisanya bisa dicicil sampai lunas. Bila lewat batas waktu, pesanan otomatis batal.</>);
    }
    if (o.status === 'cicilan_berjalan') {
        return box('bg-sky-50 text-sky-900 ring-sky-200', Lock, <><b>Seat sudah terkunci untuk Anda.</b> Silakan cicil sisa tagihan{o.settlement_due_at && <> dan lunasi paling lambat <b>{dateTime(o.settlement_due_at)}</b></>}. Setelah lunas, Anda dapat mengunggah manifest penumpang.</>);
    }
    if (o.status === 'dibayar' && !manifest.uploaded_at) {
        return box('bg-emerald-50 text-emerald-900 ring-emerald-200', FileSpreadsheet, <><b>Tagihan lunas.</b> Langkah berikutnya: unduh template, isi data penumpang sesuai paspor, lalu unggah manifest di bawah.</>);
    }
    if (o.status === 'dibayar') {
        return box('bg-sky-50 text-sky-900 ring-sky-200', CheckCircle2, <><b>Manifest diterima.</b> Tim kami sedang menerbitkan e-ticket — Anda akan menerima notifikasi setelah terbit. Manifest masih bisa diganti sebelum tiket terbit.</>);
    }
    return null;
}

/** Template & unggah manifest Excel (aktif setelah lunas, terkunci setelah e-ticket terbit) */
function ManifestCard({ o, manifest, files }) {
    const form = useForm({ file: null });
    const latest = files[0];

    return (
        <Card title="Manifest penumpang" actions={<a href={route('customer.flight-orders.manifest.template', o.code)} className="btn-outline btn-sm"><Download className="h-4 w-4" />Template Excel</a>}>
            <p className="text-sm text-slate-600">Isi data penumpang ({o.pax_count} seat) di file Excel: nama sesuai paspor, jenis kelamin, tanggal lahir, nomor paspor, dan masa berlaku paspor. Boleh memakai template di atas atau format Excel Anda sendiri.</p>

            {manifest.uploaded_at && (
                <div className="mt-4 flex items-center gap-3 rounded-xl border border-slate-100 p-3 text-sm">
                    <FileSpreadsheet className="h-6 w-6 shrink-0 text-emerald-600" />
                    <span className="min-w-0 flex-1"><b className="block truncate">{latest?.file_name ?? 'Manifest'}</b><span className="text-xs text-slate-500">Diunggah {manifest.uploaded_at} · {manifest.count} penumpang terbaca</span></span>
                    {latest && <a href={latest.url} className="btn-ghost btn-sm"><Download className="h-4 w-4" /></a>}
                </div>
            )}
            {manifest.warnings.length > 0 && (
                <ul className="mt-3 space-y-1 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
                    {manifest.warnings.map((w, i) => <li key={i} className="flex gap-2 [overflow-wrap:anywhere]"><AlertTriangle className="h-3.5 w-3.5 shrink-0" />{w}</li>)}
                </ul>
            )}

            {manifest.can_upload ? (
                <form onSubmit={(e) => { e.preventDefault(); form.post(route('customer.flight-orders.manifest', o.code), { forceFormData: true, preserveScroll: true, onSuccess: () => form.reset() }); }} className="mt-4 rounded-xl border-2 border-dashed border-brand-200 bg-brand-50/40 p-4">
                    <label className="label">{manifest.uploaded_at ? 'Ganti manifest' : 'Unggah manifest'} (.xlsx / .xls / .csv, maks. 10 MB)</label>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => form.setData('file', e.target.files[0])} className="min-w-0 flex-1 text-sm" />
                        <button disabled={form.processing || !form.data.file} className="btn-primary shrink-0"><Upload className="h-4 w-4" />{form.processing ? 'Mengunggah…' : 'Unggah'}</button>
                    </div>
                    {form.errors.file && <p className="error">{form.errors.file}</p>}
                </form>
            ) : o.status !== 'tiket_terbit' && (
                <p className="mt-4 flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-600"><Lock className="h-4 w-4 shrink-0" />Unggah manifest terbuka setelah tagihan lunas.</p>
            )}
        </Card>
    );
}
