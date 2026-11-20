import { Link } from '@inertiajs/react';
import { Stamp } from 'lucide-react';
import CustomerLayout from '@/Layouts/CustomerLayout';
import { Card, Empty, PageHeader, Pagination, StatusBadge } from '@/Components/ui';
import { dateTime, rupiah } from '@/lib/format';

export default function Visas({ applications }) {
    return (
        <CustomerLayout title="Visa">
            <PageHeader title="Pengajuan Visa" subtitle="Pantau status visa secara real-time." actions={<Link href={route('checkout.visa')} className="btn-primary btn-sm">Ajukan Visa</Link>} />
            <Card pad={false}>
                {applications.data.length === 0 ? <Empty icon={Stamp} title="Belum ada pengajuan visa" /> : (
                    <div className="divide-y divide-slate-100">
                        {applications.data.map((v) => (
                            <Link key={v.id} href={route('customer.visa.show', v.code)} className="flex flex-wrap items-center justify-between gap-3 p-5 hover:bg-sand-50">
                                <div><p className="font-semibold">{v.service.name} · {v.pax_count} orang</p><p className="text-xs text-slate-500">{v.code} · {dateTime(v.created_at)}</p></div>
                                <div className="text-right">{v.total_amount > 0 && <p className="font-semibold">{rupiah(v.total_amount)}</p>}<StatusBadge status={v.status} /></div>
                            </Link>
                        ))}
                    </div>
                )}
                <Pagination meta={applications} />
            </Card>
        </CustomerLayout>
    );
}
