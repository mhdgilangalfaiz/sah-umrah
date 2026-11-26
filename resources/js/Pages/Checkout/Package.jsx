import { Link, useForm } from '@inertiajs/react';
import { AlertTriangle, ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, Clock, Wallet } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import PublicLayout from '@/Layouts/PublicLayout';
import PassengerFields, { emptyPassenger } from '@/Components/PassengerFields';
import { Stepper, Textarea, cx } from '@/Components/ui';
import { date, daysUntil, rupiah } from '@/lib/format';

const STEPS = ['Jadwal & Kamar', 'Data Jamaah', 'Skema Bayar', 'Konfirmasi'];

export default function CheckoutPackage({ package: p, selectedDeparture, selectedRoom, selectedPax, roomTypes, jamaah, config }) {
    const initialDep = p.upcoming_departures.find((d) => d.id === selectedDeparture && d.remaining > 0);
    // Jadwal, kamar & jumlah jamaah sudah dipilih di halaman paket (dan kuota cukup) → mulai dari langkah Data Jamaah
    const preselected = !!(initialDep && selectedRoom && selectedPax && selectedPax <= initialDep.remaining);
    const [step, setStep] = useState(preselected ? 1 : 0);
    const [pax, setPax] = useState(preselected ? selectedPax : 1);
    const { data, setData, post, processing, errors } = useForm({
        departure_id: initialDep?.id ?? p.upcoming_departures.find((d) => d.remaining > 0)?.id ?? '',
        room_type: selectedRoom ?? 'quad',
        scheme: 'cicilan',
        notes: '',
        agree: false,
        passengers: [{ ...emptyPassenger(), jamaah_id: jamaah.find((j) => j.relation === 'diri_sendiri')?.id ?? '' }],
    });

    useEffect(() => {
        const cur = data.passengers;
        if (cur.length < pax) setData('passengers', [...cur, ...Array.from({ length: pax - cur.length }, emptyPassenger)]);
        if (cur.length > pax) setData('passengers', cur.slice(0, pax));
    }, [pax]);

    // Kembali ke langkah yang memiliki error dari server
    useEffect(() => {
        const keys = Object.keys(errors);
        if (!keys.length) return;
        if (keys.some((k) => k.startsWith('passengers'))) setStep(1);
        else if (keys.some((k) => ['departure', 'departure_id', 'room_type'].includes(k))) setStep(0);
        else if (keys.includes('scheme')) setStep(2);
    }, [errors]);

    const dep = p.upcoming_departures.find((d) => d.id === Number(data.departure_id));
    const unit = { quad: p.price_quad, triple: p.price_triple, double: p.price_double }[data.room_type];
    const total = unit * pax;
    const deposit = Math.min(total, p.min_deposit * (config.deposit_per_pax ? pax : 1));
    const daysToDeadline = dep ? daysUntil(dep.departure_date) - config.settlement_days : 0;
    const canInstall = daysToDeadline > 7;
    const deadline = dep ? new Date(new Date(dep.departure_date + 'T00:00:00').getTime() - config.settlement_days * 864e5) : null;
    useEffect(() => { if (!canInstall && data.scheme === 'cicilan') setData('scheme', 'lunas'); }, [canInstall]);

    const usedIds = data.passengers.map((x) => String(x.jamaah_id)).filter(Boolean);
    const passengerOk = data.passengers.every((x) => x.jamaah_id || (x.full_name && x.gender && x.birth_date));
    const canNext = [!!dep && dep.remaining >= pax, passengerOk && new Set(usedIds).size === usedIds.length, true, data.agree][step];

    const submit = () => post(route('checkout.package.store'));

    return (
        <PublicLayout title={`Pesan ${p.name}`}>
            <div className="container-app max-w-5xl py-8">
                <Link href={route('packages.show', p.slug)} className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-700"><ArrowLeft className="h-4 w-4" />{p.name}</Link>
                <h1 className="text-2xl sm:text-3xl">Pemesanan Paket Umrah</h1>
                <div className="card mt-6 p-4 sm:p-6"><Stepper steps={STEPS} current={step} /></div>

                <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
                    <div className="min-w-0 space-y-4">
                        {step === 0 && (
                            <div className="card card-pad space-y-6">
                                <div>
                                    <p className="label">Pilih jadwal keberangkatan</p>
                                    <div className="grid gap-2 sm:grid-cols-2">
                                        {p.upcoming_departures.map((d) => (
                                            <button key={d.id} type="button" disabled={d.remaining <= 0} onClick={() => setData('departure_id', d.id)}
                                                className={cx('rounded-xl border p-3 text-left transition disabled:opacity-40', Number(data.departure_id) === d.id ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600' : 'border-slate-200 hover:border-slate-300')}>
                                                <p className="flex items-center gap-2 font-semibold"><CalendarDays className="h-4 w-4 text-gold-500" />{date(d.departure_date)}</p>
                                                <p className="mt-1 text-xs text-slate-500">Pulang {date(d.return_date)} · <span className={d.remaining <= 10 ? 'font-semibold text-red-600' : 'text-emerald-700'}>sisa {d.remaining} kursi</span></p>
                                            </button>
                                        ))}
                                    </div>
                                    {errors.departure && <p className="error">{errors.departure}</p>}
                                </div>
                                <div>
                                    <p className="label">Tipe kamar</p>
                                    <div className="grid grid-cols-3 gap-2">
                                        {Object.entries(roomTypes).map(([k, l]) => (
                                            <button key={k} type="button" onClick={() => setData('room_type', k)} className={cx('rounded-xl border p-3 text-center', data.room_type === k ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600' : 'border-slate-200')}>
                                                <p className="text-sm font-semibold">{l.split(' ')[0]}</p>
                                                <p className="text-[11px] text-slate-500">{l.match(/\((.*)\)/)?.[1]}</p>
                                                <p className="mt-1 text-xs font-bold text-brand-700">{rupiah({ quad: p.price_quad, triple: p.price_triple, double: p.price_double }[k])}</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <p className="label">Jumlah jamaah</p>
                                    <div className="flex items-center gap-3">
                                        <button type="button" onClick={() => setPax(Math.max(1, pax - 1))} className="btn-outline h-10 w-10 !p-0">−</button>
                                        <span className="w-10 text-center text-lg font-bold">{pax}</span>
                                        <button type="button" onClick={() => setPax(Math.min(10, pax + 1, dep?.remaining ?? 10))} className="btn-outline h-10 w-10 !p-0">+</button>
                                        {dep && pax > dep.remaining && <span className="text-sm text-red-600">Melebihi sisa kuota</span>}
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 1 && (
                            <div className="space-y-4">
                                <p className="rounded-xl bg-sand-100 p-3 text-sm text-slate-600">Isi data sesuai identitas. Paspor dapat dilengkapi kemudian melalui menu Dokumen, namun wajib berlaku ≥ 6 bulan dari tanggal keberangkatan.</p>
                                {data.passengers.map((ps, i) => (
                                    <PassengerFields key={i} index={i} value={ps} saved={jamaah.filter((j) => !usedIds.includes(String(j.id)) || String(ps.jamaah_id) === String(j.id))}
                                        errors={errors} onChange={(v) => setData('passengers', data.passengers.map((x, j) => (j === i ? v : x)))} />
                                ))}
                            </div>
                        )}

                        {step === 2 && (
                            <div className="card card-pad space-y-4">
                                <SchemeOption active={data.scheme === 'cicilan'} disabled={!canInstall} onClick={() => setData('scheme', 'cicilan')} icon={Wallet}
                                    title="Cicilan fleksibel" desc={`Bayar deposit awal ${rupiah(deposit)} sekarang untuk mengunci kursi. Sisa ${rupiah(total - deposit)} dicicil dengan nominal bebas (min. ${rupiah(config.min_installment)}) hingga lunas paling lambat ${deadline ? date(deadline) : '-'} (H-${config.settlement_days}).`}
                                    note={!canInstall ? 'Tidak tersedia — keberangkatan terlalu dekat.' : null} />
                                <SchemeOption active={data.scheme === 'lunas'} onClick={() => setData('scheme', 'lunas')} icon={CheckCircle2} title="Bayar lunas" desc={`Bayar penuh ${rupiah(total)} dalam satu transaksi.`} />
                                {errors.scheme && <p className="error">{errors.scheme}</p>}
                                <div className="flex gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-900"><Clock className="h-4 w-4 shrink-0" />Kursi ditahan selama {config.hold_hours} jam. Bila pembayaran pertama tidak diterima, pesanan otomatis kedaluwarsa dan kursi dilepas.</div>
                                <Textarea label="Catatan (opsional)" rows={2} value={data.notes} onChange={(e) => setData('notes', e.target.value)} placeholder="Mis. permintaan kursi roda, sekamar dengan keluarga, dll." />
                            </div>
                        )}

                        {step === 3 && (
                            <div className="card card-pad space-y-4">
                                <h2 className="font-sans text-lg font-semibold">Periksa kembali pesanan Anda</h2>
                                <dl className="divide-y divide-slate-100 text-sm">
                                    {[['Paket', p.name], ['Keberangkatan', dep && `${date(dep.departure_date)} – ${date(dep.return_date)}`], ['Kamar', roomTypes[data.room_type]], ['Jamaah', data.passengers.map((x) => x.full_name || jamaah.find((j) => String(j.id) === String(x.jamaah_id))?.full_name).join(', ')], ['Skema', data.scheme === 'cicilan' ? 'Cicilan bebas (deposit, lalu cicil kapan saja — lunas H-40)' : 'Lunas']].map(([k, v]) => (
                                        <div key={k} className="flex justify-between gap-4 py-2.5"><dt className="text-slate-500">{k}</dt><dd className="text-right font-medium">{v}</dd></div>
                                    ))}
                                </dl>
                                <label className="flex items-start gap-3 rounded-xl bg-sand-100 p-3 text-sm">
                                    <input type="checkbox" className="mt-0.5" checked={data.agree} onChange={(e) => setData('agree', e.target.checked)} />
                                    <span>Saya telah membaca dan menyetujui <a href={route('pages.show', 'syarat-ketentuan')} target="_blank" className="font-semibold text-brand-700 underline">Syarat & Ketentuan</a> serta <a href={route('pages.show', 'kebijakan-refund')} target="_blank" className="font-semibold text-brand-700 underline">Kebijakan Refund</a>.</span>
                                </label>
                                {errors.agree && <p className="error">{errors.agree}</p>}
                                {Object.keys(errors).length > 0 && <p className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700"><AlertTriangle className="h-4 w-4" />Periksa kembali isian Anda.</p>}
                            </div>
                        )}

                        <div className="flex justify-between gap-3">
                            <button type="button" onClick={() => setStep(step - 1)} disabled={step === 0} className="btn-outline"><ArrowLeft className="h-4 w-4" />Kembali</button>
                            {step < 3 ? (
                                <button type="button" onClick={() => setStep(step + 1)} disabled={!canNext} className="btn-primary">Lanjut<ArrowRight className="h-4 w-4" /></button>
                            ) : (
                                <button type="button" onClick={submit} disabled={!canNext || processing} className="btn-gold px-6">{processing ? 'Memproses…' : 'Buat Pesanan'}</button>
                            )}
                        </div>
                    </div>

                    <aside className="lg:sticky lg:top-24 lg:self-start">
                        <div className="card card-pad space-y-3 text-sm">
                            <p className="font-serif text-lg">Ringkasan</p>
                            <div className="flex justify-between"><span className="text-slate-500">{roomTypes[data.room_type]}</span><span>{rupiah(unit)}</span></div>
                            <div className="flex justify-between"><span className="text-slate-500">× {pax} jamaah</span><span className="font-semibold">{rupiah(total)}</span></div>
                            <div className="flex justify-between border-t border-slate-100 pt-3 text-base"><span className="font-semibold">Total</span><span className="font-bold text-brand-700">{rupiah(total)}</span></div>
                            <div className="rounded-xl bg-brand-50 p-3">
                                <p className="text-xs text-slate-600">{data.scheme === 'cicilan' ? 'Bayar sekarang (deposit)' : 'Bayar sekarang'}</p>
                                <p className="text-xl font-bold text-brand-800">{rupiah(data.scheme === 'cicilan' ? deposit : total)}</p>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </PublicLayout>
    );
}

function SchemeOption({ active, disabled, onClick, icon: Icon, title, desc, note }) {
    return (
        <button type="button" disabled={disabled} onClick={onClick} className={cx('flex w-full gap-4 rounded-2xl border p-4 text-left transition disabled:opacity-50', active ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600' : 'border-slate-200 hover:border-slate-300')}>
            <div className={cx('grid h-10 w-10 shrink-0 place-items-center rounded-xl', active ? 'bg-brand-700 text-white' : 'bg-slate-100 text-slate-500')}><Icon className="h-5 w-5" /></div>
            <div><p className="font-semibold">{title}</p><p className="mt-1 text-sm text-slate-600">{desc}</p>{note && <p className="mt-1 text-xs font-medium text-amber-700">{note}</p>}</div>
        </button>
    );
}
