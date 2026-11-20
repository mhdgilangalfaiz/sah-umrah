import { useForm } from '@inertiajs/react';
import { Plus, Trash2 } from 'lucide-react';
import PublicLayout from '@/Layouts/PublicLayout';
import { Input, PageHeader, Stepper, Textarea, cx } from '@/Components/ui';
import { rupiah } from '@/lib/format';

const STEPS = ['Pengajuan', 'Invoice Admin', 'Pembayaran', 'Unggah Berkas', 'Verifikasi', 'Visa Terbit'];

export default function CheckoutVisa({ services, selected, jamaah }) {
    const { data, setData, post, processing, errors } = useForm({
        visa_service_id: selected ?? services[0]?.id ?? '',
        pax_count: 1,
        planned_departure: '',
        notes: '',
        applicants: [],
        agree: false,
    });
    const svc = services.find((s) => s.id === Number(data.visa_service_id));

    const addApplicant = (name = '') => setData('applicants', [...data.applicants, { full_name: name, passport_number: '' }]);

    return (
        <PublicLayout title="Ajukan Visa">
            <div className="container-app max-w-3xl py-8">
                <PageHeader title="Pengajuan Visa Umrah" back={route('visa.index')} />
                <div className="card mb-6 p-4"><Stepper steps={STEPS} current={0} /></div>
                <form onSubmit={(e) => { e.preventDefault(); post(route('checkout.visa.store')); }} className="space-y-4">
                    <div className="card card-pad space-y-4">
                        <div>
                            <p className="label">Jenis visa</p>
                            <div className="grid gap-2 sm:grid-cols-2">
                                {services.map((s) => (
                                    <button key={s.id} type="button" onClick={() => setData('visa_service_id', s.id)} className={cx('rounded-xl border p-3 text-left', Number(data.visa_service_id) === s.id ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600' : 'border-slate-200')}>
                                        <p className="font-semibold">{s.name}</p><p className="text-xs text-slate-500">{rupiah(s.price)}/orang · ±{s.processing_days} hari kerja</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Input label="Jumlah pemohon" type="number" min={1} max={200} value={data.pax_count} onChange={(e) => setData('pax_count', e.target.value)} error={errors.pax_count} required />
                            <Input label="Rencana keberangkatan" type="date" value={data.planned_departure} onChange={(e) => setData('planned_departure', e.target.value)} error={errors.planned_departure} />
                        </div>
                        <Textarea label="Catatan untuk admin" rows={3} value={data.notes} onChange={(e) => setData('notes', e.target.value)} placeholder="Mis. rombongan travel mitra, kebutuhan khusus, dll." />
                    </div>

                    <div className="card card-pad">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-semibold">Daftar pemohon <span className="text-xs font-normal text-slate-500">(opsional — dapat dilengkapi admin)</span></p>
                            <div className="flex gap-2">
                                {jamaah.length > 0 && (
                                    <select className="input w-auto py-1.5 text-xs" value="" onChange={(e) => e.target.value && addApplicant(e.target.value)}>
                                        <option value="">+ dari Data Jamaah</option>
                                        {jamaah.map((j) => <option key={j.id} value={j.full_name}>{j.full_name}</option>)}
                                    </select>
                                )}
                                <button type="button" onClick={() => addApplicant()} className="btn-outline btn-sm"><Plus className="h-3.5 w-3.5" />Tambah</button>
                            </div>
                        </div>
                        <div className="mt-3 space-y-2">
                            {data.applicants.map((a, i) => (
                                <div key={i} className="flex gap-2">
                                    <input className="input" placeholder="Nama sesuai paspor" value={a.full_name} onChange={(e) => setData('applicants', data.applicants.map((x, j) => (j === i ? { ...x, full_name: e.target.value } : x)))} />
                                    <input className="input w-40 uppercase" placeholder="No. paspor" value={a.passport_number} onChange={(e) => setData('applicants', data.applicants.map((x, j) => (j === i ? { ...x, passport_number: e.target.value.toUpperCase() } : x)))} />
                                    <button type="button" onClick={() => setData('applicants', data.applicants.filter((_, j) => j !== i))} className="btn-ghost !px-2"><Trash2 className="h-4 w-4 text-red-500" /></button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="card card-pad space-y-3">
                        {svc && <div className="flex justify-between text-sm"><span className="text-slate-500">Estimasi biaya ({data.pax_count} × {rupiah(svc.price)})</span><span className="font-bold text-brand-700">{rupiah(svc.price * (Number(data.pax_count) || 0))}</span></div>}
                        <p className="text-xs text-slate-500">Biaya final mengikuti invoice resmi yang diterbitkan admin. Berkas (ZIP/RAR) diunggah setelah invoice lunas.</p>
                        <label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-0.5" checked={data.agree} onChange={(e) => setData('agree', e.target.checked)} />Saya menyetujui Syarat & Ketentuan dan Kebijakan Privasi.</label>
                        {errors.agree && <p className="error">{errors.agree}</p>}
                        <button disabled={processing || !data.agree} className="btn-primary w-full py-3">{processing ? 'Mengirim…' : 'Kirim Pengajuan'}</button>
                    </div>
                </form>
            </div>
        </PublicLayout>
    );
}
