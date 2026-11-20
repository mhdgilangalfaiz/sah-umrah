import { useForm } from '@inertiajs/react';
import { ArrowLeftRight, ArrowRight, Handshake, Plus, Trash2 } from 'lucide-react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Card, Input, PageHeader, Select, Textarea, cx } from '@/Components/ui';

const dt = (v) => (v ? String(v).replace(' ', 'T').slice(0, 16) : '');
const emptyLeg = (from = '', to = '') => ({ flight_number: '', origin_code: from, destination_code: to, depart_at: '', arrive_at: '' });

/** Segmen dari data tersimpan; data lama tanpa segmen diubah jadi satu penerbangan langsung. */
const initialLegs = (fl) => {
    if (fl?.segments?.length) return fl.segments.map((l) => ({ ...l, depart_at: dt(l.depart_at), arrive_at: dt(l.arrive_at) }));
    if (fl) return [{ flight_number: fl.flight_number, origin_code: fl.origin_code, destination_code: fl.destination_code, depart_at: dt(fl.depart_at), arrive_at: dt(fl.arrive_at) }];
    return [emptyLeg('KNO', 'KUL'), emptyLeg('KUL', 'JED')];
};

export default function Form({ flight: fl, classes, tripTypes, airports }) {
    const { data, setData, post, put, processing, errors } = useForm({
        airline: fl?.airline ?? '', airline_code: fl?.airline_code ?? '', trip_type: fl?.trip_type ?? 'oneway',
        segments: initialLegs(fl),
        return_segments: fl?.return_segments?.length ? fl.return_segments.map((l) => ({ ...l, depart_at: dt(l.depart_at), arrive_at: dt(l.arrive_at) })) : [emptyLeg('JED', 'KUL'), emptyLeg('KUL', 'KNO')],
        cabin_class: fl?.cabin_class ?? 'ekonomi', price: fl?.price ?? '', baggage_kg: fl?.baggage_kg ?? 30, cabin_baggage_kg: fl?.cabin_baggage_kg ?? 7,
        seats_available: fl?.seats_available ?? 20, seats_total: fl?.seats_total ?? '',
        refund_policy: fl?.refund_policy ?? '', reschedule_policy: fl?.reschedule_policy ?? '', is_active: fl?.is_active ?? true,
    });
    const f = (k) => ({ value: data[k] ?? '', onChange: (e) => setData(k, e.target.value), error: errors[k] });
    const submit = (e) => { e.preventDefault(); fl ? put(route('admin.flights.update', fl.id)) : post(route('admin.flights.store')); };

    return (
        <AdminLayout title={fl ? 'Ubah Seat Penerbangan' : 'Tambah Seat Penerbangan'}>
            <PageHeader back={route('admin.flights.index')} title={fl ? `${fl.airline} · ${fl.route_label}` : 'Seat Penerbangan Baru'} />
            <p className="mb-4 flex gap-2 rounded-xl bg-brand-50 p-3 text-sm text-brand-900 ring-1 ring-brand-100">
                <Handshake className="h-5 w-5 shrink-0" />
                <span>Seat diambil dari mitra (bukan API maskapai). Masukkan jam <b>lokal</b> tiap bandara sesuai tiket mitra — durasi & waktu transit dihitung otomatis.</span>
            </p>
            <datalist id="airport-codes">{airports.map((a) => <option key={a.code} value={a.code}>{a.city}</option>)}</datalist>

            <form onSubmit={submit} className="space-y-6">
                <Card title="Maskapai & jenis perjalanan">
                    <div className="grid gap-4 sm:grid-cols-3">
                        <Input label="Maskapai" placeholder="Batik Air Malaysia" {...f('airline')} required />
                        <Input label="Kode maskapai" placeholder="OD" maxLength={5} {...f('airline_code')} />
                        <Select label="Kelas" options={classes} {...f('cabin_class')} />
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        {Object.entries(tripTypes).map(([k, l]) => (
                            <button key={k} type="button" onClick={() => setData('trip_type', k)}
                                className={cx('flex items-center gap-3 rounded-xl border-2 p-3 text-left', data.trip_type === k ? 'border-brand-600 bg-brand-50' : 'border-slate-200 hover:border-slate-300')}>
                                {k === 'pp' ? <ArrowLeftRight className="h-5 w-5 text-brand-700" /> : <ArrowRight className="h-5 w-5 text-brand-700" />}
                                <span><span className="block font-semibold">{l}</span><span className="block text-xs text-slate-500">{k === 'pp' ? 'Satu harga untuk berangkat + kembali' : 'Hanya penerbangan berangkat'}</span></span>
                            </button>
                        ))}
                    </div>
                </Card>

                <LegsCard title="Penerbangan berangkat" name="segments" legs={data.segments} onChange={(v) => setData('segments', v)} errors={errors} />
                {data.trip_type === 'pp' && <LegsCard title="Penerbangan kembali" name="return_segments" legs={data.return_segments} onChange={(v) => setData('return_segments', v)} errors={errors} />}

                <Card title="Seat, harga & bagasi">
                    <div className="grid gap-4 sm:grid-cols-3">
                        <Input label={`Harga per orang${data.trip_type === 'pp' ? ' (PP)' : ''}`} type="number" {...f('price')} required />
                        <Input label="Sisa seat (bisa dijual)" type="number" {...f('seats_available')} required hint="Berkurang otomatis saat ada pembelian di web." />
                        <Input label="Alokasi seat dari mitra" type="number" {...f('seats_total')} hint="Opsional — untuk menampilkan sisa / total." />
                        <Input label="Bagasi (kg)" type="number" {...f('baggage_kg')} />
                        <Input label="Kabin (kg)" type="number" {...f('cabin_baggage_kg')} />
                        <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" checked={data.is_active} onChange={(e) => setData('is_active', e.target.checked)} />Aktif / dapat dipesan</label>
                    </div>
                </Card>
                <Card title="Kebijakan (ditampilkan ke pelanggan)">
                    <div className="grid gap-4 md:grid-cols-2"><Textarea label="Refund" {...f('refund_policy')} /><Textarea label="Reschedule" {...f('reschedule_policy')} /></div>
                </Card>
                <button disabled={processing} className="btn-primary px-8">Simpan</button>
            </form>
        </AdminLayout>
    );
}

