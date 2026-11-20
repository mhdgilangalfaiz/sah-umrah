import { useForm } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Card, Input, PageHeader, Select, Textarea } from '@/Components/ui';

const dt = (v) => (v ? String(v).replace(' ', 'T').slice(0, 16) : '');

export default function Form({ flight: fl, classes }) {
    const { data, setData, post, put, processing, errors } = useForm({
        airline: fl?.airline ?? '', airline_code: fl?.airline_code ?? '', flight_number: fl?.flight_number ?? '',
        origin_code: fl?.origin_code ?? 'KNO', origin_city: fl?.origin_city ?? 'Medan', destination_code: fl?.destination_code ?? 'JED', destination_city: fl?.destination_city ?? 'Jeddah',
        depart_at: dt(fl?.depart_at), arrive_at: dt(fl?.arrive_at), transit_count: fl?.transit_count ?? 0, transit_info: fl?.transit_info ?? '',
        cabin_class: fl?.cabin_class ?? 'ekonomi', price: fl?.price ?? '', baggage_kg: fl?.baggage_kg ?? 30, cabin_baggage_kg: fl?.cabin_baggage_kg ?? 7,
        seats_available: fl?.seats_available ?? 20, refund_policy: fl?.refund_policy ?? '', reschedule_policy: fl?.reschedule_policy ?? '', is_active: fl?.is_active ?? true,
    });
    const f = (k) => ({ value: data[k], onChange: (e) => setData(k, e.target.value), error: errors[k] });
    const submit = (e) => { e.preventDefault(); fl ? put(route('admin.flights.update', fl.id)) : post(route('admin.flights.store')); };

    return (
        <AdminLayout title={fl ? 'Ubah Penerbangan' : 'Tambah Penerbangan'}>
            <PageHeader back={route('admin.flights.index')} title={fl ? `${fl.airline} ${fl.flight_number}` : 'Jadwal Penerbangan Baru'} />
            <form onSubmit={submit} className="space-y-6">
                <Card title="Penerbangan">
                    <div className="grid gap-4 sm:grid-cols-3">
                        <Input label="Maskapai" {...f('airline')} required /><Input label="Kode maskapai" placeholder="SV" {...f('airline_code')} /><Input label="Nomor penerbangan" {...f('flight_number')} required />
                        <Input label="Kode asal" maxLength={3} {...f('origin_code')} required /><Input label="Kota asal" {...f('origin_city')} required /><Input label="Berangkat" type="datetime-local" {...f('depart_at')} required />
                        <Input label="Kode tujuan" maxLength={3} {...f('destination_code')} required /><Input label="Kota tujuan" {...f('destination_city')} required /><Input label="Tiba" type="datetime-local" {...f('arrive_at')} required />
                        <Input label="Jumlah transit" type="number" {...f('transit_count')} /><Input className="sm:col-span-2" label="Info transit" placeholder="Transit Dubai 3j 20m" {...f('transit_info')} />
                    </div>
                </Card>
                <Card title="Harga, bagasi & kursi">
                    <div className="grid gap-4 sm:grid-cols-3">
                        <Select label="Kelas" options={classes} {...f('cabin_class')} /><Input label="Harga per orang" type="number" {...f('price')} required /><Input label="Kursi tersedia" type="number" {...f('seats_available')} required />
                        <Input label="Bagasi (kg)" type="number" {...f('baggage_kg')} /><Input label="Kabin (kg)" type="number" {...f('cabin_baggage_kg')} />
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
