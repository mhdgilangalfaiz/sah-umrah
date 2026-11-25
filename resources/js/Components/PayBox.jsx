import { Link, useForm } from '@inertiajs/react';
import { Clock, CreditCard, Landmark, QrCode, ShieldCheck } from 'lucide-react';
import { useMemo } from 'react';
import { rupiah, dateTime, uuid } from '@/lib/format';
import { cx } from './ui';
import { MissingProofs } from './PaymentProof';

const ICON = { qris: QrCode, va_mandiri: Landmark, va_bsi: Landmark, va_muamalat: Landmark };
const BANK_COLOR = { va_mandiri: 'text-[#003d79]', va_bsi: 'text-[#00a39d]', va_muamalat: 'text-[#5b2a86]', qris: 'text-slate-800' };

/**
 * Kotak pembayaran untuk semua pesanan.
 * Cicilan fleksibel: pelanggan mengisi nominal (≥ minimum, ≤ sisa tagihan); sisa setelah bayar ditampilkan langsung.
 */
export default function PayBox({ box, title = 'Pembayaran' }) {
    const idem = useMemo(() => uuid(), []);
    const { data, setData, post, processing, errors } = useForm({
        payable_type: box.type,
        code: box.code,
        method: '',
        amount: box.custom_amount ? box.minimum : box.outstanding,
        idempotency_key: idem,
    });

    const missing = <MissingProofs items={box.missing_proofs} />;

    if (box.outstanding <= 0) {
        return (
            <>
            {missing}
            <div className={cx('card flex items-center gap-3 border-emerald-200 bg-emerald-50 p-5 text-emerald-800', box.missing_proofs?.length > 0 && 'mt-4')}>
                <ShieldCheck className="h-6 w-6" />
                <div>
                    <p className="font-semibold">Tagihan sudah lunas</p>
                    <p className="text-sm">Terima kasih, seluruh pembayaran telah kami terima.</p>
                </div>
            </div>
            </>
        );
    }

    if (!box.can_pay) {
        return missing;
    }

    const amount = Number(data.amount || 0);
    const after = Math.max(0, box.outstanding - amount);
    const presets = box.custom_amount
        ? [...new Set([box.minimum, Math.min(box.outstanding, Math.max(box.minimum, Math.round(box.outstanding / 2 / 100000) * 100000)), box.outstanding])].filter((v) => v >= box.minimum)
        : [];

    return (
        <>
        {missing}
        <section className={cx('card overflow-hidden', box.missing_proofs?.length > 0 && 'mt-4')}>
            <div className="flex items-center gap-2 border-b border-slate-100 bg-brand-50/60 px-5 py-4">
                <CreditCard className="h-5 w-5 text-brand-700" />
                <h2 className="font-sans text-base font-semibold">{title}</h2>
            </div>

            {box.pending && (
                <div className="flex flex-col gap-2 border-b border-amber-100 bg-amber-50 px-5 py-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
                    <span className="flex items-center gap-2">
                        <Clock className="h-4 w-4" /> Transaksi aktif {rupiah(box.pending.amount)} via {box.pending.method_label} (berlaku s/d {dateTime(box.pending.expires_at)})
                    </span>
                    <Link href={route('payments.show', box.pending.code)} className="btn-gold btn-sm">Lihat Instruksi</Link>
                </div>
            )}

            <form
                className="space-y-5 p-5"
                onSubmit={(e) => {
                    e.preventDefault();
                    post(route('payments.store'));
                }}
            >
                <div className="grid grid-cols-2 gap-3 rounded-xl bg-sand-50 p-4 text-sm">
                    <div>
                        <p className="text-slate-500">Sisa tagihan</p>
                        <p className="text-lg font-bold text-slate-900">{rupiah(box.outstanding)}</p>
                    </div>
                    <div>
                        <p className="text-slate-500">{box.custom_amount ? 'Minimal bayar' : 'Harus dibayar'}</p>
                        <p className="text-lg font-bold text-brand-700">{rupiah(box.minimum)}</p>
                    </div>
                </div>

                {box.custom_amount && (
                    <div>
                        <label className="label">Nominal yang ingin dibayar</label>
                        <div className="relative">
                            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-semibold text-slate-500">Rp</span>
                            <input
                                type="number"
                                inputMode="numeric"
                                min={box.minimum}
                                max={box.outstanding}
                                step={1000}
                                value={data.amount}
                                onChange={(e) => setData('amount', e.target.value)}
                                className="input pl-10 text-base font-semibold"
                            />
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {presets.map((p) => (
                                <button type="button" key={p} onClick={() => setData('amount', p)} className={cx('rounded-full border px-3 py-1 text-xs font-medium', Number(data.amount) === p ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-slate-200 text-slate-600')}>
                                    {p === box.outstanding ? 'Lunasi ' : ''}{rupiah(p)}
                                </button>
                            ))}
                        </div>
                        {errors.amount ? <p className="error">{errors.amount}</p> : (
                            <p className="hint">
                                Setelah pembayaran ini, sisa tagihan menjadi <b className="text-slate-700">{rupiah(after)}</b>.
                            </p>
                        )}
                    </div>
                )}

                <div>
                    <p className="label">Pilih metode pembayaran</p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {box.methods.map((m) => {
                            const Icon = ICON[m.value];
                            return (
                                <label key={m.value} className={cx('flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition', data.method === m.value ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600' : 'border-slate-200 hover:border-slate-300')}>
                                    <input type="radio" name="method" value={m.value} checked={data.method === m.value} onChange={() => setData('method', m.value)} className="text-brand-700 focus:ring-brand-600" />
                                    <Icon className={cx('h-5 w-5', BANK_COLOR[m.value])} />
                                    <span className="text-sm font-medium">{m.label}</span>
                                </label>
                            );
                        })}
                    </div>
                    {errors.method && <p className="error">{errors.method}</p>}
                </div>

                <button disabled={processing || !data.method} className="btn-primary w-full py-3 text-base">
                    {processing ? 'Membuat transaksi…' : `Bayar ${rupiah(box.custom_amount ? amount : box.outstanding)}`}
                </button>
                <p className="flex items-center justify-center gap-1.5 text-center text-xs text-slate-500">
                    <ShieldCheck className="h-3.5 w-3.5 text-brand-600" /> Pembayaran diproses aman oleh payment gateway. Kami tidak menyimpan data kartu Anda.
                </p>
            </form>
        </section>
        </>
    );
}
