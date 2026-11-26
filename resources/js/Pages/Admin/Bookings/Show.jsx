import { Link, useForm, usePage } from '@inertiajs/react';
import { Ban, BedDouble, CalendarDays, Download, History, Hotel, Mail, MessageSquare, Plane, Repeat, Star, UserMinus, Users, XCircle } from 'lucide-react';
import { ProofLink } from '@/Components/PaymentProof';
import { useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Card, DefList, PageHeader, Progress, StatusBadge } from '@/Components/ui';
import { date, dateTime, rupiah } from '@/lib/format';

const CLOSED = ['dibatalkan', 'refund', 'selesai', 'kedaluwarsa'];

export default function Show({ booking: b, customer, passengers, payments, outstanding, overdue, reminders, documents, changes = [], refundRequests = [], categories = {}, invoiceNumber, roomLabel }) {
    const { auth } = usePage().props;
    const canOps = auth.user.role === 'admin';
    const editable = canOps && !CLOSED.includes(b.status);
    const pending = refundRequests.find((r) => r.status === 'diajukan');

    return (
        <AdminLayout title="Detail Pesanan Umrah">
            <PageHeader back={route('admin.bookings.index')} actions={<StatusBadge status={b.status} />} />
            {['dibatalkan', 'refund'].includes(b.status) && (
                <div className={`mb-6 rounded-2xl p-4 text-sm ring-1 ${b.status === 'refund' ? 'bg-violet-50 text-violet-900 ring-violet-200' : 'bg-red-50 text-red-800 ring-red-200'}`}>
                    <b>{b.status === 'refund' ? 'Dibatalkan dengan refund.' : 'Dibatalkan.'}</b> {b.cancel_reason}
                </div>
            )}
            {pending && (
                <div className="mb-6 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
                    Pelanggan mengajukan <b>{pending.type_label.toLowerCase()}</b> ({pending.code}){pending.passengers.length > 0 && <> untuk <b>{pending.passengers.join(', ')}</b></>} — diminta {rupiah(pending.requested_amount)}.
                    <span className="block text-xs">Alasan: {pending.reason}</span>
                    <Link href={route('admin.refunds.index', { q: pending.code })} className="mt-2 inline-flex font-semibold underline">Tinjau di menu Refund</Link> atau proses langsung lewat panel <b>Ubah pesanan</b> di bawah.
                </div>
            )}
            {overdue && <div className="mb-6 rounded-2xl bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200">Pesanan melewati batas pelunasan ({date(b.payment_deadline)}). Pengingat email & WhatsApp dikirim otomatis setiap hari.</div>}

            <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="min-w-0 space-y-6">
                    <BookingSummary b={b} customer={customer} passengers={passengers} categories={categories} invoiceNumber={invoiceNumber} roomLabel={roomLabel} />
                    <Card title="Pembayaran">
                        <div className="grid grid-cols-3 gap-3 text-center text-sm">
                            <div className="rounded-xl bg-sand-100 p-3"><p className="text-slate-500">Total</p><p className="font-bold">{rupiah(b.total_amount)}</p></div>
                            <div className="rounded-xl bg-emerald-50 p-3"><p className="text-slate-500">Dibayar</p><p className="font-bold text-emerald-700">{rupiah(b.paid_amount)}</p></div>
                            <div className="rounded-xl bg-amber-50 p-3"><p className="text-slate-500">Sisa</p><p className="font-bold text-amber-700">{rupiah(outstanding)}</p></div>
                        </div>
                        <Progress className="mt-3" value={(b.paid_amount / b.total_amount) * 100} />
                        <div className="mt-4 overflow-x-auto"><table className="table-app">
                            <thead><tr><th>Termin</th><th>Jatuh tempo</th><th className="!text-right">Nominal</th><th className="!text-right">Dibayar</th><th>Status</th><th>Pengingat</th></tr></thead>
                            <tbody className="divide-y divide-slate-100">{b.installments.map((i) => <tr key={i.id}><td>{i.label}</td><td>{date(i.due_date)}</td><td className="text-right">{rupiah(i.amount)}</td><td className="text-right">{rupiah(i.paid_amount)}</td><td><StatusBadge status={i.status} /></td><td>{i.reminder_count}×</td></tr>)}</tbody>
                        </table></div>
                    </Card>
                    <Card title="Transaksi" pad={false}>
                        <div className="overflow-x-auto"><table className="table-app">
                            <thead><tr><th>Kode</th><th>Metode</th><th>VA</th><th className="!text-right">Nominal</th><th>Status</th><th>Waktu</th><th>Bukti bayar</th></tr></thead>
                            <tbody className="divide-y divide-slate-100">{payments.map((p) => <tr key={p.id}><td className="font-medium">{p.code}</td><td>{p.method_label}</td><td className="font-mono text-xs">{p.va_number ?? '-'}</td><td className="text-right">{rupiah(p.amount)}</td><td><StatusBadge status={p.status} /></td><td>{dateTime(p.paid_at ?? p.created_at)}</td><td><ProofLink p={p} /></td></tr>)}</tbody>
                        </table></div>
                    </Card>
                    <Card title={`Jamaah (${passengers.length})`} pad={false}>
                        <div className="overflow-x-auto"><table className="table-app">
                            {/* Info yang berkaitan digabung per kolom agar tabel muat di dalam card */}
                            <thead><tr><th>Jamaah</th><th>L/P · Tgl lahir</th><th>Paspor</th><th>NIK</th><th>Mahram</th><th className="!text-right">Harga</th></tr></thead>
                            <tbody className="divide-y divide-slate-100">{passengers.map((p) => (
                                <tr key={p.id}>
                                    <td><p className="font-medium text-slate-900">{p.full_name}</p><p className="text-xs text-slate-500">{categories[p.category] ?? p.category}</p></td>
                                    <td><p>{p.gender ?? '-'}</p><p className="text-xs text-slate-500">{p.birth_date ?? '-'}</p></td>
                                    <td><p className="font-mono">{p.passport_number ?? '-'}</p>{p.passport_expiry && <p className="text-xs text-slate-500">Exp {p.passport_expiry}</p>}</td>
                                    <td className="font-mono text-xs">{p.nik ?? '-'}</td>
                                    <td>{p.mahram_name ? <><p>{p.mahram_name}</p><p className="text-xs text-slate-500">{p.mahram_relation}</p></> : '-'}</td>
                                    <td className="text-right">{rupiah(p.price)}</td>
                                </tr>
                            ))}</tbody>
                        </table></div>
                    </Card>
                    {editable && <AdjustCard b={b} passengers={passengers} categories={categories} pending={pending} />}
                    {changes.length > 0 && (
                        <Card title="Riwayat perubahan pesanan">
                            <ul className="space-y-3 text-sm">
                                {changes.map((c) => (
                                    <li key={c.id} className="flex gap-3">
                                        <History className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                                        <div><p><b>{c.type_label}</b> <span className="text-xs text-slate-400">{c.at} · oleh {c.by ?? 'Sistem'}</span></p>
                                            <p className="text-slate-600">{c.description}</p>
                                            <p className="text-xs text-slate-500">Total {rupiah(c.old_total)} → <b>{rupiah(c.new_total)}</b>{c.refund_amount > 0 && ` · dana dikembalikan ${rupiah(c.refund_amount)}`}</p></div>
                                    </li>
                                ))}
                            </ul>
                        </Card>
                    )}
                    {documents.length > 0 && (
                        <Card title="Dokumen jamaah">
                            <ul className="space-y-2">{documents.map((d) => <li key={d.id} className="flex items-center justify-between text-sm"><a href={d.url} className="text-brand-700 hover:underline">{d.type_label} — {d.file_name}</a><StatusBadge status={d.status} /></li>)}</ul>
                        </Card>
                    )}
                </div>
                <div className="grid content-start items-start gap-6 md:grid-cols-2 2xl:grid-cols-1">
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

const MODES = [
    ['kurangi', 'Pengurangan', UserMinus, 'Kurangi jumlah jamaah, mis. 2 tiket → 1.'],
    ['ubah', 'Perubahan', Repeat, 'Ubah kategori/harga, mis. 2 dewasa → 1 dewasa + 1 anak.'],
    ['batal', 'Batalkan pesanan', Ban, 'Semua jamaah batal; status Refund bila dana dikembalikan.'],
];
const round1000 = (n) => Math.max(0, Math.floor(n / 1000) * 1000);

/**
 * Ubah pesanan oleh admin:
 *  - Pengurangan: jamaah dikeluarkan, kursi dilepas, total & cicilan dihitung ulang.
 *  - Perubahan: kategori & harga per jamaah (dewasa → anak lebih murah).
 *  - Batalkan: seluruh pesanan; status Refund bila ada dana dikembalikan, Dibatalkan bila tidak.
 * Dana dikembalikan otomatis tercatat di menu Refund (tinggal transfer & unggah bukti).
 */
function AdjustCard({ b, passengers, categories, pending }) {
    const [mode, setMode] = useState(pending?.type === 'pembatalan' ? 'batal' : pending?.type === 'pengurangan' ? 'kurangi' : 'kurangi');
    const paid = Number(b.paid_amount);
    const total = Number(b.total_amount);

    return (
        <Card title="Ubah pesanan">
            <div className="mb-4 grid gap-2 sm:grid-cols-3">
                {MODES.map(([k, l, Icon, hint]) => (
                    <button key={k} type="button" onClick={() => setMode(k)}
                        className={`flex items-start gap-2.5 rounded-xl border-2 p-3 text-left transition ${mode === k ? (k === 'batal' ? 'border-red-500 bg-red-50' : 'border-brand-600 bg-brand-50') : 'border-slate-200 hover:border-slate-300'}`}>
                        <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${k === 'batal' ? 'text-red-600' : 'text-brand-700'}`} />
                        <span><span className="block text-sm font-semibold">{l}</span><span className="block text-xs text-slate-500">{hint}</span></span>
                    </button>
                ))}
            </div>
            {mode === 'kurangi' && <ReduceForm b={b} passengers={passengers} paid={paid} total={total} pending={pending} />}
            {mode === 'ubah' && <ChangeForm b={b} passengers={passengers} categories={categories} paid={paid} />}
            {mode === 'batal' && <CancelForm b={b} paid={paid} pending={pending} />}
        </Card>
    );
}

function Summary({ rows }) {
    return (
        <dl className="grid grid-cols-2 gap-2 rounded-xl bg-sand-50 p-3 text-sm sm:grid-cols-4">
            {rows.map(([k, v, cls]) => <div key={k}><dt className="text-xs text-slate-500">{k}</dt><dd className={`font-bold ${cls ?? ''}`}>{v}</dd></div>)}
        </dl>
    );
}

function RefundField({ form, min, max }) {
    return (
        <div>
            <label className="label">Dana dikembalikan ke pelanggan</label>
            <input type="number" className="input" min={min} max={max} value={form.data.refund_amount} onChange={(e) => form.setData('refund_amount', e.target.value)} />
            <p className="hint">Minimal {rupiah(min)} (kelebihan bayar) · maksimal {rupiah(max)} (total dibayar). Isi 0 bila dana tetap dipakai untuk sisa tagihan.</p>
            {form.errors.refund_amount && <p className="error">{form.errors.refund_amount}</p>}
        </div>
    );
}

function ReduceForm({ b, passengers, paid, total, pending }) {
    const preset = pending?.type === 'pengurangan' ? passengers.filter((p) => pending.passengers.includes(p.full_name)).map((p) => p.id) : [];
    const form = useForm({ passenger_ids: preset, refund_amount: 0, reason: pending?.type === 'pengurangan' ? pending.reason : '' });
    const removed = passengers.filter((p) => form.data.passenger_ids.includes(p.id));
    const newTotal = total - removed.reduce((s, p) => s + Number(p.price), 0);
    const minRefund = Math.max(0, paid - newTotal);
    const share = total ? round1000((paid * (total - newTotal)) / total) : 0; // porsi dana jamaah yang dikeluarkan
    const toggle = (id) => {
        const ids = form.data.passenger_ids.includes(id) ? form.data.passenger_ids.filter((x) => x !== id) : [...form.data.passenger_ids, id];
        const nt = total - passengers.filter((p) => ids.includes(p.id)).reduce((s, p) => s + Number(p.price), 0);
        form.setData((d) => ({ ...d, passenger_ids: ids, refund_amount: Math.max(Math.max(0, paid - nt), total ? round1000((paid * (total - nt)) / total) : 0) }));
    };
    const submit = (e) => {
        e.preventDefault();
        if (confirm(`Keluarkan ${removed.length} jamaah dari pesanan ${b.code}? Total menjadi ${rupiah(newTotal)}.`)) form.post(route('admin.bookings.reduce', b.code), { preserveScroll: true, onSuccess: () => form.reset() });
    };

    return (
        <form onSubmit={submit} className="space-y-4">
            <div>
                <label className="label">Pilih jamaah yang dikurangi</label>
                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                    {passengers.map((p) => (
                        <label key={p.id} className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-slate-50">
                            <input type="checkbox" checked={form.data.passenger_ids.includes(p.id)} onChange={() => toggle(p.id)}
                                disabled={!form.data.passenger_ids.includes(p.id) && form.data.passenger_ids.length >= passengers.length - 1} />
                            <span className="flex-1 font-medium">{p.full_name}</span><span className="text-xs text-slate-500">{p.category}</span><span className="w-32 text-right">{rupiah(p.price)}</span>
                        </label>
                    ))}
                </div>
                {form.errors.passenger_ids && <p className="error">{form.errors.passenger_ids}</p>}
            </div>
            {removed.length > 0 && (
                <>
                    <Summary rows={[['Total lama', rupiah(total)], ['Total baru', rupiah(newTotal), 'text-brand-800'], ['Sudah dibayar', rupiah(paid)], ['Porsi jamaah keluar', rupiah(share)]]} />
                    <RefundField form={form} min={minRefund} max={paid} />
                    <p className="text-xs text-slate-500">Setelah disimpan: dibayar {rupiah(paid - Number(form.data.refund_amount || 0))} · sisa tagihan {rupiah(Math.max(0, newTotal - (paid - Number(form.data.refund_amount || 0))))}</p>
                </>
            )}
            <textarea className="input min-h-[70px]" placeholder="Alasan pengurangan (dikirim ke pelanggan)" value={form.data.reason} onChange={(e) => form.setData('reason', e.target.value)} />
            {form.errors.reason && <p className="error">{form.errors.reason}</p>}
            <button disabled={!removed.length || !form.data.reason || form.processing} className="btn-primary btn-sm"><UserMinus className="h-4 w-4" />Simpan pengurangan</button>
        </form>
    );
}

function ChangeForm({ b, passengers, categories, paid }) {
    const form = useForm({ passengers: passengers.map((p) => ({ id: p.id, name: p.full_name, category: p.category, price: p.price, age: p.age })), refund_amount: 0, reason: '' });
    const total = passengers.reduce((s, p) => s + Number(p.price), 0);
    const newTotal = form.data.passengers.reduce((s, p) => s + Number(p.price || 0), 0);
    const minRefund = Math.max(0, paid - newTotal);
    const set = (i, patch) => {
        const list = form.data.passengers.map((x, j) => (j === i ? { ...x, ...patch } : x));
        const nt = list.reduce((s, p) => s + Number(p.price || 0), 0);
        form.setData((d) => ({ ...d, passengers: list, refund_amount: Math.max(0, paid - nt) }));
    };
    const changed = form.data.passengers.some((p, i) => p.category !== passengers[i].category || Number(p.price) !== Number(passengers[i].price));
    const submit = (e) => {
        e.preventDefault();
        form.transform((d) => ({ ...d, passengers: d.passengers.map(({ id, category, price }) => ({ id, category, price: Number(price) })) }));
        form.post(route('admin.bookings.change', b.code), { preserveScroll: true, onSuccess: () => form.reset('reason') });
    };

    return (
        <form onSubmit={submit} className="space-y-4">
            <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="table-app">
                    <thead><tr><th>Jamaah</th><th>Kategori</th><th className="!text-right">Harga</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                        {form.data.passengers.map((p, i) => (
                            <tr key={p.id}>
                                <td className="font-medium">{p.name}{p.age != null && <span className="block text-xs font-normal text-slate-400">{p.age} tahun</span>}</td>
                                <td><select className="input w-auto py-1.5" value={p.category} onChange={(e) => set(i, { category: e.target.value })}>{Object.entries(categories).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></td>
                                <td className="text-right"><input type="number" min={0} step={1000} className="input ml-auto w-40 py-1.5 text-right" value={p.price} onChange={(e) => set(i, { price: e.target.value })} /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {form.errors.changes && <p className="error">{form.errors.changes}</p>}
            {changed && (
                <>
                    <Summary rows={[['Total lama', rupiah(total)], ['Total baru', rupiah(newTotal), 'text-brand-800'], ['Selisih', rupiah(newTotal - total), newTotal < total ? 'text-emerald-700' : 'text-red-600'], ['Sudah dibayar', rupiah(paid)]]} />
                    {paid > 0 && <RefundField form={form} min={minRefund} max={paid} />}
                </>
            )}
            <textarea className="input min-h-[70px]" placeholder="Alasan perubahan, mis. salah satu jamaah ternyata anak usia 10 tahun" value={form.data.reason} onChange={(e) => form.setData('reason', e.target.value)} />
            {form.errors.reason && <p className="error">{form.errors.reason}</p>}
            <button disabled={!changed || !form.data.reason || form.processing} className="btn-primary btn-sm"><Repeat className="h-4 w-4" />Simpan perubahan</button>
        </form>
    );
}

function CancelForm({ b, paid, pending }) {
    const form = useForm({ reason: pending?.type === 'pembatalan' ? pending.reason : '', refund_amount: pending?.type === 'pembatalan' ? Math.min(paid, pending.requested_amount) : paid });
    const refund = Number(form.data.refund_amount || 0);
    const submit = (e) => {
        e.preventDefault();
        if (confirm(`Batalkan seluruh pesanan ${b.code}? Kursi dilepas dan status menjadi ${refund > 0 ? 'REFUND' : 'DIBATALKAN'}.`)) form.post(route('admin.bookings.cancel', b.code), { preserveScroll: true });
    };

    return (
        <form onSubmit={submit} className="space-y-4">
            {paid > 0 && (
                <div>
                    <label className="label">Dana dikembalikan ke pelanggan</label>
                    <input type="number" className="input" min={0} max={paid} value={form.data.refund_amount} onChange={(e) => form.setData('refund_amount', e.target.value)} />
                    <p className="hint">Sudah dibayar {rupiah(paid)}. Potong sesuai kebijakan refund bila perlu. Isi 0 bila tidak ada dana dikembalikan.</p>
                    {form.errors.refund_amount && <p className="error">{form.errors.refund_amount}</p>}
                </div>
            )}
            <textarea className="input min-h-[70px]" placeholder="Alasan pembatalan (dikirim ke pelanggan)" value={form.data.reason} onChange={(e) => form.setData('reason', e.target.value)} />
            {form.errors.reason && <p className="error">{form.errors.reason}</p>}
            <p className="text-xs text-slate-500">Status setelah dibatalkan: <StatusBadge status={refund > 0 ? 'refund' : 'dibatalkan'} /></p>
            <button disabled={!form.data.reason || form.processing} className="btn btn-sm rounded-xl bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"><XCircle className="h-4 w-4" />Batalkan pesanan</button>
        </form>
    );
}

/** H-xx menuju tanggal (berdasarkan tanggal saja) */
const daysUntil = (iso) => {
    if (!iso) return null;
    const t = new Date(); t.setHours(0, 0, 0, 0);
    return Math.round((new Date(`${String(iso).slice(0, 10)}T00:00:00`) - t) / 86400000);
};

const Stars = ({ n }) => n ? <span className="inline-flex text-gold-500">{Array.from({ length: n }, (_, i) => <Star key={i} className="h-3 w-3 fill-current" />)}</span> : null;

/**
 * Kartu ringkasan di paling atas: paket yang diambil, tanggal berangkat/pulang (H-xx), jumlah jamaah
 * (per kategori & jenis kelamin), kamar, hotel, maskapai, pemesan & No. invoice.
 */
function BookingSummary({ b, customer, passengers, categories, invoiceNumber, roomLabel }) {
    const p = b.departure.package;
    const dep = b.departure;
    const h = daysUntil(dep.departure_date);
    const count = (key, val) => passengers.filter((x) => x[key] === val).length;
    const byCategory = Object.entries(categories).map(([k, label]) => [label, count('category', k)]).filter(([, n]) => n > 0);
    const male = count('gender', 'L');
    const female = count('gender', 'P');

    const Item = ({ icon: Icon, label, children }) => (
        <div className="flex min-w-0 gap-3 rounded-xl bg-slate-50 p-3">
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
            <div className="min-w-0"><p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p><div className="mt-0.5 text-sm font-semibold text-slate-900 [overflow-wrap:anywhere]">{children}</div></div>
        </div>
    );

    return (
        <Card title="Ringkasan pesanan">
            <div className="flex flex-col gap-5 sm:flex-row">
                {p.cover_url && <img src={p.cover_url} alt="" className="h-40 w-full shrink-0 rounded-xl object-cover object-top sm:h-44 sm:w-36" />}
                <div className="min-w-0 flex-1 space-y-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Paket umrah{p.type ? ` · ${p.type}` : ''}</p>
                        <h2 className="mt-0.5 font-sans text-xl font-bold text-slate-900">{p.name}</h2>
                        <p className="mt-1 text-sm text-slate-500">
                            {p.duration_days} hari{p.departure_city && ` · berangkat dari ${p.departure_city}`}
                            {invoiceNumber && <> · <span className="font-medium text-slate-700">{invoiceNumber}</span></>}
                        </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        <Item icon={CalendarDays} label="Berangkat">
                            {date(dep.departure_date)}
                            {h !== null && !['dibatalkan', 'refund', 'kedaluwarsa'].includes(b.status) && (
                                <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-bold ${h < 0 ? 'bg-slate-200 text-slate-600' : h <= 30 ? 'bg-amber-100 text-amber-800' : 'bg-brand-50 text-brand-700'}`}>{h < 0 ? 'sudah berangkat' : h === 0 ? 'hari ini' : `H-${h}`}</span>
                            )}
                        </Item>
                        <Item icon={CalendarDays} label="Pulang">{dep.return_date ? date(dep.return_date) : '-'}</Item>
                        <Item icon={Users} label="Jamaah berangkat">
                            {b.pax_count} orang
                            <p className="text-xs font-normal text-slate-500">
                                {[...byCategory.map(([l, n]) => `${n} ${l.toLowerCase()}`), male && `${male} laki-laki`, female && `${female} perempuan`].filter(Boolean).join(' · ')}
                            </p>
                        </Item>
                        <Item icon={BedDouble} label="Tipe kamar">{roomLabel}</Item>
                        <Item icon={Hotel} label="Hotel Makkah">{p.hotel_makkah || '-'} <Stars n={p.hotel_makkah_star} /></Item>
                        <Item icon={Hotel} label="Hotel Madinah">{p.hotel_madinah || '-'} <Stars n={p.hotel_madinah_star} /></Item>
                        <Item icon={Plane} label="Maskapai">{p.airline || '-'}</Item>
                        <Item icon={CalendarDays} label="Dipesan">{dateTime(b.created_at)}<p className="text-xs font-normal text-slate-500">Skema {b.payment_scheme === 'lunas' ? 'bayar lunas' : 'cicilan'}</p></Item>
                    </div>
                </div>
            </div>
        </Card>
    );
}