function LegsCard({ title, name, legs, onChange, errors }) {
    const set = (i, k, v) => onChange(legs.map((l, j) => (j === i ? { ...l, [k]: k.endsWith('_code') ? v.toUpperCase() : v } : l)));
    const add = () => {
        const last = legs[legs.length - 1];
        onChange([...legs, emptyLeg(last?.destination_code ?? '', '')]);
    };
    const err = (i, k) => errors[`${name}.${i}.${k}`];
    const path = legs.map((l) => l.origin_code).concat(legs.at(-1)?.destination_code ?? '').filter(Boolean).join(' → ');

    return (
        <Card title={title} actions={<span className="text-sm font-bold text-brand-700">{path}{legs.length > 1 && ` · ${legs.length - 1}x transit`}</span>}>
            {errors[name] && <p className="error mb-2">{errors[name]}</p>}
            <div className="space-y-3">
                {legs.map((l, i) => (
                    <div key={i} className="rounded-xl border border-slate-200 p-3">
                        <div className="mb-2 flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Segmen {i + 1}{i > 0 && ' (setelah transit)'}</span>
                            {legs.length > 1 && <button type="button" onClick={() => onChange(legs.filter((_, j) => j !== i))} className="btn-ghost btn-sm text-red-600"><Trash2 className="h-4 w-4" />Hapus</button>}
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                            <Input label="No. penerbangan" placeholder="OD 361" value={l.flight_number} onChange={(e) => set(i, 'flight_number', e.target.value)} error={err(i, 'flight_number')} required />
                            <Input label="Dari (kode)" list="airport-codes" maxLength={3} placeholder="KNO" value={l.origin_code} onChange={(e) => set(i, 'origin_code', e.target.value)} error={err(i, 'origin_code')} required />
                            <Input label="Ke (kode)" list="airport-codes" maxLength={3} placeholder="KUL" value={l.destination_code} onChange={(e) => set(i, 'destination_code', e.target.value)} error={err(i, 'destination_code')} required />
                            <Input label="Berangkat (jam lokal)" type="datetime-local" value={l.depart_at} onChange={(e) => set(i, 'depart_at', e.target.value)} error={err(i, 'depart_at')} required />
                            <Input label="Tiba (jam lokal)" type="datetime-local" value={l.arrive_at} onChange={(e) => set(i, 'arrive_at', e.target.value)} error={err(i, 'arrive_at')} required />
                        </div>
                    </div>
                ))}
            </div>
            {legs.length < 4 && <button type="button" onClick={add} className="btn-outline btn-sm mt-3"><Plus className="h-4 w-4" />Tambah segmen transit</button>}
        </Card>
    );
}
