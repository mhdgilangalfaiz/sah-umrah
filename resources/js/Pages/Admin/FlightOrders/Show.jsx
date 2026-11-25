import { useForm, usePage } from '@inertiajs/react';
import { AlertTriangle, Download, FilePenLine, FileSpreadsheet, Minus, Plus, Ticket, Trash2, Upload, X } from 'lucide-react';
import { useState } from 'react';
import { ProofLink } from '@/Components/PaymentProof';
import AdminLayout from '@/Layouts/AdminLayout';
import { FlightCard } from '@/Components/Cards';
import { Card, DefList, Input, PageHeader, StatusBadge, Textarea } from '@/Components/ui';
import { dateTime, rupiah } from '@/lib/format';

export default function Show({ order: o, passengers, payments, documents, outstanding, flightDetails, extras, seatsAvailable, invoices, closed, billTo, manifest }) {
    const { auth } = usePage().props;
    const isAdmin = auth.user.role === 'admin';
    const issue = useForm({ pnr: o.pnr ?? '', file: null });
    const canIssue = isAdmin && ['dibayar', 'tiket_terbit'].includes(o.status);
    const [revising, setRevising] = useState(false);

    return (
        <AdminLayout title={o.code}>
            <PageHeader back={route('admin.flight-orders.index')} title={o.code} subtitle={`${o.user.name} · ${o.user.customer_code}`} actions={<StatusBadge status={o.status} />} />
            <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="min-w-0 space-y-6">
                    <FlightCard f={o.flight} pax={o.pax_count} />

                    <Card title="Tagihan & invoice" actions={isAdmin && !closed && !revising && (
                        <button type="button" onClick={() => setRevising(true)} className="btn-outline btn-sm"><FilePenLine className="h-4 w-4" />Revisi invoice</button>
                    )}>
                        <div className="grid grid-cols-3 gap-3 text-center text-sm">
                            <div className="rounded-xl bg-sand-100 p-3"><p className="text-slate-500">Total ({o.pax_count} seat)</p><p className="font-bold">{rupiah(o.total_amount)}</p></div>
                            <div className="rounded-xl bg-emerald-50 p-3"><p className="text-slate-500">Dibayar</p><p className="font-bold text-emerald-700">{rupiah(o.paid_amount)}</p></div>
                            <div className="rounded-xl bg-amber-50 p-3"><p className="text-slate-500">Sisa</p><p className="font-bold text-amber-700">{rupiah(outstanding)}</p></div>
                        </div>
                        {revising && <RevisionForm o={o} flightDetails={flightDetails} extras={extras} seatsAvailable={seatsAvailable} onClose={() => setRevising(false)} />}
                        <InvoiceHistory invoices={invoices} />
                    </Card>

                    <ManifestCard o={o} manifest={manifest} count={passengers.length} files={documents.filter((d) => d.type === 'manifest')} canUpload={isAdmin && !closed} />

                    <Card title={`Penumpang (manifest) · ${passengers.length}/${o.pax_count}`} pad={false}>
                        {passengers.length === 0 && <p className="px-5 py-4 text-sm text-slate-500">Belum ada data penumpang. Pembeli mengunggah manifest setelah tagihan lunas.</p>}
                        <div className="overflow-x-auto"><table className="table-app">
                            {passengers.length > 0 && <thead><tr><th>No</th><th>Nama</th><th>L/P</th><th>Lahir</th><th>Paspor</th><th>Exp</th><th>Negara</th></tr></thead>}
                            <tbody className="divide-y divide-slate-100">{passengers.map((p, i) => <tr key={p.id}><td className="text-slate-500">{i + 1}</td><td className="font-medium">{p.title} {p.full_name}</td><td>{p.gender}</td><td>{p.birth_date}</td><td className="font-mono">{p.passport_number}</td><td>{p.passport_expiry}</td><td>{p.nationality}</td></tr>)}</tbody>
                        </table></div>
                    </Card>
                    <Card title="Transaksi" pad={false}>
                        <div className="overflow-x-auto"><table className="table-app"><tbody className="divide-y divide-slate-100">{payments.map((p) => <tr key={p.id}><td>{p.code}</td><td>{p.method_label}</td><td>{rupiah(p.amount)}</td><td><StatusBadge status={p.status} /></td><td>{dateTime(p.paid_at ?? p.created_at)}</td><td><ProofLink p={p} /></td></tr>)}</tbody></table></div>
                    </Card>
                </div>
                <div className="grid content-start items-start gap-6 md:grid-cols-2 2xl:grid-cols-1">
                    <Card title="Penerima invoice">
                        <DefList items={[
                            ['Pembeli', o.buyer_type === 'agen' ? 'Agen / Travel' : 'Perorangan / Keluarga'],
                            billTo?.company && ['Travel / perusahaan', billTo.company],
                            ['Penanggung jawab', billTo?.name ?? o.user.name],
                            billTo?.address && ['Alamat', billTo.address],
                            ['Email', o.contact_email], ['HP', o.contact_phone],
                            o.status === 'menunggu_pembayaran' && ['Batas bayar DP', dateTime(o.expires_at)],
                            o.settlement_due_at && ['Batas pelunasan', dateTime(o.settlement_due_at)],
                        ].filter(Boolean)} />
                    </Card>
                    <Card title="Detail penerbangan berlaku">
                        <DefList items={[['Maskapai', flightDetails.airline], ['No. flight', flightDetails.flight_number], ['Rute', flightDetails.route], ['Berangkat', flightDetails.depart], ['Kembali', flightDetails.return], ['PNR', flightDetails.pnr ?? o.pnr]]} />
                        <p className="mt-3 text-xs text-slate-500">Mengikuti invoice terbaru. Ubah lewat <b>Revisi invoice</b> — jadwal penerbangan mitra tidak ikut berubah.</p>
                    </Card>
                    {canIssue && (
                        <Card title={o.status === 'tiket_terbit' ? 'Terbitkan ulang e-ticket' : 'Terbitkan e-ticket'}>
                            {!manifest.uploaded_at && <p className="mb-3 flex gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-900"><AlertTriangle className="h-4 w-4 shrink-0" />Manifest penumpang belum diunggah pembeli.</p>}
                            <form onSubmit={(e) => { e.preventDefault(); issue.post(route('admin.flight-orders.issue', o.code), { forceFormData: true }); }} className="space-y-3">
                                <Input label="Kode booking (PNR)" value={issue.data.pnr} onChange={(e) => issue.setData('pnr', e.target.value.toUpperCase())} error={issue.errors.pnr} required />
                                <div><label className="label">File e-ticket (PDF/JPG)</label><input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => issue.setData('file', e.target.files[0])} className="text-sm" />{issue.errors.file && <p className="error">{issue.errors.file}</p>}</div>
                                <button disabled={issue.processing} className="btn-primary w-full"><Ticket className="h-4 w-4" />Terbitkan & kirim ke pelanggan</button>
                            </form>
                        </Card>
                    )}
                    {documents.some((d) => d.type !== 'manifest') && <Card title="Dokumen">{documents.filter((d) => d.type !== 'manifest').map((d) => <a key={d.id} href={d.url} className="block text-sm text-brand-700 hover:underline">{d.type_label}: {d.file_name}</a>)}</Card>}
                </div>
            </div>
        </AdminLayout>
    );
}

