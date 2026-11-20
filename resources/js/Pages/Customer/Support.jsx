import { Headset, MessageCircle } from 'lucide-react';
import { useState } from 'react';
import CustomerLayout from '@/Layouts/CustomerLayout';
import { Card, Empty, PageHeader, StatusBadge, cx } from '@/Components/ui';

export default function Support({ customerCode, tickets }) {
    const [open, setOpen] = useState(tickets[0]?.code);
    return (
        <CustomerLayout title="Riwayat Bantuan">
            <PageHeader title="Riwayat Pusat Bantuan" subtitle={`Seluruh percakapan Anda tersimpan dengan kode pelanggan ${customerCode}. Untuk bertanya, gunakan tombol "Butuh Bantuan?" di kanan bawah.`} />
            {tickets.length === 0 ? <Card><Empty icon={Headset} title="Belum ada percakapan" /></Card> : (
                <div className="space-y-3">
                    {tickets.map((t) => (
                        <div key={t.code} className="card overflow-hidden">
                            <button onClick={() => setOpen(open === t.code ? null : t.code)} className="flex w-full flex-wrap items-center justify-between gap-2 p-4 text-left">
                                <span className="flex items-center gap-2 font-semibold"><MessageCircle className="h-4 w-4 text-gold-500" />{t.code} <span className="text-xs font-normal text-slate-500">{t.created_at} · {t.messages.length} pesan</span></span>
                                <StatusBadge status={t.status} label={t.status_label} />
                            </button>
                            {open === t.code && (
                                <div className="max-h-96 space-y-2 overflow-y-auto border-t border-slate-100 bg-sand-50 p-4">
                                    {t.messages.map((m) => (
                                        <div key={m.id} className={cx('flex', m.sender_type === 'user' ? 'justify-end' : 'justify-start')}>
                                            <div className={cx('max-w-[85%] whitespace-pre-line rounded-2xl px-3 py-2 text-sm', m.sender_type === 'user' ? 'bg-brand-700 text-white' : m.sender_type === 'system' ? 'bg-gold-50 text-xs text-gold-800' : 'bg-white shadow-soft')}>
                                                {m.sender_type === 'admin' && <p className="text-[11px] font-semibold text-brand-700">{m.sender_name} · Admin</p>}
                                                {m.message}
                                                <p className={cx('mt-0.5 text-[10px]', m.sender_type === 'user' ? 'text-brand-200' : 'text-slate-400')}>{m.created_at}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </CustomerLayout>
    );
}
