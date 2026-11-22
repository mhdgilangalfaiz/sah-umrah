import { useForm } from '@inertiajs/react';
import { Ban, ChevronDown, RotateCcw, UserMinus, Wallet } from 'lucide-react';
import { useState } from 'react';
import CustomerLayout from '@/Layouts/CustomerLayout';
import { Card, Empty, Input, PageHeader, Select, StatusBadge, Textarea, cx } from '@/Components/ui';
import { rupiah } from '@/lib/format';

const TYPES = [
    ['pembatalan', 'Batalkan seluruh pesanan', 'Semua jamaah batal berangkat. Dana dikembalikan sesuai kebijakan refund.', Ban],
    ['pengurangan', 'Kurangi jamaah', 'Sebagian jamaah batal (mis. 2 orang → 1 orang). Pesanan tetap berjalan untuk jamaah lain.', UserMinus],
    ['refund', 'Pengembalian dana saja', 'Mis. pembayaran ganda / kelebihan bayar. Pesanan tidak dibatalkan.', Wallet],
];

/** Nilai awal dari tautan "Ajukan pembatalan" di detail pesanan: ?pesanan=booking:SAH-U-…&jenis=pengurangan */
const fromUrl = () => {
    try {
        const q = new URLSearchParams(window.location.search);
        return { order: q.get('pesanan') ?? '', type: q.get('jenis') ?? '' };
    } catch { return { order: '', type: '' }; }
};