/** Manifest Excel dari pembeli: file asli (bisa diunduh) + catatan pemeriksaan; admin juga bisa mengunggah atas nama pembeli */
function ManifestCard({ o, manifest, count, files, canUpload }) {
    const form = useForm({ file: null });
    return (
        <Card title="Manifest penumpang">
            {manifest.uploaded_at ? (
                <p className="text-sm text-slate-700">Diunggah <b>{manifest.uploaded_at}</b> · terbaca <b>{count}</b> penumpang dari <b>{o.pax_count}</b> seat.</p>
            ) : (
                <p className="text-sm text-slate-500">{['dibayar', 'tiket_terbit'].includes(o.status) ? 'Tagihan sudah lunas, menunggu pembeli mengunggah manifest.' : 'Manifest diunggah pembeli setelah tagihan lunas.'}</p>
            )}
            {manifest.warnings.length > 0 && (
                <ul className="mt-3 space-y-1 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
                    {manifest.warnings.map((w, i) => <li key={i} className="flex gap-2 [overflow-wrap:anywhere]"><AlertTriangle className="h-3.5 w-3.5 shrink-0" />{w}</li>)}
                </ul>
            )}
            {files.length > 0 && (
                <ul className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-100">
                    {files.map((d, i) => (
                        <li key={d.id} className="flex items-center gap-3 p-3 text-sm">
                            <FileSpreadsheet className="h-5 w-5 shrink-0 text-emerald-600" />
                            <span className="min-w-0 flex-1 truncate">{d.original_name || d.file_name}<span className="block text-xs text-slate-500">{d.created_at}{i === 0 ? ' · terbaru' : ''}</span></span>
                            <a href={d.url} className="btn-ghost btn-sm"><Download className="h-4 w-4" />Unduh</a>
                        </li>
                    ))}
                </ul>
            )}
            {canUpload && (
                <form onSubmit={(e) => { e.preventDefault(); form.post(route('admin.flight-orders.manifest', o.code), { forceFormData: true, preserveScroll: true, onSuccess: () => form.reset() }); }} className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center">
                    <input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => form.setData('file', e.target.files[0])} className="min-w-0 flex-1 text-sm" />
                    <button disabled={form.processing || !form.data.file} className="btn-outline btn-sm shrink-0"><Upload className="h-4 w-4" />Unggah atas nama pembeli</button>
                </form>
            )}
            {form.errors.file && <p className="error">{form.errors.file}</p>}
        </Card>
    );
}

