import { Link } from '@inertiajs/react';
import CustomerLayout from '@/Layouts/CustomerLayout';
import { Card, Empty, PageHeader, Pagination, Progress, StatusBadge } from '@/Components/ui';
import { date, rupiah } from '@/lib/format';

export default function Bookings({ bookings }) {
    return (
        <CustomerLayout title="Umrah Saya">
            <PageHeader title="Umrah Saya" subtitle="Riwayat pemesanan paket umrah beserta status pembayaran." />
            <Card pad={false}>
                {bookings.data.length === 0 ? <Empty title="Belum ada pesanan" action={<Link href={route('packages.index')} className="btn-primary">Lihat Paket</Link>} /> : (
                    <div className="divide-y divide-slate-100">
                        {bookings.data.map((b) => (
                            <Link key={b.id} href={route('customer.bookings.show', b.code)} className="block p-5 hover:bg-sand-50">
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div>
                                        <p className="font-semibold">{b.departure.package.name}</p>
                                        <p className="text-xs text-slate-500">{b.code} · {b.pax_count} jamaah · berangkat {date(b.departure.departure_date)} · {b.payment_scheme}</p>
                                    </div>
                                    <StatusBadge status={b.status} />
                                </div>
                                <div className="mt-3 flex items-center gap-3"><Progress value={(b.paid_amount / b.total_amount) * 100} /><span className="shrink-0 text-xs">{rupiah(b.paid_amount)} / {rupiah(b.total_amount)}</span></div>
                            </Link>
                        ))}
                    </div>
                )}
                <Pagination meta={bookings} />
            </Card>
        </CustomerLayout>
    );
}
