import { router, useForm } from '@inertiajs/react';
import { Plus, Save, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Card, Input, PageHeader, Select, StatusBadge, Textarea } from '@/Components/ui';
import { date } from '@/lib/format';

const lines = (arr) => (arr ?? []).join('\n');
const toArr = (s) => s.split('\n').map((x) => x.trim()).filter(Boolean);

export default function Form({ package: p, types }) {
    const editing = !!p;
    const [facilities, setFacilities] = useState(lines(p?.facilities));
    const [excludes, setExcludes] = useState(lines(p?.excludes));
    const [docs, setDocs] = useState(lines(p?.document_requirements));
    const { data, setData, post, processing, errors, transform } = useForm({
        name: p?.name ?? '', type: p?.type ?? 'reguler', summary: p?.summary ?? '', description: p?.description ?? '',
        duration_days: p?.duration_days ?? 9, airline: p?.airline ?? '', departure_city: p?.departure_city ?? 'Medan (KNO)',
        hotel_makkah: p?.hotel_makkah ?? '', hotel_makkah_star: p?.hotel_makkah_star ?? 5, hotel_makkah_distance: p?.hotel_makkah_distance ?? '',
        hotel_madinah: p?.hotel_madinah ?? '', hotel_madinah_star: p?.hotel_madinah_star ?? 5, hotel_madinah_distance: p?.hotel_madinah_distance ?? '',
        price_quad: p?.price_quad ?? '', price_triple: p?.price_triple ?? '', price_double: p?.price_double ?? '', min_deposit: p?.min_deposit ?? 3000000,
        itinerary: p?.itinerary ?? [{ day: 1, title: '', description: '' }], is_featured: p?.is_featured ?? false, is_active: p?.is_active ?? true,
        cover: null, gallery_new: [], gallery_keep: p?.gallery ?? [],
    });

    transform((d) => ({ ...d, facilities: toArr(facilities), excludes: toArr(excludes), document_requirements: toArr(docs), ...(editing ? { _method: 'put' } : {}) }));
    const submit = (e) => {
        e.preventDefault();
        post(editing ? route('admin.packages.update', p.id) : route('admin.packages.store'), { forceFormData: true, preserveScroll: true });
    };
    const f = (k) => ({ value: data[k], onChange: (e) => setData(k, e.target.value), error: errors[k] });
    const setIt = (i, k, v) => setData('itinerary', data.itinerary.map((x, j) => (j === i ? { ...x, [k]: v } : x)));

    return (
        <AdminLayout title={editing ? 'Ubah Paket' : 'Paket Baru'}>
            <PageHeader back={route('admin.packages.index')} title={editing ? p.name : 'Paket Umrah Baru'} subtitle="Perubahan harga tercatat otomatis di audit log." />
            <form onSubmit={submit} className="grid gap-6 xl:grid-cols-[1fr_360px]">
                <div className="min-w-0 space-y-6">
                    <Card title="Informasi paket">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Input className="sm:col-span-2" label="Nama paket" {...f('name')} required />
                            <Select label="Jenis" options={types} {...f('type')} />
                            <Input label="Durasi (hari)" type="number" {...f('duration_days')} />
                            <Input label="Maskapai" {...f('airline')} />
                            <Input label="Kota keberangkatan" {...f('departure_city')} />
                            <Textarea className="sm:col-span-2" rows={2} label="Ringkasan singkat" {...f('summary')} />
                            <Textarea className="sm:col-span-2" rows={5} label="Deskripsi" {...f('description')} />
                        </div>
                    </Card>
                    <Card title="Hotel">
                        <div className="grid gap-4 sm:grid-cols-3">
                            <Input label="Hotel Makkah" {...f('hotel_makkah')} /><Select label="Bintang" options={{ 3: '3★', 4: '4★', 5: '5★' }} {...f('hotel_makkah_star')} /><Input label="Jarak ke Haram" placeholder="150 m" {...f('hotel_makkah_distance')} />
                            <Input label="Hotel Madinah" {...f('hotel_madinah')} /><Select label="Bintang" options={{ 3: '3★', 4: '4★', 5: '5★' }} {...f('hotel_madinah_star')} /><Input label="Jarak ke Nabawi" placeholder="100 m" {...f('hotel_madinah_distance')} />
                        </div>
                    </Card>
                    <Card title="Itinerary" actions={<button type="button" onClick={() => setData('itinerary', [...data.itinerary, { day: data.itinerary.length + 1, title: '', description: '' }])} className="btn-outline btn-sm"><Plus className="h-3.5 w-3.5" />Hari</button>}>
                        <div className="space-y-3">
                            {data.itinerary.map((it, i) => (
                                <div key={i} className="grid gap-2 rounded-xl border border-slate-100 p-3 sm:grid-cols-[70px_1fr_auto]">
                                    <input type="number" className="input" value={it.day} onChange={(e) => setIt(i, 'day', e.target.value)} />
                                    <div className="space-y-2"><input className="input" placeholder="Judul" value={it.title} onChange={(e) => setIt(i, 'title', e.target.value)} /><textarea rows={2} className="input" placeholder="Deskripsi" value={it.description ?? ''} onChange={(e) => setIt(i, 'description', e.target.value)} /></div>
                                    <button type="button" onClick={() => setData('itinerary', data.itinerary.filter((_, j) => j !== i))} className="btn-ghost self-start text-red-500"><Trash2 className="h-4 w-4" /></button>
                                </div>
                            ))}
                        </div>
                    </Card>
                    <Card title="Fasilitas, pengecualian & syarat dokumen">
                        <div className="grid gap-4 md:grid-cols-3">
                            <Textarea rows={8} label="Termasuk (per baris)" value={facilities} onChange={(e) => setFacilities(e.target.value)} />
                            <Textarea rows={8} label="Tidak termasuk (per baris)" value={excludes} onChange={(e) => setExcludes(e.target.value)} />
                            <Textarea rows={8} label="Syarat dokumen (per baris)" value={docs} onChange={(e) => setDocs(e.target.value)} />
                        </div>
                    </Card>
                    {editing && <Departures pkg={p} />}
                </div>

                <div className="space-y-6">
                    <Card title="Harga per jamaah">
                        <div className="space-y-3">
                            <Input label="Quad (ber-4)" type="number" {...f('price_quad')} required />
                            <Input label="Triple (ber-3)" type="number" {...f('price_triple')} required />
                            <Input label="Double (ber-2)" type="number" {...f('price_double')} required />
                            <Input label="Deposit awal / jamaah" type="number" {...f('min_deposit')} hint="Pembayaran pertama minimal sebesar ini (default Rp3.000.000)" required />
                        </div>
                    </Card>
                    <Card title="Media">
                        {p?.cover_url && <img src={p.cover_url} alt="" className="mb-3 aspect-video w-full rounded-xl object-cover" />}
                        <label className="label">Foto sampul</label>
                        <input type="file" accept="image/*" onChange={(e) => setData('cover', e.target.files[0])} className="text-sm" />
                        {errors.cover && <p className="error">{errors.cover}</p>}
                        <label className="label mt-4">Galeri</label>
                        <div className="mb-2 grid grid-cols-3 gap-2">
                            {(p?.gallery ?? []).map((g, i) => data.gallery_keep.includes(g) && (
                                <div key={g} className="relative"><img src={p.gallery_urls[i]} alt="" className="aspect-square w-full rounded-lg object-cover" /><button type="button" onClick={() => setData('gallery_keep', data.gallery_keep.filter((x) => x !== g))} className="absolute right-1 top-1 rounded-full bg-white p-0.5 shadow"><X className="h-3 w-3" /></button></div>
                            ))}
                        </div>
                        <input type="file" accept="image/*" multiple onChange={(e) => setData('gallery_new', [...e.target.files])} className="text-sm" />
                    </Card>
                    <Card title="Status">
                        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={data.is_active} onChange={(e) => setData('is_active', e.target.checked)} />Aktif (tampil di website)</label>
                        <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={data.is_featured} onChange={(e) => setData('is_featured', e.target.checked)} />Paket unggulan (beranda)</label>
                    </Card>
                    <button disabled={processing} className="btn-primary w-full py-3"><Save className="h-4 w-4" />{processing ? 'Menyimpan…' : 'Simpan Paket'}</button>
                </div>
            </form>
        </AdminLayout>
    );
}

