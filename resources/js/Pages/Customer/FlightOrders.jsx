import { Link } from '@inertiajs/react';
import { Plane } from 'lucide-react';
import CustomerLayout from '@/Layouts/CustomerLayout';
import { Card, Empty, PageHeader, Pagination, StatusBadge } from '@/Components/ui';
import { dateTime, rupiah } from '@/lib/format';

export default function FlightOrders({ orders }) {
    return (
        <CustomerLayout title="Tiket Pesawat">
            <PageHeader title="Tiket Pesawat" subtitle="Pesanan tiket dan e-ticket Anda." actions={<Link href={route('flights.index')} className="btn-primary btn-sm">Cari Tiket</Link>} />
            <Card pad={false}>
                {orders.data.length === 0 ? <Empty icon={Plane} title="Belum ada pesanan tiket" /> : (
                    <div className="divide-y divide-slate-100">
                        {orders.data.map((o) => (
                            <Link key={o.id} href={route('customer.flight-orders.show', o.code)} className="flex flex-wrap items-center justify-between gap-3 p-5 hover:bg-sand-50">
                                <div>
                                    <p className="font-semibold">{o.flight.airline} · {o.flight.route_label}</p>
                                    <p className="text-xs text-slate-500">{o.code} · {dateTime(o.flight.depart_at)} · {o.pax_count} penumpang{o.pnr && ` · PNR ${o.pnr}`}</p>
                                </div>
                                <div className="text-right"><p className="font-semibold">{rupiah(o.total_amount)}</p><StatusBadge status={o.status} /></div>
                            </Link>
                        ))}
                    </div>
                )}
                <Pagination meta={orders} />
            </Card>
        </CustomerLayout>
    );
}
