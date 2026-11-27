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
                        {bookings.data.map((b) => {
                            const closed = ['dibatalkan', 'refund', 'kedaluwarsa'].includes(b.status);
                            return (
                            <Link key={b.id} href={route('customer.bookings.show', b.code)} className={`block p-5 hover:bg-sand-50 ${closed ? 'bg-slate-50/70 opacity-75' : ''}`}>
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div>
                                        <p className="font-semibold">{b.departure.package.name}</p>
                                        <p className="text-xs text-slate-500">{b.code} · {b.pax_count} jamaah · berangkat {date(b.departure.departure_date)} · {b.payment_scheme}</p>
                                    </div>
                                    <StatusBadge status={b.status} />
                                </div>
                                {closed ? (
                                    <p className={`mt-3 rounded-lg px-3 py-2 text-xs ${b.status === 'refund' ? 'bg-violet-50 text-violet-800' : 'bg-red-50 text-red-700'}`}>
                                        {b.status === 'refund' ? 'Pesanan dibatalkan — dana dikembalikan.' : b.status === 'kedaluwarsa' ? 'Pesanan kedaluwarsa — kursi dilepas.' : 'Pesanan dibatalkan.'}
                                        {b.cancel_reason && <span className="text-slate-500"> {b.cancel_reason}</span>}
                                    </p>
                                ) : (
                                    <div className="mt-3 flex items-center gap-3"><Progress value={(b.paid_amount / b.total_amount) * 100} /><span className="shrink-0 text-xs">{rupiah(b.paid_amount)} / {rupiah(b.total_amount)}</span></div>
                                )}
                                {!closed && b.last_change && b.last_change.type !== 'pembatalan' && (
                                    <p className="mt-2 text-xs text-violet-700"><b>{b.last_change.label}</b> ({b.last_change.at}): {b.last_change.text}</p>
                                )}
                                {b.pending_request && <p className="mt-1 text-xs font-semibold text-amber-700">Pengajuan {b.pending_request.toLowerCase()} sedang ditinjau admin.</p>}
                            </Link>
                            );
                        })}
                    </div>
                )}
                <Pagination meta={bookings} />
            </Card>
        </CustomerLayout>
    );
}
