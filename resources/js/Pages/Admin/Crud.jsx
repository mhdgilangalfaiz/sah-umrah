import { router, useForm } from '@inertiajs/react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import Modal from '@/Components/Modal';
import { Badge, Card, Empty, PageHeader, Pagination } from '@/Components/ui';
import { dateTime, rupiah } from '@/lib/format';

/** Halaman CRUD generik — field didefinisikan di Admin\CrudController */
export default function Crud({ resource, title, description, columns, fields, items }) {
    const [edit, setEdit] = useState(null);
    const blank = Object.fromEntries(fields.map((f) => [f.name, f.type === 'checkbox' ? true : f.type === 'list' ? '' : f.type === 'image' ? null : f.type === 'select' ? Object.keys(f.options)[0] : '']));
    const form = useForm(blank);

    const open = (item) => {
        form.clearErrors();
        setEdit(item ?? {});
        form.setData(item ? Object.fromEntries(fields.map((f) => [f.name,
            f.type === 'list' ? (item[f.name] ?? []).join('\n') : f.type === 'image' ? null : f.type === 'checkbox' ? !!item[f.name]
                : f.type === 'datetime' ? (item[f.name] ? String(item[f.name]).slice(0, 16) : '')
                : f.type === 'month' ? (item[f.name] ? String(item[f.name]).slice(0, 7) : '') : item[f.name] ?? ''])) : blank);
    };
    const submit = (e) => {
        e.preventDefault();
        form.transform((d) => {
            const out = { ...d };
            fields.forEach((f) => {
                if (f.type === 'list') out[f.name] = String(d[f.name] ?? '').split('\n').map((x) => x.trim()).filter(Boolean);
                if (f.type === 'checkbox') out[f.name] = d[f.name] ? 1 : 0;
            });
            return out;
        });
        const url = edit.id ? route('admin.crud.update', [resource, edit.id]) : route('admin.crud.store', resource);
        form.post(url, { forceFormData: true, preserveScroll: true, onSuccess: () => setEdit(null) });
    };

    const cell = (item, key) => {
        const v = item[key];
        if (key === 'logo') return item.logo_url ? <img src={item.logo_url} alt="" className="h-10 w-28 rounded-lg bg-white object-contain p-1 ring-1 ring-slate-200" /> : <span className="text-xs font-semibold text-amber-700">Belum ada logo</span>;
        if (key === 'image' || key === 'cover_image' || key === 'photo') { const url = item[`${key === 'cover_image' ? 'cover' : key}_url`]; return url ? <img src={url} alt="" className="h-12 w-16 rounded-lg object-cover" /> : '-'; }
        if (key === 'is_active') return v ? <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-600/20">Ya</Badge> : <Badge className="bg-slate-100 text-slate-500 ring-slate-300">Tidak</Badge>;
        if (key === 'price') return rupiah(v);
        if (key === 'published_at') return v ? dateTime(v) : <span className="text-amber-700">Draft</span>;
        return <span className="line-clamp-2 max-w-xs whitespace-normal">{String(v ?? '-')}</span>;
    };

    return (
        <AdminLayout title={title}>
            <PageHeader title={title} subtitle={description} actions={<button onClick={() => open(null)} className="btn-primary"><Plus className="h-4 w-4" />Tambah</button>} />
            <Card pad={false}>
                {items.data.length === 0 ? <Empty title="Belum ada data" /> : (
                    <div className="overflow-x-auto"><table className="table-app">
                        <thead><tr>{Object.values(columns).map((c) => <th key={c}>{c}</th>)}<th></th></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                            {items.data.map((it) => (
                                <tr key={it.id}>
                                    {Object.keys(columns).map((k) => <td key={k}>{cell(it, k)}</td>)}
                                    <td className="whitespace-nowrap text-right">
                                        <button onClick={() => open(it)} className="btn-ghost btn-sm"><Pencil className="h-4 w-4" /></button>
                                        <button onClick={() => confirm('Hapus data ini?') && router.delete(route('admin.crud.destroy', [resource, it.id]), { preserveScroll: true })} className="btn-ghost btn-sm text-red-600"><Trash2 className="h-4 w-4" /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table></div>
                )}
                <Pagination meta={items} />
            </Card>

            <Modal show={!!edit} onClose={() => setEdit(null)} maxWidth="2xl">
                <form onSubmit={submit} className="max-h-[85vh] space-y-4 overflow-y-auto p-6">
                    <h2 className="text-xl">{edit?.id ? 'Ubah' : 'Tambah'} {title}</h2>
                    {fields.map((f) => (
                        <div key={f.name}>
                            {f.type !== 'checkbox' && <label className="label">{f.label}</label>}
                            {f.type === 'text' && <input className="input" value={form.data[f.name]} onChange={(e) => form.setData(f.name, e.target.value)} />}
                            {f.type === 'number' && <input type="number" className="input" value={form.data[f.name]} onChange={(e) => form.setData(f.name, e.target.value)} />}
                            {f.type === 'month' && <input type="month" className="input" value={form.data[f.name]} onChange={(e) => form.setData(f.name, e.target.value)} />}
                            {f.type === 'datetime' &&<input type="datetime-local" className="input" value={form.data[f.name]} onChange={(e) => form.setData(f.name, e.target.value)} />}
                            {(f.type === 'textarea' || f.type === 'list') && <textarea rows={f.type === 'list' ? 5 : 4} className="input" value={form.data[f.name]} onChange={(e) => form.setData(f.name, e.target.value)} />}
                            {f.type === 'richtext' && <textarea rows={12} className="input font-mono text-xs" value={form.data[f.name]} onChange={(e) => form.setData(f.name, e.target.value)} placeholder="<p>Paragraf…</p><h3>Subjudul</h3>" />}
                            {f.type === 'select' && <select className="input" value={form.data[f.name]} onChange={(e) => form.setData(f.name, e.target.value)}>{Object.entries(f.options).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>}
                            {f.type === 'checkbox' && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.data[f.name]} onChange={(e) => form.setData(f.name, e.target.checked)} />{f.label}</label>}
                            {f.type === 'image' && <input type="file" accept="image/*" onChange={(e) => form.setData(f.name, e.target.files[0])} className="text-sm" />}
                            {form.errors[f.name] && <p className="error">{form.errors[f.name]}</p>}
                        </div>
                    ))}
                    <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setEdit(null)} className="btn-outline">Batal</button><button disabled={form.processing} className="btn-primary">Simpan</button></div>
                </form>
            </Modal>
        </AdminLayout>
    );
}
