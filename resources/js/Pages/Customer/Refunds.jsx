import { useForm } from '@inertiajs/react';
import { ChevronDown, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import CustomerLayout from '@/Layouts/CustomerLayout';
import { Card, Empty, Input, PageHeader, Select, StatusBadge, Textarea } from '@/Components/ui';
import { rupiah } from '@/lib/format';

export default function Refunds({ refunds, eligible, policy }) {
    const [showPolicy, setShowPolicy] = useState(false);
    const { data, setData, post, processing, errors, reset } = useForm({ order: '', order_type: '', order_code: '', amount: '', reason: '', bank_name: '', account_number: '', account_holder: '', proof: null });
    const selected = eligible.find((e) => `${e.type}:${e.code}` === data.order);

    const pick = (v) => {
        const [t, c] = v.split(':');
        setData((d) => ({ ...d, order: v, order_type: t ?? '', order_code: c ?? '', amount: eligible.find((e) => `${e.type}:${e.code}` === v)?.paid ?? '' }));
    };

    return (
        <CustomerLayout title="Refund">
            <PageHeader title="Pengajuan Refund & Pembatalan" subtitle="Diproses oleh tim Finance sesuai kebijakan refund." />
            <div className="card mb-6 overflow-hidden">
                <button onClick={() => setShowPolicy(!showPolicy)} className="flex w-full items-center justify-between p-4 text-left font-semibold">Kebijakan Refund <ChevronDown className={`h-5 w-5 transition ${showPolicy ? 'rotate-180' : ''}`} /></button>
                {showPolicy && <div className="prose-app border-t border-slate-100 p-5 text-sm" dangerouslySetInnerHTML={{ __html: policy }} />}
            </div>

            {eligible.length > 0 && (
                <Card title="Ajukan refund" className="mb-6">
                    <form onSubmit={(e) => { e.preventDefault(); post(route('customer.refunds.store'), { forceFormData: true, onSuccess: () => reset() }); }} className="grid gap-4 sm:grid-cols-2">
                        <Select className="sm:col-span-2" label="Pesanan" value={data.order} onChange={(e) => pick(e.target.value)} placeholder="Pilih pesanan"
                            options={Object.fromEntries(eligible.map((e) => [`${e.type}:${e.code}`, `${e.label} — dibayar ${rupiah(e.paid)}`]))} error={errors.order_code} required />
                        <Input label="Nominal diajukan" type="number" value={data.amount} max={selected?.paid} onChange={(e) => setData('amount', e.target.value)} error={errors.amount} required />
                        <Input label="Nama bank" placeholder="Mandiri / BSI / Muamalat / ..." value={data.bank_name} onChange={(e) => setData('bank_name', e.target.value)} error={errors.bank_name} required />
                        <Input label="Nomor rekening" inputMode="numeric" value={data.account_number} onChange={(e) => setData('account_number', e.target.value.replace(/\D/g, ''))} error={errors.account_number} hint="Disimpan terenkripsi" required />
                        <Input label="Atas nama" value={data.account_holder} onChange={(e) => setData('account_holder', e.target.value)} error={errors.account_holder} required />
                        <Textarea className="sm:col-span-2" label="Alasan pengajuan" value={data.reason} onChange={(e) => setData('reason', e.target.value)} error={errors.reason} required />
                        <div className="sm:col-span-2">
                            <label className="label">Foto / berkas bukti <span className="text-red-500">*</span></label>
                            <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={(e) => setData('proof', e.target.files[0])} className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:font-semibold file:text-brand-700" />
                            <p className="hint">Mis. foto paspor/identitas pemesan dan bukti kesalahan (tangkapan layar pembayaran ganda, dsb.). Maks. 5 MB.</p>
                            {errors.proof && <p className="error">{errors.proof}</p>}
                        </div>
                        <div className="sm:col-span-2"><button disabled={processing} className="btn-primary"><RotateCcw className="h-4 w-4" />Kirim Pengajuan</button></div>
                    </form>
                </Card>
            )}

            <Card title="Riwayat pengajuan" pad={false}>
                {refunds.length === 0 ? <Empty title="Belum ada pengajuan refund" /> : (
                    <ul className="divide-y divide-slate-100">
                        {refunds.map((r) => (
                            <li key={r.code} className="p-5">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="font-semibold">{r.code} <span className="font-normal text-slate-500">· {r.order} · {r.created_at}</span></p>
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
