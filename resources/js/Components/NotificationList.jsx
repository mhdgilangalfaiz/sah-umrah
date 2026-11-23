import { router } from '@inertiajs/react';
import { Bell, CheckCheck } from 'lucide-react';
import { Card, Empty, PageHeader, Pagination, cx } from './ui';

const CATEGORIES = { '': 'Semua', pembayaran: 'Pembayaran', cicilan: 'Cicilan', pesanan: 'Pesanan', keberangkatan: 'Keberangkatan', dokumen: 'Dokumen', visa: 'Visa', tiket: 'Tiket', bantuan: 'Bantuan', refund: 'Refund', promo: 'Promo', keamanan: 'Keamanan', akun: 'Akun' };
const LEVEL = { success: 'border-l-emerald-500', warning: 'border-l-amber-500', danger: 'border-l-red-500', info: 'border-l-sky-500' };

export default function NotificationList({ notifications, filter, indexRoute }) {
    return (
        <>
            <PageHeader title="Notifikasi" actions={<button onClick={() => router.post(route('notifications.read-all'))} className="btn-outline btn-sm"><CheckCheck className="h-4 w-4" />Tandai semua dibaca</button>} />
            <div className="mb-4 flex flex-wrap gap-2">
                {Object.entries(CATEGORIES).map(([k, l]) => (
                    <button key={k} onClick={() => router.get(route(indexRoute), k ? { kategori: k } : {}, { preserveState: true })} className={cx('shrink-0 rounded-full px-3 py-1.5 text-xs font-medium', (filter ?? '') === k ? 'bg-brand-700 text-white' : 'bg-white text-slate-600 shadow-soft')}>{l}</button>
                ))}
            </div>
            <Card pad={false}>
                {notifications.data.length === 0 ? <Empty icon={Bell} title="Tidak ada notifikasi" /> : (
                    <ul className="divide-y divide-slate-100">
                        {notifications.data.map((n) => (
                            <li key={n.id}>
                                <button onClick={() => router.post(route('notifications.read', n.id))} className={cx('w-full border-l-4 p-4 text-left hover:bg-sand-50', LEVEL[n.data.level] ?? LEVEL.info, !n.read_at && 'bg-brand-50/30')}>
                                    <div className="flex items-start justify-between gap-3">
                                        <p className={cx('text-sm', n.read_at ? 'text-slate-700' : 'font-semibold text-slate-900')}>{n.data.title}</p>
                                        <span className="shrink-0 text-xs text-slate-400">{n.created_at}</span>
                                    </div>
                                    <p className="mt-1 text-sm text-slate-500">{n.data.message}</p>
                                    <span className="mt-1 inline-block rounded bg-slate-100 px-1.5 text-[10px] uppercase tracking-wide text-slate-500">{n.data.category}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
                <Pagination meta={notifications} />
            </Card>
        </>
    );
}
