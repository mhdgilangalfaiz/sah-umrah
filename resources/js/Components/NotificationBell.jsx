import { Link, router, usePage } from '@inertiajs/react';
import axios from 'axios';
import { Bell, CheckCheck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cx } from './ui';

const LEVEL = { success: 'bg-emerald-500', warning: 'bg-amber-500', danger: 'bg-red-500', info: 'bg-sky-500' };

export default function NotificationBell({ dark = false }) {
    const { unreadNotifications, auth } = usePage().props;
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState([]);
    const [count, setCount] = useState(unreadNotifications);
    const ref = useRef(null);

    useEffect(() => setCount(unreadNotifications), [unreadNotifications]);

    useEffect(() => {
        const poll = setInterval(() => {
            axios.get(route('notifications.latest')).then(({ data }) => setCount(data.unread)).catch(() => {});
        }, 45000);
        const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
        document.addEventListener('mousedown', close);
        return () => {
            clearInterval(poll);
            document.removeEventListener('mousedown', close);
        };
    }, []);

    const toggle = async () => {
        setOpen((o) => !o);
        if (!open) {
            const { data } = await axios.get(route('notifications.latest'));
            setItems(data.items);
            setCount(data.unread);
        }
    };

    return (
        <div className="relative" ref={ref}>
            <button onClick={toggle} className={cx('relative rounded-xl p-2', dark ? 'text-white hover:bg-white/10' : 'text-slate-600 hover:bg-slate-100')} aria-label="Notifikasi">
                <Bell className="h-5 w-5" />
                {count > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-[20px] place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                        {count > 99 ? '99+' : count}
                    </span>
                )}
            </button>
            {open && (
                <div className="absolute right-0 z-50 mt-2 w-[min(92vw,360px)] animate-pop overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-xl">
                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                        <p className="font-semibold">Notifikasi</p>
                        {count > 0 && (
                            <button onClick={() => router.post(route('notifications.read-all'), {}, { preserveScroll: true, onSuccess: () => setOpen(false) })} className="flex items-center gap-1 text-xs text-brand-700 hover:underline">
                                <CheckCheck className="h-3.5 w-3.5" /> Tandai semua dibaca
                            </button>
                        )}
                    </div>
                    <div className="max-h-96 divide-y divide-slate-100 overflow-y-auto">
                        {items.length === 0 && <p className="px-4 py-8 text-center text-sm text-slate-400">Belum ada notifikasi</p>}
                        {items.map((n) => (
                            <button key={n.id} onClick={() => router.post(route('notifications.read', n.id))} className={cx('flex w-full gap-3 px-4 py-3 text-left hover:bg-sand-50', !n.read_at && 'bg-brand-50/40')}>
                                <span className={cx('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.read_at ? 'bg-slate-200' : LEVEL[n.data.level] ?? LEVEL.info)} />
                                <span className="min-w-0">
                                    <span className="block text-sm font-semibold text-slate-800">{n.data.title}</span>
                                    <span className="line-clamp-2 block text-xs text-slate-500">{n.data.message}</span>
                                    <span className="mt-0.5 block text-[11px] text-slate-400">{n.created_at}</span>
                                </span>
                            </button>
                        ))}
                    </div>
                    <Link href={auth.user?.is_admin ? route('admin.notifications') : route('notifications.index')} className="block border-t border-slate-100 py-2.5 text-center text-sm font-medium text-brand-700 hover:bg-sand-50">
                        Lihat semua
                    </Link>
                </div>
            )}
        </div>
    );
}