export default function Refunds({ refunds, eligible, policy }) {
    const [showPolicy, setShowPolicy] = useState(false);
    const init = fromUrl();
    const initOrder = eligible.find((e) => `${e.type}:${e.code}` === init.order);
    const initType = initOrder ? (init.type && (init.type !== 'pengurangan' || initOrder.type === 'booking') ? init.type : 'pembatalan') : 'pembatalan';
    const { data, setData, post, processing, errors, reset, transform } = useForm({
        order: initOrder ? init.order : '', order_type: initOrder?.type ?? '', order_code: initOrder?.code ?? '', type: initType, passenger_ids: [],
        amount: initOrder && initType === 'pembatalan' ? initOrder.paid : '', reason: '', bank_name: '', account_number: '', account_holder: '', proof: null,
    });
    const selected = eligible.find((e) => `${e.type}:${e.code}` === data.order);
    const isBooking = selected?.type === 'booking';

    // Saran nominal pengurangan: porsi dana jamaah yang dibatalkan (proporsional terhadap total)
    const suggest = (type, order, ids) => {
        if (!order) return '';
        if (type === 'pembatalan') return order.paid;
        if (type === 'pengurangan') {
            const removed = (order.passengers ?? []).filter((p) => ids.includes(p.id)).reduce((s, p) => s + p.price, 0);
            return order.total ? Math.floor((order.paid * removed) / order.total / 1000) * 1000 : 0;
        }
        return '';
    };
    const pick = (v) => {
        const order = eligible.find((e) => `${e.type}:${e.code}` === v);
        const type = data.type === 'pengurangan' && order?.type !== 'booking' ? 'pembatalan' : data.type;
        setData((d) => ({ ...d, order: v, order_type: order?.type ?? '', order_code: order?.code ?? '', type, passenger_ids: [], amount: suggest(type, order, []) }));
    };
    const setType = (type) => setData((d) => ({ ...d, type, passenger_ids: [], amount: suggest(type, selected, []) }));
    const togglePax = (id) => {
        const ids = data.passenger_ids.includes(id) ? data.passenger_ids.filter((x) => x !== id) : [...data.passenger_ids, id];
        setData((d) => ({ ...d, passenger_ids: ids, amount: suggest(d.type, selected, ids) }));
    };
    const needBank = Number(data.amount) > 0;

    const submit = (e) => {
        e.preventDefault();
        transform(({ order, ...d }) => d);
        post(route('customer.refunds.store'), { forceFormData: true, preserveScroll: true, onSuccess: () => reset() });
    };

    return (
        <CustomerLayout title="Refund">
            <PageHeader title="Pembatalan & Refund" subtitle="Batalkan pesanan, kurangi jumlah jamaah, atau ajukan pengembalian dana. Diproses admin sesuai kebijakan refund." />
            <div className="card mb-6 overflow-hidden">
                <button onClick={() => setShowPolicy(!showPolicy)} className="flex w-full items-center justify-between p-4 text-left font-semibold">Kebijakan Refund <ChevronDown className={`h-5 w-5 transition ${showPolicy ? 'rotate-180' : ''}`} /></button>
                {showPolicy && <div className="prose-app border-t border-slate-100 p-5 text-sm" dangerouslySetInnerHTML={{ __html: policy }} />}
            </div>

            {eligible.length > 0 && (
                <Card title="Ajukan pembatalan / refund" className="mb-6">
                    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
                        <Select className="sm:col-span-2" label="Pesanan" value={data.order} onChange={(e) => pick(e.target.value)} placeholder="Pilih pesanan"
                            options={Object.fromEntries(eligible.map((e) => [`${e.type}:${e.code}`, `${e.label} — dibayar ${rupiah(e.paid)}`]))} error={errors.order_code} required />

                        <div className="sm:col-span-2">
                            <label className="label">Jenis pengajuan</label>
                            <div className="grid gap-2 md:grid-cols-3">
                                {TYPES.filter(([k]) => k !== 'pengurangan' || !selected || isBooking).map(([k, title, text, Icon]) => (
                                    <button key={k} type="button" onClick={() => setType(k)}
                                        className={cx('flex items-start gap-3 rounded-xl border-2 p-3 text-left transition', data.type === k ? 'border-brand-600 bg-brand-50' : 'border-slate-200 hover:border-slate-300')}>
                                        <Icon className={cx('mt-0.5 h-5 w-5 shrink-0', data.type === k ? 'text-brand-700' : 'text-slate-400')} />
                                        <span><span className="block text-sm font-semibold">{title}</span><span className="block text-xs text-slate-500">{text}</span></span>
                                    </button>
                                ))}
                            </div>
                            {errors.type && <p className="error">{errors.type}</p>}
                        </div>

                        {data.type === 'pengurangan' && isBooking && (
                            <div className="sm:col-span-2">
                                <label className="label">Jamaah yang dibatalkan</label>
                                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                                    {selected.passengers.map((p) => (
                                        <label key={p.id} className="flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm hover:bg-slate-50">
                                            <input type="checkbox" checked={data.passenger_ids.includes(p.id)} onChange={() => togglePax(p.id)}
                                                disabled={!data.passenger_ids.includes(p.id) && data.passenger_ids.length >= selected.passengers.length - 1} />
                                            <span className="flex-1 font-medium">{p.name}</span><span className="text-slate-500">{rupiah(p.price)}</span>
                                        </label>
                                    ))}
                                </div>
                                <p className="hint">Minimal satu jamaah tetap berangkat. Untuk membatalkan semua, pilih "Batalkan seluruh pesanan".</p>
                                {errors.passenger_ids && <p className="error">{errors.passenger_ids}</p>}
                            </div>
                        )}

                        <Input label="Dana yang diminta dikembalikan" type="number" min={0} value={data.amount} max={selected?.paid} onChange={(e) => setData('amount', e.target.value)} error={errors.amount}
                            hint={data.type === 'refund' ? undefined : 'Saran otomatis; nominal akhir ditentukan admin sesuai kebijakan refund.'} required />
                        <Input label="Nama bank" placeholder="Mandiri / BSI / Muamalat / ..." value={data.bank_name} onChange={(e) => setData('bank_name', e.target.value)} error={errors.bank_name} required={needBank} />
                        <Input label="Nomor rekening" inputMode="numeric" value={data.account_number} onChange={(e) => setData('account_number', e.target.value.replace(/\D/g, ''))} error={errors.account_number} hint="Disimpan terenkripsi" required={needBank} />
                        <Input label="Atas nama" value={data.account_holder} onChange={(e) => setData('account_holder', e.target.value)} error={errors.account_holder} required={needBank} />
                        <Textarea className="sm:col-span-2" label="Alasan pengajuan" value={data.reason} onChange={(e) => setData('reason', e.target.value)} error={errors.reason} required />
                        <div className="sm:col-span-2">
                            <label className="label">Foto / berkas bukti {data.type === 'refund' ? <span className="text-red-500">*</span> : <span className="font-normal text-slate-400">(opsional)</span>}</label>
                            <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={(e) => setData('proof', e.target.files[0])} className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:font-semibold file:text-brand-700" />
                            <p className="hint">Mis. foto identitas pemesan, surat keterangan, atau bukti pembayaran ganda. Maks. 5 MB.</p>
                            {errors.proof && <p className="error">{errors.proof}</p>}
                        </div>
                        <div className="sm:col-span-2"><button disabled={processing} className="btn-primary"><RotateCcw className="h-4 w-4" />Kirim Pengajuan</button></div>
                    </form>
                </Card>
            )}

            <Card title="Riwayat pengajuan" pad={false}>
                {refunds.length === 0 ? <Empty title="Belum ada pengajuan" /> : (
                    <ul className="divide-y divide-slate-100">
                        {refunds.map((r) => (
                            <li key={r.code} className="p-5">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="font-semibold">{r.code} <span className="font-normal text-slate-500">· {r.type_label} · {r.order} · {r.created_at}</span></p>
                                    <StatusBadge status={r.status} />
                                </div>
                                <p className="mt-1 text-sm text-slate-600">Diajukan {rupiah(r.requested_amount)}{r.approved_amount != null && <> · disetujui <b>{rupiah(r.approved_amount)}</b></>}</p>
                                {r.admin_note && <p className="mt-1 text-sm text-slate-500">Catatan admin: {r.admin_note}</p>}
                            </li>
                        ))}
                    </ul>
                )}
            </Card>
        </CustomerLayout>
    );
}