/** Riwayat invoice: invoice berlaku di atas, revisi sebelumnya berstatus "Direvisi" */
function InvoiceHistory({ invoices }) {
    if (!invoices.length) return <p className="mt-4 text-sm text-slate-500">Belum ada invoice.</p>;
    return (
        <ul className="mt-5 divide-y divide-slate-100 rounded-xl border border-slate-100">
            {invoices.map((i) => (
                <li key={i.id} className="flex flex-wrap items-start gap-3 p-3 text-sm">
                    <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-slate-900">{i.number}</span>
                            <StatusBadge status={i.status} />
                            {i.revision > 0 && <span className="text-xs text-slate-500">Revisi ke-{i.revision}</span>}
                        </p>
                        <p className="text-xs text-slate-500">
                            {i.issued_at}{i.by && ` · oleh ${i.by}`}
                            {i.seats_before != null && i.seats_before !== i.seats_after && ` · seat ${i.seats_before} → ${i.seats_after}`}
                            {i.refund > 0 && ` · dikembalikan ${rupiah(i.refund)}`}
                        </p>
                        {i.notes && <p className="mt-1 text-slate-600 [overflow-wrap:anywhere]">{i.notes}</p>}
                    </div>
                    <span className="font-bold text-slate-900">{rupiah(i.amount)}</span>
                    <a href={route('invoices.pdf', i.id)} target="_blank" rel="noopener" className="btn-ghost btn-sm"><Download className="h-4 w-4 text-red-600" />PDF</a>
                </li>
            ))}
        </ul>
    );
}

/**
 * Form revisi invoice: seat terpakai, harga per seat, biaya/potongan, detail penerbangan, alasan.
 * Ringkasan di bawah menghitung total baru dan apakah ada dana dikembalikan atau sisa tagihan.
 */
