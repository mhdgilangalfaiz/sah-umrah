import { usePage } from '@inertiajs/react';

/** Path dari URL route: "http://x.test/admin/visa/SAH-V-1" → "/admin/visa/SAH-V-1" */
const pathOf = (url) => { try { return new URL(url, window.location.origin).pathname.replace(/\/+$/, '') || '/'; } catch { return url; } };

/**
 * Cek apakah sebuah item punya notifikasi admin yang belum dibaca.
 * isNew(route('admin.visa.show', code))  → detail
 * isNew(route('admin.payments.index'), code) → item di daftar yang dibuka via ?q=kode
 */
export function useUnread() {
    const targets = usePage().props.unreadTargets ?? [];
    return (url, q = null) => targets.includes(pathOf(url) + (q ? `?q=${String(q).toLowerCase()}` : ''));
}

/** Penanda merah "Baru" di samping kode item yang notifikasinya belum dibuka */
export function NewDot({ show }) {
    if (!show) return null;
    return <span className="ml-1.5 inline-flex items-center rounded-full bg-red-500 px-1.5 py-px align-middle text-[10px] font-bold uppercase text-white" title="Notifikasi belum dibuka">Baru</span>;
}
