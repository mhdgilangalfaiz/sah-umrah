import { router, useForm } from '@inertiajs/react';
import { Download, FileText, Lock, Trash2, Upload } from 'lucide-react';
import CustomerLayout from '@/Layouts/CustomerLayout';
import { Card, Empty, PageHeader, Select, StatusBadge } from '@/Components/ui';
import { fileSize } from '@/lib/format';

export default function Documents({ jamaah, documents, types }) {
    const { data, setData, post, processing, errors, reset, progress } = useForm({ type: 'paspor', jamaah_id: jamaah[0]?.id ?? '', file: null });

    return (
        <CustomerLayout title="Dokumen">
            <PageHeader title="Dokumen Jamaah" subtitle="Unggah paspor, pas foto, KTP, KK, dan buku nikah. File dienkripsi & hanya dapat diunduh lewat tautan aman berbatas waktu." />
            <Card title="Unggah dokumen" className="mb-6">
                <form onSubmit={(e) => { e.preventDefault(); post(route('customer.documents.store'), { forceFormData: true, onSuccess: () => reset('file') }); }} className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-[1fr_1fr_1.4fr_auto] md:items-end">
                    <Select label="Jamaah" value={data.jamaah_id} onChange={(e) => setData('jamaah_id', e.target.value)} options={Object.fromEntries(jamaah.map((j) => [j.id, j.full_name]))} placeholder="(Pemilik akun)" error={errors.jamaah_id} />
                    <Select label="Jenis dokumen" value={data.type} onChange={(e) => setData('type', e.target.value)} options={types} error={errors.type} />
                    <div>
                        <label className="label">File (JPG/PNG/PDF, maks. 5 MB)</label>
                        <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={(e) => setData('file', e.target.files[0])} className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-brand-700" />
                        {errors.file && <p className="error">{errors.file}</p>}
                    </div>
                    <button disabled={processing || !data.file} className="btn-primary"><Upload className="h-4 w-4" />{progress ? `${progress.percentage}%` : 'Unggah'}</button>
                </form>
                <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500"><Lock className="h-3.5 w-3.5" />File akan dinamai otomatis, mis. <code className="rounded bg-slate-100 px-1">paspor_nama-anda.pdf</code></p>
            </Card>
            <Card title="Dokumen saya" pad={false}>
                {documents.length === 0 ? <Empty icon={FileText} title="Belum ada dokumen" /> : (
                    <ul className="divide-y divide-slate-100">
                        {documents.map((d) => (
                            <li key={d.id} className="flex flex-wrap items-center gap-3 p-4">
                                <div className="grid h-10 w-10 place-items-center rounded-xl bg-sand-100 text-gold-600"><FileText className="h-5 w-5" /></div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate font-medium">{d.type_label} {d.jamaah && <span className="font-normal text-slate-500">· {d.jamaah}</span>}</p>
                                    <p className="text-xs text-slate-500">{d.file_name} · {fileSize(d.size)} · {d.created_at}</p>
                                    {d.rejection_note && <p className="mt-1 text-xs font-medium text-red-600">Ditolak: {d.rejection_note}</p>}
                                </div>
                                <StatusBadge status={d.status} />
                                <a href={d.url} className="btn-ghost btn-sm" title="Unduh"><Download className="h-4 w-4" /></a>
                                {d.status !== 'diverifikasi' && <button onClick={() => confirm('Hapus dokumen ini?') && router.delete(route('customer.documents.destroy', d.id), { preserveScroll: true })} className="btn-ghost btn-sm text-red-600" title="Hapus"><Trash2 className="h-4 w-4" /></button>}
                            </li>
                        ))}
                    </ul>
                )}
            </Card>
        </CustomerLayout>
    );
}
