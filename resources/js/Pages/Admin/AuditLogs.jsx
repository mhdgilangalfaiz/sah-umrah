import { Fragment, useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import FilterBar from '@/Components/FilterBar';
import { Badge, Card, Empty, PageHeader, Pagination, cx } from '@/Components/ui';

const ROLE = { customer: 'bg-slate-100 text-slate-600 ring-slate-300', system: 'bg-violet-50 text-violet-700 ring-violet-300' };

export default function AuditLogs({ logs, filters, actionGroups }) {
    const [open, setOpen] = useState(null);
    return (
        <AdminLayout title="Audit Log">
            <PageHeader title="Audit Log" subtitle="Catatan permanen: siapa melakukan apa dan kapan. Data sensitif disamarkan otomatis." />
            <FilterBar routeName="admin.audit.index" filters={filters} fields={[
                { name: 'q', type: 'search', label: 'Cari deskripsi / pengguna' },
                { name: 'action', type: 'select', label: 'Semua aksi', options: Object.fromEntries(actionGroups.map((a) => [a, a])) },
                { name: 'role', type: 'select', label: 'Semua pelaku', options: { admin: 'Admin', pelanggan: 'Pelanggan', system: 'Sistem' } },
                { name: 'dari', type: 'date', label: 'Dari' }, { name: 'sampai', type: 'date', label: 'Sampai' },
            ]} />
            <Card pad={false}>
                {logs.data.length === 0 ? <Empty title="Tidak ada log" /> : (
                    <div className="overflow-x-auto"><table className="table-app">
                        <thead><tr><th>Waktu</th><th>Pelaku</th><th>Aksi</th><th>Deskripsi</th><th>Objek</th><th>IP</th></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                            {logs.data.map((l) => (
                                <Fragment key={l.id}>
                                    <tr onClick={() => (l.old_values || l.new_values) && setOpen(open === l.id ? null : l.id)} className={cx((l.old_values || l.new_values) && 'cursor-pointer')}>
                                        <td className="font-mono text-xs">{l.created_at}</td>
                                        <td>{l.user_name}<br /><Badge className={ROLE[l.role] ?? 'bg-brand-50 text-brand-700 ring-brand-300'}>{l.role}</Badge></td>
                                        <td><code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{l.action}</code></td>
                                        <td className="max-w-md whitespace-normal">{l.description}{(l.old_values || l.new_values) && <span className="ml-1 text-xs text-brand-700">[detail]</span>}</td>
                                        <td className="text-xs">{l.subject ?? '-'}</td><td className="font-mono text-xs">{l.ip}</td>
                                    </tr>
                                    {open === l.id && (
                                        <tr key={`${l.id}-d`}><td colSpan={6} className="bg-sand-50">
                                            <div className="grid gap-3 text-xs md:grid-cols-2">
                                                <div><p className="mb-1 font-semibold text-red-700">Sebelum</p><pre className="whitespace-pre-wrap rounded bg-white p-2">{JSON.stringify(l.old_values, null, 2)}</pre></div>
                                                <div><p className="mb-1 font-semibold text-emerald-700">Sesudah</p><pre className="whitespace-pre-wrap rounded bg-white p-2">{JSON.stringify(l.new_values, null, 2)}</pre></div>
                                            </div>
                                        </td></tr>
                                    )}
                                </Fragment>
                            ))}
                        </tbody>
                    </table></div>
                )}
                <Pagination meta={logs} />
            </Card>
        </AdminLayout>
    );
}
