import { Link } from '@inertiajs/react';
import { Headset } from 'lucide-react';
import AdminLayout from '@/Layouts/AdminLayout';
import FilterBar from '@/Components/FilterBar';
import { Card, Empty, PageHeader, Pagination, StatusBadge, cx } from '@/Components/ui';

export default function Index({ tickets, filters }) {
    return (
        <AdminLayout title="Pusat Bantuan">
            <PageHeader title="Pusat Bantuan" subtitle="Percakapan yang dihubungkan dari chatbox. Membuka tiket 'Menunggu Admin' otomatis menandai Anda sebagai penanggung jawab." />
            <FilterBar routeName="admin.support.index" filters={filters} fields={[
                { name: 'q', type: 'search', label: 'Kode tiket / nama / kode pelanggan' },
                { name: 'status', type: 'select', label: 'Status', options: { aktif: 'Aktif (menunggu & ditangani)', menunggu_admin: 'Menunggu Admin', ditangani: 'Ditangani', bot: 'Asisten Otomatis', selesai: 'Selesai', semua: 'Semua' } },
            ]} />
            <Card pad={false}>
                {tickets.data.length === 0 ? <Empty icon={Headset} title="Tidak ada percakapan" text="Belum ada pelanggan yang meminta dihubungkan dengan admin." /> : (
                    <ul className="divide-y divide-slate-100">
                        {tickets.data.map((t) => (
                            <li key={t.code}>
                                <Link href={route('admin.support.show', t.code)} className={cx('flex flex-wrap items-center gap-4 p-4 hover:bg-sand-50', t.status === 'menunggu_admin' && 'bg-amber-50/60')}>
                                    <div className="grid h-10 w-10 place-items-center rounded-full bg-brand-100 font-bold text-brand-700">{t.user?.charAt(0)}</div>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-semibold">{t.user} <span className="text-xs font-normal text-slate-500">{t.customer_code} · {t.code}</span></p>
                                        <p className="truncate text-sm text-slate-500">{t.last}</p>
                                    </div>
                                    <div className="text-right"><StatusBadge status={t.status} label={t.status_label} /><p className="mt-1 text-xs text-slate-400">{t.last_at}{t.assignee && ` · ${t.assignee}`}</p></div>
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
                <Pagination meta={tickets} />
            </Card>
        </AdminLayout>
    );
}