function Departures({ pkg }) {
    const form = useForm({ departure_date: '', return_date: '', quota: 45, status: 'open' });
    const [edit, setEdit] = useState({});
    return (
        <Card title="Jadwal keberangkatan & kuota" pad={false}>
            <div className="overflow-x-auto"><table className="table-app">
                <thead><tr><th>Berangkat</th><th>Pulang</th><th>Kuota</th><th>Terisi</th><th>Ditahan</th><th>Sisa</th><th>Status</th><th></th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                    {pkg.departures.map((d) => {
                        const e = edit[d.id];
                        return (
                            <tr key={d.id}>
                                <td>{e ? <input type="date" className="input py-1" value={e.departure_date} onChange={(x) => setEdit({ ...edit, [d.id]: { ...e, departure_date: x.target.value } })} /> : date(d.departure_date)}</td>
                                <td>{e ? <input type="date" className="input py-1" value={e.return_date} onChange={(x) => setEdit({ ...edit, [d.id]: { ...e, return_date: x.target.value } })} /> : date(d.return_date)}</td>
                                <td>{e ? <input type="number" className="input w-20 py-1" value={e.quota} onChange={(x) => setEdit({ ...edit, [d.id]: { ...e, quota: x.target.value } })} /> : d.quota}</td>
                                <td>{d.booked}</td><td>{d.held}</td><td className="font-semibold">{d.remaining}</td>
                                <td>{e ? <select className="input py-1" value={e.status} onChange={(x) => setEdit({ ...edit, [d.id]: { ...e, status: x.target.value } })}><option value="open">Dibuka</option><option value="closed">Ditutup</option><option value="departed">Berangkat</option></select> : <StatusBadge status={d.status} />}</td>
                                <td className="whitespace-nowrap text-right">
                                    {e ? (
                                        <><button type="button" onClick={() => router.put(route('admin.departures.update', d.id), e, { preserveScroll: true, onSuccess: () => setEdit({ ...edit, [d.id]: null }) })} className="btn-primary btn-sm">Simpan</button>
                                            <button type="button" onClick={() => setEdit({ ...edit, [d.id]: null })} className="btn-ghost btn-sm">Batal</button></>
                                    ) : (
                                        <><button type="button" onClick={() => setEdit({ ...edit, [d.id]: { departure_date: d.departure_date, return_date: d.return_date, quota: d.quota, status: d.status } })} className="btn-ghost btn-sm">Ubah</button>
                                            <button type="button" onClick={() => confirm('Hapus jadwal?') && router.delete(route('admin.departures.destroy', d.id), { preserveScroll: true })} className="btn-ghost btn-sm text-red-600"><Trash2 className="h-4 w-4" /></button></>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table></div>
            <div className="grid gap-3 border-t border-slate-100 p-4 sm:grid-cols-[1fr_1fr_100px_auto] sm:items-end">
                <Input label="Tanggal berangkat" type="date" value={form.data.departure_date} onChange={(e) => form.setData('departure_date', e.target.value)} error={form.errors.departure_date} />
                <Input label="Tanggal pulang" type="date" value={form.data.return_date} onChange={(e) => form.setData('return_date', e.target.value)} error={form.errors.return_date} />
                <Input label="Kuota" type="number" value={form.data.quota} onChange={(e) => form.setData('quota', e.target.value)} error={form.errors.quota} />
                <button type="button" onClick={() => form.post(route('admin.departures.store', pkg.id), { preserveScroll: true, onSuccess: () => form.reset() })} className="btn-gold"><Plus className="h-4 w-4" />Tambah</button>
            </div>
        </Card>
    );
}
