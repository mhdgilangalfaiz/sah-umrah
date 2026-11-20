import { router } from '@inertiajs/react';
import { CheckCircle2, Download, XCircle } from 'lucide-react';
import AdminLayout from '@/Layouts/AdminLayout';
import FilterBar from '@/Components/FilterBar';
import { Card, Empty, PageHeader, Pagination, StatusBadge } from '@/Components/ui';
import { fileSize } from '@/lib/format';

export default function Documents({ documents, filters }) {
    const reject = (d) => {
        const note = prompt(`Alasan penolakan ${d.type_label} (${d.user}):`);
        if (note) router.put(route('admin.documents.update', d.id), { status: 'ditolak', rejection_note: note }, { preserveScroll: true });
    };
    return (
        <AdminLayout title="Verifikasi Dokumen">
            <PageHeader title="Verifikasi Dokumen Jamaah" subtitle="Setiap unduhan & keputusan verifikasi tercatat di audit log." />
            <FilterBar routeName="admin.documents.index" filters={filters} fields={[
                { name: 'q', type: 'search', label: 'Nama / kode pelanggan' },
                { name: 'status', type: 'select', label: 'Status', options: { menunggu: 'Menunggu', diverifikasi: 'Diverifikasi', ditolak: 'Ditolak', semua: 'Semua' } },
            ]} />
            <Card pad={false}>
                {documents.data.length === 0 ? <Empty title="Tidak ada dokumen" text="Semua dokumen sudah diproses." /> : (
                    <div className="overflow-x-auto"><table className="table-app">
                        <thead><tr><th>Dokumen</th><th>Pelanggan</th><th>Jamaah</th><th>File</th><th>Diunggah</th><th>Status</th><th></th></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                            {documents.data.map((d) => (
                                <tr key={d.id}>
                                    <td className="font-medium">{d.type_label}</td>
                                    <td>{d.user}<p className="text-xs text-slate-500">{d.customer_code}</p></td>
                                    <td>{d.jamaah ?? '-'}</td>
                                    <td><a href={d.url} className="flex items-center gap-1 text-brand-700 hover:underline"><Download className="h-3.5 w-3.5" />{d.file_name}</a><p className="text-xs text-slate-500">{fileSize(d.size)}</p></td>
                                    <td>{d.created_at}</td>
                                    <td><StatusBadge status={d.status} />{d.verifier && <p className="text-xs text-slate-400">oleh {d.verifier}</p>}{d.rejection_note && <p className="max-w-[200px] whitespace-normal text-xs text-red-600">{d.rejection_note}</p>}</td>
                                    <td className="whitespace-nowrap">
                                        {d.status !== 'diverifikasi' && <button onClick={() => router.put(route('admin.documents.update', d.id), { status: 'diverifikasi' }, { preserveScroll: true })} className="btn-primary btn-sm"><CheckCircle2 className="h-3.5 w-3.5" />Verifikasi</button>}
                                        {d.status !== 'ditolak' && <button onClick={() => reject(d)} className="btn-ghost btn-sm text-red-600"><XCircle className="h-3.5 w-3.5" />Tolak</button>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table></div>
                )}
                <Pagination meta={documents} />
            </Card>
        </AdminLayout>
    );
}
