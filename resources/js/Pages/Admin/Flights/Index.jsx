import { Link, router } from '@inertiajs/react';
import { Check, Handshake, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import FilterBar from '@/Components/FilterBar';
import { seatStatus } from '@/Components/FlightOffer';
import { Badge, Card, Empty, PageHeader, Pagination, cx } from '@/Components/ui';
import { date, dateTime, rupiah, time } from '@/lib/format';

export default function Index({ flights, held, filters }) {
    return (
        <AdminLayout title="Seat Penerbangan">
            <PageHeader title="Seat Penerbangan"
                subtitle="Seat dari mitra — perbarui sisa seat & harga setiap hari langsung di tabel. Pembelian di web mengurangi seat otomatis."
                actions={<Link href={route('admin.flights.create')} className="btn-primary"><Plus className="h-4 w-4" />Tambah Seat</Link>} />
            <p className="mb-4 flex gap-2 rounded-xl bg-brand-50 p-3 text-sm text-brand-900 ring-1 ring-brand-100">
                <Handshake className="h-5 w-5 shrink-0" />
                <span>Tidak ada koneksi API maskapai. Ubah angka <b>Sisa</b> / <b>Harga</b> lalu tekan ✓ untuk menyimpan update harian. Kolom <b>Ditahan</b> = kursi yang sedang dipegang pesanan web belum dibayar (sudah terpotong dari sisa, kembali otomatis bila kedaluwarsa).</span>
            </p>
            <FilterBar routeName="admin.flights.index" filters={filters} fields={[
                { name: 'q', type: 'search', label: 'Maskapai / nomor penerbangan / kode bandara' },
                { name: 'status', type: 'select', label: 'Semua jadwal', options: { mendatang: 'Akan berangkat', lewat: 'Sudah lewat', semua: 'Semua' } },
            ]} />
            <Card pad={false}>
                {flights.data.length === 0 ? <Empty title="Belum ada seat penerbangan" /> : (
                    <div className="overflow-x-auto"><table className="table-app">
                        <thead><tr><th>Berangkat</th><th>Maskapai & rute</th><th>Kembali</th><th>Ditahan</th><th>Sisa / Alokasi</th><th>Harga / org</th><th>Update</th><th>Status</th><th /></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                            {flights.data.map((f) => <Row key={f.id} f={f} held={held[f.id] ?? 0} />)}
                        </tbody>
                    </table></div>
                )}
                <Pagination meta={flights} />
            </Card>
        </AdminLayout>
    );
}

function Row({ f, held }) {
    const [v, setV] = useState({ seats_available: f.seats_available, seats_total: f.seats_total ?? '', price: f.price });
    const [saving, setSaving] = useState(false);
    const dirty = String(v.seats_available) !== String(f.seats_available) || String(v.seats_total) !== String(f.seats_total ?? '') || String(v.price) !== String(f.price);
    const s = seatStatus(f.seats_available);
    const out = f.itinerary?.outbound;
    const back = f.itinerary?.inbound;

    const save = () => {
        setSaving(true);
        router.patch(route('admin.flights.seats', f.id), { ...v, seats_total: v.seats_total === '' ? null : v.seats_total }, {
            preserveScroll: true, onFinish: () => setSaving(false),
        });
    };

    return (
        <tr className={cx('align-top', dirty && 'bg-amber-50/60')}>
            <td>
                <p className="font-semibold">{date(f.depart_at, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</p>
                <p className="text-xs text-slate-500">{time(f.depart_at)} – {time(f.arrive_at)} · {f.duration_label}</p>
            </td>
            <td>
                <p className="font-semibold">{f.airline}</p>
                <p className="font-bold text-brand-800">{out?.path.join(' → ')}</p>
                <p className="text-xs text-slate-500">{f.flight_number} · {f.trip_type === 'pp' ? 'PP' : 'Sekali jalan'} · {out?.stops ? `${out.stops}x transit` : 'langsung'}</p>
            </td>
            <td>{back ? <><p>{date(back.depart_at, { day: '2-digit', month: 'short', year: 'numeric' })}</p><p className="text-xs text-slate-500">{back.path.join(' → ')}</p></> : <span className="text-slate-400">—</span>}</td>
            <td className={held ? 'font-semibold text-amber-700' : 'text-slate-400'}>{held}</td>
            <td>
                <div className="flex items-center gap-1">
                    <input type="number" min="0" aria-label="Sisa seat" value={v.seats_available} onChange={(e) => setV({ ...v, seats_available: e.target.value })}
                        className={cx('input w-20 py-1.5 text-center font-bold', s.text)} />
                    <span className="text-slate-400">/</span>
                    <input type="number" min="0" aria-label="Alokasi seat" placeholder="—" value={v.seats_total} onChange={(e) => setV({ ...v, seats_total: e.target.value })}
                        className="input w-20 py-1.5 text-center" />
                </div>
                <span className={cx('mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ring-1', s.tone)}>{s.label}</span>
            </td>
            <td>
                <input type="number" min="0" aria-label="Harga per orang" value={v.price} onChange={(e) => setV({ ...v, price: e.target.value })} className="input w-32 py-1.5 text-right" />
                <p className="mt-1 text-right text-[11px] text-slate-500">{rupiah(v.price)}</p>
            </td>
            <td className="text-xs text-slate-500">{f.seats_updated_at ? dateTime(f.seats_updated_at) : '—'}</td>
            <td>{f.is_active ? <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-600/20">Aktif</Badge> : <Badge className="bg-slate-100 text-slate-500 ring-slate-300">Nonaktif</Badge>}</td>
            <td className="whitespace-nowrap text-right">
                <button onClick={save} disabled={!dirty || saving} title="Simpan update seat & harga"
                    className={cx('btn-sm btn', dirty ? 'bg-brand-700 text-white hover:bg-brand-800' : 'bg-slate-100 text-slate-400')}><Check className="h-4 w-4" /></button>
                <Link href={route('admin.flights.edit', f.id)} className="btn-ghost btn-sm" title="Ubah detail"><Pencil className="h-4 w-4" /></Link>
                <button onClick={() => confirm('Hapus seat penerbangan ini?') && router.delete(route('admin.flights.destroy', f.id), { preserveScroll: true })} className="btn-ghost btn-sm text-red-600" title="Hapus"><Trash2 className="h-4 w-4" /></button>
            </td>
        </tr>
    );
}
