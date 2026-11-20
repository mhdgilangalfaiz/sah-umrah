import { Link, router } from '@inertiajs/react';
import axios from 'axios';
import { Bot, Send } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Card, DefList, PageHeader, StatusBadge, cx } from '@/Components/ui';
import { rupiah } from '@/lib/format';

export default function Show({ ticket, customer, messages: initial, history }) {
    const [messages, setMessages] = useState(initial);
    const [status, setStatus] = useState(ticket.status);
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const listRef = useRef(null);
    const lastId = () => messages[messages.length - 1]?.id ?? 0;

    useEffect(() => {
        const t = setInterval(async () => {
            const { data } = await axios.get(route('admin.support.messages', ticket.code), { params: { after: lastId() } });
            if (data.messages.length) setMessages((m) => [...m, ...data.messages.filter((x) => !m.some((y) => y.id === x.id))]);
            setStatus(data.status);
        }, 4000);
        return () => clearInterval(t);
    }, [messages]);

    useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }); }, [messages.length]);

    const send = async (e) => {
        e.preventDefault();
        if (!text.trim()) return;
        setSending(true);
        try {
            const { data } = await axios.post(route('admin.support.reply', ticket.code), { message: text, after: lastId() }, { headers: { Accept: 'application/json' } });
            setMessages((m) => [...m, ...data.messages.filter((x) => !m.some((y) => y.id === x.id))]);
            setText('');
        } finally { setSending(false); }
    };

    const QUICK = ['Assalamu\'alaikum, terima kasih telah menunggu. Ada yang dapat saya bantu?', 'Baik, mohon ditunggu sebentar, kami cek terlebih dahulu.', 'Apakah masih ada yang ingin ditanyakan?'];

    return (
        <AdminLayout title={`Tiket ${ticket.code}`}>
            <PageHeader back={route('admin.support.index')} title={customer?.name ?? 'Tamu'} subtitle={`${ticket.code} · Kode pelanggan ${customer?.customer_code ?? '-'}`}
                actions={<>
                    <StatusBadge status={status} />
                    {status !== 'selesai' ? <button onClick={() => router.post(route('admin.support.status', ticket.code), { status: 'selesai' })} className="btn-outline btn-sm">Tutup percakapan</button>
                        : <button onClick={() => router.post(route('admin.support.status', ticket.code), { status: 'ditangani' })} className="btn-outline btn-sm">Buka kembali</button>}
                </>} />
            <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
                <div className="card flex h-[70vh] flex-col overflow-hidden">
                    <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto bg-sand-50 p-4">
                        {messages.map((m) => m.sender_type === 'system' ? (
                            <p key={m.id} className="mx-auto max-w-md rounded-xl bg-gold-50 px-3 py-1.5 text-center text-xs text-gold-800">{m.message}</p>
                        ) : (
                            <div key={m.id} className={cx('flex flex-col', m.sender_type === 'admin' ? 'items-end' : 'items-start')}>
                                <span className="mb-0.5 flex items-center gap-1 px-1 text-[11px] text-slate-500">{m.sender_type === 'bot' && <Bot className="h-3 w-3" />}{m.sender_type === 'bot' ? 'Asisten otomatis' : m.sender_type === 'admin' ? `${m.sender_name} (Admin)` : customer?.name}</span>
                                <div className={cx('max-w-[80%] whitespace-pre-line rounded-2xl px-3.5 py-2 text-sm', m.sender_type === 'admin' ? 'bg-brand-700 text-white' : m.sender_type === 'bot' ? 'bg-slate-100 text-slate-600' : 'bg-white shadow-soft ring-1 ring-slate-200')}>{m.message}</div>
                                <span className="px-1 text-[10px] text-slate-400">{m.created_at}</span>
                            </div>
                        ))}
                    </div>
                    {status !== 'selesai' && (
                        <form onSubmit={send} className="border-t border-slate-200 bg-white p-3">
                            <div className="mb-2 flex gap-2 overflow-x-auto scrollbar-none">{QUICK.map((q) => <button type="button" key={q} onClick={() => setText(q)} className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 hover:bg-brand-50">{q.slice(0, 40)}…</button>)}</div>
                            <div className="flex gap-2">
                                <textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) send(e); }} className="input flex-1 resize-none" placeholder="Tulis balasan… (Enter untuk kirim)" />
                                <button disabled={sending || !text.trim()} className="btn-primary self-end"><Send className="h-4 w-4" /></button>
                            </div>
                        </form>
                    )}
                </div>
                <div className="space-y-6">
                    {customer && (
                        <Card title="Profil pelanggan">
                            <DefList items={[['Nama', customer.name], ['Kode', customer.customer_code], ['Email', customer.email], ['HP', customer.phone]]} />
                            <p className="mb-2 mt-5 text-xs font-semibold uppercase text-slate-400">Pesanan terakhir</p>
                            <ul className="space-y-1.5 text-sm">
                                {customer.bookings.map((b) => <li key={b.code} className="flex justify-between"><Link href={route('admin.bookings.show', b.code)} className="text-brand-700 hover:underline">{b.code}</Link><StatusBadge status={b.status} /></li>)}
                                {customer.flights.map((f) => <li key={f.code} className="flex justify-between"><Link href={route('admin.flight-orders.show', f.code)} className="text-brand-700 hover:underline">{f.code}</Link><StatusBadge status={f.status} /></li>)}
                                {customer.visas.map((v) => <li key={v.code} className="flex justify-between"><Link href={route('admin.visa.show', v.code)} className="text-brand-700 hover:underline">{v.code}</Link><StatusBadge status={v.status} /></li>)}
                                {customer.bookings.length + customer.flights.length + customer.visas.length === 0 && <li className="text-slate-400">Belum ada pesanan</li>}
                            </ul>
                        </Card>
                    )}
                    <Card title="Riwayat tiket lain">
                        {history.length === 0 ? <p className="text-sm text-slate-500">Tidak ada.</p> : history.map((h) => <Link key={h.code} href={route('admin.support.show', h.code)} className="flex justify-between py-1 text-sm hover:text-brand-700"><span>{h.code}</span><StatusBadge status={h.status} /></Link>)}
                    </Card>
                </div>
            </div>
        </AdminLayout>
    );
}
