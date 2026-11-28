import { Link, router, useForm } from '@inertiajs/react';
import { AlertTriangle, Ban, Clock, Download, FileCheck2, FileText, History, Receipt, Upload, UserMinus } from 'lucide-react';
import CustomerLayout from '@/Layouts/CustomerLayout';
import PayBox from '@/Components/PayBox';
import { Card, DefList, Input, PageHeader, Progress, StatusBadge, Stepper, Textarea } from '@/Components/ui';
import { date, dateTime, rupiah } from '@/lib/format';

export default function BookingShow({ booking: b, outstanding, overdue, deposit, payments, payBox, canCancel, canRequest, requests = [], changes = [], categories = {}, canPayCash = false, cashPayments = [], settlementDays = 40 }) {
    const pkg = b.departure.package;
    const stepIdx = { menunggu_pembayaran: 1, cicilan_berjalan: 2, lunas: 3, selesai: 4 }[b.status] ?? 1;

    return (
        <CustomerLayout title={b.code}>
            <PageHeader back={route('customer.bookings.index')} title={pkg.name} subtitle={`${b.code} · dipesan ${dateTime(b.created_at)}`} actions={<StatusBadge status={b.status} />} />

            {['dibatalkan', 'refund'].includes(b.status) && (
                <div className={`mb-6 rounded-2xl p-4 text-sm ring-1 ${b.status === 'refund' ? 'bg-violet-50 text-violet-900 ring-violet-200' : 'bg-red-50 text-red-800 ring-red-200'}`}>
                    <b>{b.status === 'refund' ? 'Pesanan dibatalkan — dana dikembalikan (Refund).' : 'Pesanan dibatalkan.'}</b> {b.cancel_reason}
                </div>
            )}
            {requests.some((r) => r.status === 'diajukan') && (
                <div className="mb-6 flex gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
                    <Clock className="h-5 w-5 shrink-0" />Pengajuan {requests.find((r) => r.status === 'diajukan').type_label.toLowerCase()} Anda sedang ditinjau admin.
                </div>
            )}

            {!['dibatalkan', 'kedaluwarsa', 'refund'].includes(b.status) && (
                <div className="card mb-6 p-4"><Stepper steps={['Pesanan dibuat', 'Deposit', 'Cicilan berjalan', 'Lunas', 'Berangkat']} current={stepIdx} /></div>
            )}

            {b.status === 'menunggu_pembayaran' && b.hold_expires_at && (
                <div className="mb-6 flex gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
                    <Clock className="h-5 w-5 shrink-0" />Kursi Anda ditahan hingga <b>{dateTime(b.hold_expires_at)}</b>. Bayar {b.payment_scheme === 'cicilan' ? `deposit minimal ${rupiah(deposit)}` : 'pelunasan'} sebelum batas waktu agar kursi tidak dilepas.
                </div>
            )}
            {overdue && (
                <div className="mb-6 flex gap-3 rounded-2xl bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200">
                    <AlertTriangle className="h-5 w-5 shrink-0" />Batas pelunasan ({date(b.payment_deadline)}) telah terlewati. Pengingat otomatis akan terus dikirim melalui email & WhatsApp hingga tagihan lunas.
                </div>
            )}

            <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
                <div className="min-w-0 space-y-6">
                    <Card title="Ringkasan pembayaran">
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3 sm:text-center">
                            <div className="flex items-center justify-between gap-3 rounded-xl bg-sand-100 p-3 sm:block"><p className="text-xs text-slate-500">Total</p><p className="font-bold">{rupiah(b.total_amount)}</p></div>
                            <div className="flex items-center justify-between gap-3 rounded-xl bg-emerald-50 p-3 sm:block"><p className="text-xs text-slate-500">Dibayar</p><p className="font-bold text-emerald-700">{rupiah(b.paid_amount)}</p></div>
                            <div className="flex items-center justify-between gap-3 rounded-xl bg-amber-50 p-3 sm:block"><p className="text-xs text-slate-500">Sisa</p><p className="font-bold text-amber-700">{rupiah(outstanding)}</p></div>
                        </div>
                        <Progress className="mt-4" value={(b.paid_amount / b.total_amount) * 100} />
                        {b.payment_scheme === 'cicilan' && (
                            <p className="mt-3 rounded-xl bg-brand-50 p-3 text-sm text-brand-900">
                                <b>Cicilan bebas</b> — bayar kapan saja dan berapa kali saja (minimal Rp500.000 per pembayaran), tanpa jadwal bulanan.
                                Wajib lunas paling lambat <b>{date(b.payment_deadline)}</b> (H-{settlementDays} keberangkatan).
                            </p>
                        )}
                    </Card>

                    <Card title="Riwayat transaksi" pad={false}>
                        {/* HP: kartu bertumpuk */}
                        <ul className="divide-y divide-slate-100 sm:hidden">
                            {payments.length === 0 && <li className="p-4 text-center text-sm text-slate-400">Belum ada transaksi</li>}
                            {payments.map((p) => (
                                <li key={p.id} className="flex items-start justify-between gap-3 p-4">
                                    <div className="min-w-0">
                                        <Link href={route('payments.show', p.code)} className="block truncate font-semibold text-brand-700 hover:underline">{p.code}</Link>
                                        <p className="text-xs text-slate-500">{p.method_label} · {dateTime(p.paid_at ?? p.created_at)}</p>
                                    </div>
                                    <div className="shrink-0 text-right"><p className="text-sm font-bold">{rupiah(p.amount)}</p><StatusBadge status={p.status} /></div>
                                </li>
                            ))}
                        </ul>
                        <div className="hidden overflow-x-auto sm:block">
                            <table className="table-app">
                                <thead><tr><th>Kode</th><th>Metode</th><th className="!text-right">Nominal</th><th>Status</th><th>Waktu</th></tr></thead>
                                <tbody className="divide-y divide-slate-100">
                                    {payments.length === 0 && <tr><td colSpan={5} className="text-center text-slate-400">Belum ada transaksi</td></tr>}
                                    {payments.map((p) => (
                                        <tr key={p.id}>
                                            <td><Link href={route('payments.show', p.code)} className="font-medium text-brand-700 hover:underline">{p.code}</Link></td>
                                            <td>{p.method_label}</td><td className="text-right">{rupiah(p.amount)}</td><td><StatusBadge status={p.status} /></td><td>{dateTime(p.paid_at ?? p.created_at)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>

                    <Card title="Detail perjalanan">
                        <DefList items={[
                            ['Keberangkatan', date(b.departure.departure_date)], ['Kepulangan', date(b.departure.return_date)],
                            ['Maskapai', pkg.airline], ['Kamar', b.room_type.toUpperCase()],
                            ['Hotel Makkah', pkg.hotel_makkah], ['Hotel Madinah', pkg.hotel_madinah],
                            ['Harga/jamaah', rupiah(b.unit_price)], ['Skema', b.payment_scheme === 'cicilan' ? 'Cicilan' : 'Lunas'],
                        ]} />
                        <p className="mb-2 mt-6 text-sm font-semibold">Jamaah ({b.pax_count})</p>
                        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100">
                            {b.passengers.map((p) => (
                                <li key={p.id} className="flex flex-wrap justify-between gap-3 p-3 text-sm">
                                    <span className="font-medium">{p.full_name} <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-600">{categories[p.category] ?? p.category ?? 'Dewasa'}</span></span>
                                    <span className="text-slate-500">{p.gender === 'P' ? 'Perempuan' : 'Laki-laki'}{p.mahram_name && ` · mahram ${p.mahram_name}`} · {rupiah(p.price ?? b.unit_price)}</span>
                                </li>
                            ))}
                        </ul>
                        <Link href={route('customer.documents.index')} className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand-700"><FileText className="h-4 w-4" />Kelola dokumen jamaah</Link>
                    </Card>
                </div>

                <div className="space-y-6">
                    <PayBox box={payBox} title={b.paid_amount === 0 && b.payment_scheme === 'cicilan' ? 'Bayar Deposit Awal' : 'Bayar Cicilan / Pelunasan'} />
                    {(canPayCash || cashPayments.length > 0) && <CashPaymentCard b={b} outstanding={outstanding} canPay={canPayCash} items={cashPayments} />}
                    <Card title="Invoice">
                        <ul className="space-y-2">
                            {b.invoices.map((i) => (
                                <li key={i.id} className="flex items-center justify-between gap-2 text-sm">
                                    <div className="min-w-0"><p className="truncate font-medium">{i.number}</p><p className="text-xs text-slate-500">Invoice · {rupiah(i.amount)}</p></div>
                                    <a target="_blank" rel="noopener" href={route('invoices.pdf', i.id)} className="btn-outline btn-sm"><Download className="h-3.5 w-3.5" />PDF</a>
                                </li>
                            ))}
                        </ul>
                    </Card>
                    {canCancel && (
                        <button onClick={() => confirm('Batalkan pesanan ini? Kursi akan dilepas.') && router.post(route('customer.bookings.cancel', b.code))} className="btn-ghost w-full text-red-600">Batalkan pesanan</button>
                    )}
                    {canRequest && (
                        <Card title="Pembatalan / perubahan">
                            <p className="mb-3 text-xs text-slate-500">Diproses admin sesuai kebijakan refund. Dana yang sudah dibayar dikembalikan sesuai keputusan admin.</p>
                            <div className="space-y-2">
                                {b.pax_count > 1 && (
                                    <Link href={route('customer.refunds.index', { pesanan: `booking:${b.code}`, jenis: 'pengurangan' })} className="btn-outline w-full justify-start">
                                        <UserMinus className="h-4 w-4" />Kurangi jamaah (mis. {b.pax_count} → {b.pax_count - 1} orang)
                                    </Link>
                                )}
                                <Link href={route('customer.refunds.index', { pesanan: `booking:${b.code}`, jenis: 'pembatalan' })} className="btn-outline w-full justify-start text-red-600">
                                    <Ban className="h-4 w-4" />Batalkan keberangkatan (seluruh pesanan)
                                </Link>
                                <Link href={route('customer.refunds.index', { pesanan: `booking:${b.code}`, jenis: 'refund' })} className="btn-ghost w-full justify-start text-slate-500">Pengembalian dana saja</Link>
                            </div>
                        </Card>
                    )}
                    {(requests.length > 0 || changes.length > 0) && (
                        <Card title="Riwayat pengajuan & perubahan">
                            <ul className="space-y-3 text-sm">
                                {requests.map((r) => (
                                    <li key={r.code} className="flex items-start justify-between gap-2">
                                        <span><b>{r.type_label}</b> <span className="text-xs text-slate-400">{r.code} · {r.created_at}</span>
                                            <span className="block text-xs text-slate-500">Diajukan {rupiah(r.requested_amount)}{r.approved_amount != null && ` · disetujui ${rupiah(r.approved_amount)}`}</span>
                                            {r.admin_note && <span className="block text-xs text-slate-500">Catatan admin: {r.admin_note}</span>}</span>
                                        <StatusBadge status={r.status} />
                                    </li>
                                ))}
                                {changes.map((c) => (
                                    <li key={c.id} className="flex gap-2 border-t border-slate-100 pt-3">
                                        <History className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                                        <span><b>{c.type_label}</b> <span className="text-xs text-slate-400">{c.at}</span>
                                            <span className="block text-xs text-slate-600">{c.description}</span>
                                            <span className="block text-xs text-slate-500">Total {rupiah(c.old_total)} → <b>{rupiah(c.new_total)}</b>{c.refund_amount > 0 && ` · dana dikembalikan ${rupiah(c.refund_amount)}`}</span></span>
                                    </li>
                                ))}
                            </ul>
                        </Card>
                    )}
                </div>
            </div>
        </CustomerLayout>
    );
}

/**
 * Bayar tunai di kantor: jamaah mengunggah kwitansi resmi dari kantor.
 * Setelah diverifikasi admin, nominal tercatat sebagai pembayaran di invoice.
 */
function CashPaymentCard({ b, outstanding, canPay, items }) {
    const today = new Date().toISOString().slice(0, 10);
    const form = useForm({ amount: '', paid_date: today, receipt: null, note: '' });
    const submit = (e) => {
        e.preventDefault();
        form.post(route('customer.bookings.cash', b.code), { forceFormData: true, preserveScroll: true, onSuccess: () => form.reset() });
    };

    return (
        <Card title="Bayar tunai di kantor">
            {items.length > 0 && (
                <ul className="mb-4 space-y-2">
                    {items.map((p) => (
                        <li key={p.code} className={`rounded-xl p-3 text-sm ring-1 ${p.status === 'ditolak' ? 'bg-red-50 ring-red-200' : 'bg-amber-50 ring-amber-200'}`}>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <b>{rupiah(p.amount)}</b>
                                <StatusBadge status={p.status} />
                            </div>
                            <p className="text-xs text-slate-600">Dibayar {p.paid_at} · <a href={p.proof_url} target="_blank" rel="noopener" className="inline-flex items-center gap-1 font-medium text-brand-700 hover:underline"><FileCheck2 className="h-3.5 w-3.5" />kwitansi</a></p>
                            {p.status === 'ditolak' && p.review_note && <p className="mt-1 text-xs text-red-700"><b>Alasan ditolak:</b> {p.review_note}</p>}
                            {p.status === 'menunggu_verifikasi' && <p className="mt-1 text-xs text-amber-800">Sedang diperiksa admin. Setelah diverifikasi, pembayaran tercatat di invoice.</p>}
                        </li>
                    ))}
                </ul>
            )}
            {canPay && (
                <form onSubmit={submit} className="space-y-3">
                    <p className="flex gap-2 text-xs text-slate-600"><Receipt className="h-4 w-4 shrink-0 text-brand-700" />Sudah membayar tunai di kantor? Unggah kwitansi dari kantor agar pembayaran tercatat di invoice.</p>
                    <Input label="Nominal yang dibayar (Rp)" type="number" min={10000} max={outstanding} value={form.data.amount} onChange={(e) => form.setData('amount', e.target.value)} error={form.errors.amount} required />
                    <Input label="Tanggal bayar" type="date" max={today} value={form.data.paid_date} onChange={(e) => form.setData('paid_date', e.target.value)} error={form.errors.paid_date} required />
                    <div>
                        <label className="label">Foto / scan kwitansi (JPG, PNG, PDF · maks. 5 MB)</label>
                        <input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={(e) => form.setData('receipt', e.target.files[0])} className="text-sm" />
                        {form.errors.receipt && <p className="error">{form.errors.receipt}</p>}
                    </div>
                    <Textarea label="Catatan (opsional)" rows={2} value={form.data.note} onChange={(e) => form.setData('note', e.target.value)} error={form.errors.note} placeholder="Mis. No. kwitansi 0123, diterima oleh Ibu Sari" />
                    <button disabled={form.processing || !form.data.receipt || !form.data.amount} className="btn-primary w-full"><Upload className="h-4 w-4" />{form.processing ? 'Mengunggah…' : 'Kirim kwitansi'}</button>
                </form>
            )}
        </Card>
    );
}
