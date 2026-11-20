import { useForm } from '@inertiajs/react';
import { Download, FileArchive, Hourglass, Stamp, Upload } from 'lucide-react';
import CustomerLayout from '@/Layouts/CustomerLayout';
import PayBox from '@/Components/PayBox';
import { Card, DefList, PageHeader, StatusBadge, Stepper } from '@/Components/ui';
import { dateTime, fileSize, rupiah, usd } from '@/lib/format';

export const VISA_STEPS = ['Pengajuan', 'Invoice', 'Pembayaran', 'Menunggu Dokumen', 'Diverifikasi', 'Diproses', 'Terbit'];
export const visaStep = (s) => ({ menunggu_invoice: 1, menunggu_pembayaran: 2, menunggu_dokumen: 3, diverifikasi: 4, diproses: 5, terbit: 6, ditolak: 5 }[s] ?? 0);

export default function VisaShow({ application: v, statuses, payments, documents, payBox, canUpload }) {
    const upload = useForm({ file: null });
    const visaDocs = documents.filter((d) => d.type === 'visa_terbit');
    const berkas = documents.filter((d) => d.type === 'berkas_visa');

    return (
        <CustomerLayout title={v.code}>
            <PageHeader back={route('customer.visa.index')} title={v.service.name} subtitle={`${v.code} · ${v.pax_count} pemohon`} actions={<StatusBadge status={v.status} label={statuses[v.status]} />} />
            <div className="card mb-6 p-4"><Stepper steps={VISA_STEPS} current={visaStep(v.status)} failed={v.status === 'ditolak'} /></div>

            <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
                <div className="min-w-0 space-y-6">
                    {v.status === 'menunggu_invoice' && <div className="flex gap-3 rounded-2xl bg-sand-100 p-4 text-sm"><Hourglass className="h-5 w-5 text-gold-600" />Pengajuan diterima. Admin sedang menyiapkan invoice — Anda akan mendapat notifikasi saat invoice terbit.</div>}
                    {v.status === 'ditolak' && <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200"><b>Pengajuan ditolak.</b> {v.rejection_reason}</div>}

                    {visaDocs.length > 0 && (
                        <Card title="Visa terbit">
                            <p className="mb-3 text-sm text-slate-600">Alhamdulillah, visa Anda telah terbit pada {dateTime(v.issued_at)}.</p>
                            {visaDocs.map((d) => <a key={d.id} href={d.url} className="btn-primary"><Stamp className="h-4 w-4" />Unduh {d.file_name}</a>)}
                        </Card>
                    )}

                    {(canUpload || berkas.length > 0) && (
                        <Card title="Berkas pemohon (ZIP/RAR)">
                            {canUpload && (
                                <form onSubmit={(e) => { e.preventDefault(); upload.post(route('customer.visa.upload', v.code), { forceFormData: true, onSuccess: () => upload.reset() }); }} className="mb-4 rounded-xl border-2 border-dashed border-brand-200 bg-brand-50/50 p-5 text-center">
                                    <FileArchive className="mx-auto h-8 w-8 text-brand-600" />
                                    <p className="mt-2 text-sm">Kompres seluruh dokumen pemohon (paspor, foto, KTP, KK, dll.) menjadi <b>satu file .zip atau .rar</b> (maks. 50 MB).</p>
                                    <input type="file" accept=".zip,.rar" onChange={(e) => upload.setData('file', e.target.files[0])} className="mx-auto mt-3 block text-sm" />
                                    {upload.errors.file && <p className="error">{upload.errors.file}</p>}
                                    {upload.progress && <p className="mt-2 text-xs text-slate-500">Mengunggah {upload.progress.percentage}%</p>}
                                    <button disabled={!upload.data.file || upload.processing} className="btn-primary mt-3"><Upload className="h-4 w-4" />Unggah Berkas</button>
                                </form>
                            )}
                            <ul className="space-y-2">
                                {berkas.map((d) => (
                                    <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 p-3 text-sm">
                                        <div><a href={d.url} className="font-medium text-brand-700 hover:underline">{d.file_name}</a><p className="text-xs text-slate-500">{d.created_at}</p>{d.rejection_note && <p className="text-xs text-red-600">Catatan: {d.rejection_note}</p>}</div>
                                        <StatusBadge status={d.status} />
                                    </li>
                                ))}
                            </ul>
                        </Card>
                    )}

                    <Card title="Riwayat status">
                        <ol className="relative space-y-5 border-l-2 border-slate-200 pl-6">
                            {v.status_logs.map((l) => (
                                <li key={l.id} className="relative">
                                    <span className="absolute -left-[31px] top-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-brand-600 ring-2 ring-brand-100" />
                                    <div className="flex flex-wrap items-center gap-2"><StatusBadge status={l.to_status} label={statuses[l.to_status]} /><span className="text-xs text-slate-400">{dateTime(l.created_at)}</span></div>
                                    {l.note && <p className="mt-1 text-sm text-slate-600">{l.note}</p>}
                                </li>
                            ))}
                        </ol>
                    </Card>

                    <Card title="Detail pengajuan">
                        <DefList items={[['Jumlah pemohon', v.pax_count], ['Rencana berangkat', v.planned_departure ?? '-'], ['Biaya/orang', v.unit_price ? (v.unit_price_usd ? `${usd(v.unit_price_usd)} × kurs Rp${Number(v.exchange_rate).toLocaleString('id-ID')} = ${rupiah(v.unit_price)}` : rupiah(v.unit_price)) : '-'], ['Total', v.total_amount ? rupiah(v.total_amount) : 'Menunggu invoice'], ['Catatan', v.notes]]} />
                        {v.passengers.length > 0 && <ul className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-100 text-sm">{v.passengers.map((p) => <li key={p.id} className="p-2.5">{p.full_name}</li>)}</ul>}
                    </Card>
                </div>
                <div className="space-y-6">
                    {v.status !== 'menunggu_invoice' && <PayBox box={payBox} />}
                    {v.invoices.length > 0 && (
                        <Card title="Invoice & kwitansi">
                            {v.invoices.map((i) => (
                                <div key={i.id} className="flex items-center justify-between py-1.5 text-sm">
                                    <span>{i.number}<br /><span className="text-xs text-slate-500">{i.type} · {rupiah(i.amount)} · <StatusBadge status={i.status} /></span></span>
                                    <a href={route('invoices.pdf', i.id)} className="btn-outline btn-sm"><Download className="h-3.5 w-3.5" />PDF</a>
                                </div>
                            ))}
                        </Card>
                    )}
                </div>
            </div>
        </CustomerLayout>
    );
}
