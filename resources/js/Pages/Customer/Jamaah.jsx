import { router, useForm } from '@inertiajs/react';
import { Pencil, Plus, Trash2, Users } from 'lucide-react';
import { useState } from 'react';
import CustomerLayout from '@/Layouts/CustomerLayout';
import Modal from '@/Components/Modal';
import { Card, Empty, Input, PageHeader, Select } from '@/Components/ui';
import { date } from '@/lib/format';

const blank = { full_name: '', relation: 'lainnya', gender: '', birth_place: '', birth_date: '', nik: '', phone: '', passport_number: '', passport_place: '', passport_issued_at: '', passport_expiry: '', mahram_id: '', mahram_relation: '' };

export default function Jamaah({ jamaah, relations }) {
    const [edit, setEdit] = useState(null);
    const form = useForm(blank);

    const open = (j) => {
        setEdit(j ?? {});
        form.clearErrors();
        form.setData(j ? { ...blank, ...Object.fromEntries(Object.entries(j).map(([k, v]) => [k, v ?? ''])), nik: '', passport_number: '' } : blank);
    };
    const submit = (e) => {
        e.preventDefault();
        const opts = { preserveScroll: true, onSuccess: () => setEdit(null) };
        edit.id ? form.put(route('customer.jamaah.update', edit.id), opts) : form.post(route('customer.jamaah.store'), opts);
    };
    const f = (k) => ({ value: form.data[k], onChange: (e) => form.setData(k, e.target.value), error: form.errors[k] });

    return (
        <CustomerLayout title="Data Jamaah">
            <PageHeader title="Data Jamaah" subtitle="Simpan data keluarga & mahram untuk mempercepat pemesanan berikutnya." actions={<button onClick={() => open(null)} className="btn-primary btn-sm"><Plus className="h-4 w-4" />Tambah Jamaah</button>} />
            {jamaah.length === 0 ? <Card><Empty icon={Users} title="Belum ada data jamaah" /></Card> : (
                <div className="grid gap-4 md:grid-cols-2">
                    {jamaah.map((j) => (
                        <div key={j.id} className="card p-5">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="font-semibold">{j.full_name}</p>
                                    <p className="text-xs text-slate-500">{relations[j.relation]} · {j.gender === 'P' ? 'Perempuan' : 'Laki-laki'} · lahir {date(j.birth_date)}</p>
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => open(j)} className="btn-ghost btn-sm"><Pencil className="h-4 w-4" /></button>
                                    <button onClick={() => confirm(`Hapus ${j.full_name}?`) && router.delete(route('customer.jamaah.destroy', j.id), { preserveScroll: true })} className="btn-ghost btn-sm text-red-600"><Trash2 className="h-4 w-4" /></button>
                                </div>
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                                <div className="rounded-lg bg-sand-100 p-2"><p className="text-slate-500">Paspor</p><p className="font-mono font-semibold">{j.masked_passport ?? '—'}</p></div>
                                <div className="rounded-lg bg-sand-100 p-2"><p className="text-slate-500">Berlaku s/d</p><p className="font-semibold">{date(j.passport_expiry)}</p></div>
                                {j.mahram_name && <div className="col-span-2 rounded-lg bg-brand-50 p-2"><p className="text-slate-500">Mahram</p><p className="font-semibold">{j.mahram_name} ({j.mahram_relation})</p></div>}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Modal show={!!edit} onClose={() => setEdit(null)} maxWidth="2xl">
                <form onSubmit={submit} className="max-h-[85vh] overflow-y-auto p-6">
                    <h2 className="text-xl">{edit?.id ? 'Ubah' : 'Tambah'} Data Jamaah</h2>
                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                        <Input className="sm:col-span-2" label="Nama lengkap (sesuai paspor)" {...f('full_name')} required />
                        <Select label="Hubungan" options={relations} {...f('relation')} />
                        <Select label="Jenis kelamin" options={{ L: 'Laki-laki', P: 'Perempuan' }} placeholder="Pilih" {...f('gender')} required />
                        <Input label="Tempat lahir" {...f('birth_place')} />
                        <Input label="Tanggal lahir" type="date" {...f('birth_date')} required />
                        <Input label="NIK" inputMode="numeric" maxLength={16} placeholder={edit?.has_nik ? '•••• tersimpan (kosongkan bila tidak diubah)' : ''} {...f('nik')} />
                        <Input label="No. HP" {...f('phone')} />
                        <Input label="Nomor paspor" placeholder={edit?.masked_passport ? `${edit.masked_passport} (kosongkan bila tidak diubah)` : ''} {...f('passport_number')} />
                        <Input label="Tempat terbit paspor" {...f('passport_place')} />
                        <Input label="Tanggal terbit paspor" type="date" {...f('passport_issued_at')} />
                        <Input label="Berlaku hingga" type="date" {...f('passport_expiry')} />
                        <Select label="Mahram" options={Object.fromEntries(jamaah.filter((x) => x.id !== edit?.id).map((x) => [x.id, x.full_name]))} placeholder="(Tidak ada)" {...f('mahram_id')} />
                        <Input label="Hubungan mahram" placeholder="suami / ayah / kakak" {...f('mahram_relation')} />
                    </div>
                    <div className="mt-6 flex justify-end gap-2">
                        <button type="button" onClick={() => setEdit(null)} className="btn-outline">Batal</button>
                        <button disabled={form.processing} className="btn-primary">Simpan</button>
                    </div>
                </form>
            </Modal>
        </CustomerLayout>
    );
}