function RevisionForm({ o, flightDetails, extras, seatsAvailable, onClose }) {
    const form = useForm({
        seats: o.pax_count,
        unit_price: Number(o.unit_price),
        extras: extras.map((x) => ({ description: x.description, qty: x.qty, price: x.price })),
        flight: {
            airline: flightDetails.airline ?? '', flight_number: flightDetails.flight_number ?? '', route: flightDetails.route ?? '',
            depart: flightDetails.depart ?? '', return: flightDetails.return ?? '', pnr: flightDetails.pnr ?? o.pnr ?? '',
        },
        reason: '',
        adjust_stock: true,
    });
    const d = form.data;
    const err = (k) => form.errors[k];
    const setFlight = (k, v) => form.setData('flight', { ...d.flight, [k]: v });
    const setExtra = (i, k, v) => form.setData('extras', d.extras.map((x, j) => (j === i ? { ...x, [k]: v } : x)));

    const seats = Number(d.seats) || 0;
    const ticket = seats * (Number(d.unit_price) || 0);
    const extraTotal = d.extras.reduce((s, x) => s + (Number(x.qty) || 0) * (Number(x.price) || 0), 0);
    const total = ticket + extraTotal;
    const paid = Number(o.paid_amount);
    const refund = Math.max(0, paid - total);
    const due = Math.max(0, total - paid);
    const seatDiff = seats - o.pax_count;

    const submit = (e) => {
        e.preventDefault();
        const msg = `Terbitkan invoice revisi?\n\nTotal baru ${rupiah(total)}${refund > 0 ? `\nKelebihan bayar ${rupiah(refund)} dicatat sebagai refund.` : ''}${due > 0 ? `\nSisa tagihan ${rupiah(due)}.` : ''}`;
        if (!confirm(msg)) return;
        form.post(route('admin.flight-orders.revise', o.code), { preserveScroll: true, onSuccess: onClose });
    };

    return (
        <form onSubmit={submit} className="mt-5 space-y-5 rounded-2xl border-2 border-brand-200 bg-brand-50/30 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-slate-900">Revisi invoice</p>
                <button type="button" onClick={onClose} className="btn-ghost btn-sm" aria-label="Tutup"><X className="h-4 w-4" /></button>
            </div>

            <fieldset>
                <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-brand-800">Seat & harga</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                        <label className="label">Seat terpakai</label>
                        <div className="flex items-center gap-2">
                            <button type="button" onClick={() => form.setData('seats', Math.max(1, seats - 1))} className="btn-outline btn-sm" aria-label="Kurangi seat"><Minus className="h-4 w-4" /></button>
                            <input type="number" min={1} className="input text-center" value={d.seats} onChange={(e) => form.setData('seats', e.target.value)} />
                            <button type="button" onClick={() => form.setData('seats', seats + 1)} className="btn-outline btn-sm" aria-label="Tambah seat"><Plus className="h-4 w-4" /></button>
                        </div>
                        <p className="hint">Sebelumnya {o.pax_count} seat{seatDiff !== 0 && <b className={seatDiff < 0 ? 'text-red-600' : 'text-brand-700'}> ({seatDiff > 0 ? '+' : ''}{seatDiff})</b>}</p>
                        {err('seats') && <p className="error">{err('seats')}</p>}
                    </div>
                    <Input label="Harga per seat (Rp)" type="number" min={0} value={d.unit_price} onChange={(e) => form.setData('unit_price', e.target.value)} error={err('unit_price')} hint={rupiah(Number(d.unit_price) || 0)} />
                </div>
                {seatDiff !== 0 && (
                    <label className="mt-3 flex items-start gap-2 text-sm text-slate-700">
                        <input type="checkbox" className="mt-0.5" checked={d.adjust_stock} onChange={(e) => form.setData('adjust_stock', e.target.checked)} />
                        <span>{seatDiff < 0 ? `Kembalikan ${-seatDiff} seat ke stok penerbangan` : `Ambil ${seatDiff} seat dari stok penerbangan (sisa ${seatsAvailable})`}</span>
                    </label>
                )}
            </fieldset>

            <fieldset>
                <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-brand-800">Detail penerbangan</legend>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    <Input label="Maskapai" value={d.flight.airline} onChange={(e) => setFlight('airline', e.target.value)} error={err('flight.airline')} />
                    <Input label="No. flight" value={d.flight.flight_number} onChange={(e) => setFlight('flight_number', e.target.value)} error={err('flight.flight_number')} />
                    <Input label="Rute" value={d.flight.route} onChange={(e) => setFlight('route', e.target.value)} error={err('flight.route')} placeholder="KNO → KUL → JED" />
                    <Input label="Berangkat" value={d.flight.depart} onChange={(e) => setFlight('depart', e.target.value)} error={err('flight.depart')} placeholder="29 Nov 2026 08:10" />
                    <Input label="Kembali (opsional)" value={d.flight.return} onChange={(e) => setFlight('return', e.target.value)} error={err('flight.return')} placeholder="11 Des 2026 17:25" />
                    <Input label="PNR (opsional)" value={d.flight.pnr} onChange={(e) => setFlight('pnr', e.target.value.toUpperCase())} error={err('flight.pnr')} />
                </div>
            </fieldset>

            <fieldset>
                <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-brand-800">Biaya tambahan / potongan</legend>
                {d.extras.length === 0 && <p className="mb-2 text-sm text-slate-500">Tidak ada. Isi harga negatif untuk potongan (mis. -500000).</p>}
                <div className="space-y-2">
                    {d.extras.map((x, i) => (
                        <div key={i} className="grid grid-cols-[minmax(0,1fr)_70px_minmax(0,140px)_auto] items-start gap-2">
                            <div><input className="input" placeholder="Keterangan, mis. Biaya reissue" value={x.description} onChange={(e) => setExtra(i, 'description', e.target.value)} />{err(`extras.${i}.description`) && <p className="error">{err(`extras.${i}.description`)}</p>}</div>
                            <input type="number" min={1} className="input" aria-label="Qty" value={x.qty} onChange={(e) => setExtra(i, 'qty', e.target.value)} />
                            <input type="number" className="input" aria-label="Harga" placeholder="Harga" value={x.price} onChange={(e) => setExtra(i, 'price', e.target.value)} />
                            <button type="button" onClick={() => form.setData('extras', d.extras.filter((_, j) => j !== i))} className="btn-ghost btn-sm mt-1" aria-label="Hapus baris"><Trash2 className="h-4 w-4 text-red-600" /></button>
                        </div>
                    ))}
                </div>
                {d.extras.length < 10 && (
                    <button type="button" onClick={() => form.setData('extras', [...d.extras, { description: '', qty: 1, price: '' }])} className="btn-ghost btn-sm mt-2"><Plus className="h-4 w-4" />Tambah baris</button>
                )}
                {err('extras') && <p className="error">{err('extras')}</p>}
            </fieldset>

            <Textarea label="Alasan revisi (tampil di invoice & dikirim ke pelanggan)" rows={2} value={d.reason} onChange={(e) => form.setData('reason', e.target.value)} error={err('reason')} required
                placeholder="Mis. 2 seat dibatalkan karena alasan mendesak — seat terpakai 28." />

            <dl className="grid grid-cols-2 gap-3 rounded-xl bg-white p-3 text-sm ring-1 ring-slate-200 sm:grid-cols-4">
                <div><dt className="text-xs text-slate-500">Total lama</dt><dd className="font-semibold">{rupiah(o.total_amount)}</dd></div>
                <div><dt className="text-xs text-slate-500">Total baru</dt><dd className="font-bold text-brand-800">{rupiah(total)}</dd></div>
                <div><dt className="text-xs text-slate-500">Sudah dibayar</dt><dd className="font-semibold">{rupiah(paid)}</dd></div>
                {refund > 0
                    ? <div><dt className="text-xs text-slate-500">Dikembalikan (refund)</dt><dd className="font-bold text-violet-700">{rupiah(refund)}</dd></div>
                    : <div><dt className="text-xs text-slate-500">Sisa tagihan</dt><dd className="font-bold text-amber-700">{rupiah(due)}</dd></div>}
            </dl>
            {refund > 0 && <p className="text-xs text-slate-500">Kelebihan bayar otomatis tercatat di menu <b>Refund</b> (status disetujui) — tinggal transfer & unggah bukti.</p>}

            <div className="flex flex-wrap justify-end gap-2">
                <button type="button" onClick={onClose} className="btn-outline">Batal</button>
                <button disabled={form.processing} className="btn-primary"><FilePenLine className="h-4 w-4" />Terbitkan invoice revisi</button>
            </div>
        </form>
    );
}
