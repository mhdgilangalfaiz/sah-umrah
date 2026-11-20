import { Link, usePage } from '@inertiajs/react';
import axios from 'axios';
import { Bot, Headset, MessageCircle, RotateCcw, Send, ShieldCheck, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { cx } from './ui';

/**
 * Pusat Bantuan (chatbox) — menggantikan konsultasi WhatsApp.
 * Asisten otomatis menjawab dari basis data; bila tidak bisa menjawab, pelanggan dihubungkan ke admin.
 * Pesan admin diambil berkala (polling) sehingga percakapan terasa langsung.
 */
export default function ChatWidget() {
    const { auth } = usePage().props;
    const [open, setOpen] = useState(false);
    const [data, setData] = useState({ messages: [], ticket: null });
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const [unread, setUnread] = useState(false);
    const listRef = useRef(null);
    const lastId = useRef(0);

    const merge = useCallback((res) => {
        setData((prev) => {
            const known = new Set(prev.messages.map((m) => m.id));
            const fresh = res.messages.filter((m) => !known.has(m.id));
            if (fresh.some((m) => m.sender_type === 'admin')) setUnread(true);
            const messages = [...prev.messages, ...fresh];
            lastId.current = messages.length ? messages[messages.length - 1].id : 0;
            return { ...res, messages };
        });
    }, []);

    const load = useCallback(async (full = false) => {
        const { data: res } = await axios.get(route('chat.show'), { params: { after: full ? 0 : lastId.current } });
        if (full) {
            lastId.current = 0;
            setData({ ...res, messages: [] });
        }
        merge(res);
    }, [merge]);

    useEffect(() => {
        if (open) {
            load(true);
            setUnread(false);
        }
    }, [open, load]);

    // polling: cepat saat terhubung admin, lambat saat bot
    useEffect(() => {
        if (!open) return;
        const live = ['menunggu_admin', 'ditangani'].includes(data.ticket?.status);
        const t = setInterval(() => load(false).catch(() => {}), live ? 4000 : 15000);
        return () => clearInterval(t);
    }, [open, data.ticket?.status, load]);

    useEffect(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
    }, [data.messages.length, open]);

    const send = async (msg) => {
        const body = (msg ?? text).trim();
        if (!body || sending) return;
        setSending(true);
        setText('');
        try {
            const { data: res } = await axios.post(route('chat.send'), { message: body, after: lastId.current });
            merge(res);
        } finally {
            setSending(false);
        }
    };

    const restart = async () => {
        if (!window.confirm('Mulai percakapan baru? Riwayat percakapan lama tetap tersimpan.')) return;
        const { data: res } = await axios.post(route('chat.restart'));
        lastId.current = 0;
        setData({ ...res, messages: [] });
        merge(res);
    };

    const status = data.ticket?.status;
    const lastBot = [...data.messages].reverse().find((m) => m.sender_type !== 'user');
    const quick = lastBot?.options?.replies ?? [];

    return (
        <>
            <button
                onClick={() => setOpen((o) => !o)}
                className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full bg-brand-700 px-4 py-3 text-sm font-semibold text-white shadow-lift transition hover:bg-brand-800 sm:bottom-6 sm:right-6"
                aria-label="Pusat Bantuan"
            >
                {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
                <span className="hidden sm:inline">{open ? 'Tutup' : 'Butuh Bantuan?'}</span>
                {unread && !open && <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-gold-400 ring-2 ring-white" />}
            </button>

            {open && (
                <div className="fixed inset-x-2 bottom-20 z-50 flex max-h-[78vh] animate-pop flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:inset-x-auto sm:bottom-24 sm:right-6 sm:w-[390px]">
                    <div className="relative overflow-hidden bg-brand-800 px-4 py-3 text-white">
                        <div className="absolute inset-0 bg-pattern opacity-40" />
                        <div className="relative flex items-center gap-3">
                            <div className="grid h-10 w-10 place-items-center rounded-full bg-white/10">
                                {['menunggu_admin', 'ditangani'].includes(status) ? <Headset className="h-5 w-5 text-gold-300" /> : <Bot className="h-5 w-5 text-gold-300" />}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="font-semibold leading-tight">Pusat Bantuan SAH</p>
                                <p className="truncate text-xs text-brand-100">
                                    {status === 'ditangani' ? 'Terhubung dengan admin' : status === 'menunggu_admin' ? 'Menunggu admin bergabung…' : 'Asisten otomatis · 24 jam'}
                                </p>
                            </div>
                            <button onClick={restart} title="Percakapan baru" className="rounded-lg p-1.5 text-brand-100 hover:bg-white/10">
                                <RotateCcw className="h-4 w-4" />
                            </button>
                        </div>
                        {(data.ticket || data.customer_code) && (
                            <p className="relative mt-2 text-[11px] text-brand-200">
                                Tiket <b className="text-white">{data.ticket?.code}</b>
                                {data.customer_code && <> · Kode pelanggan <b className="text-white">{data.customer_code}</b></>}
                            </p>
                        )}
                    </div>

                    <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto bg-sand-50 px-3 py-4">
                        {data.messages.map((m) => (
                            <Message key={m.id} m={m} />
                        ))}
                        {sending && <div className="w-16 rounded-2xl bg-white px-3 py-2 text-center text-slate-400 shadow-soft">•••</div>}
                    </div>

                    {quick.length > 0 && !sending && (
                        <div className="flex gap-2 overflow-x-auto border-t border-slate-100 bg-white px-3 py-2 scrollbar-none">
                            {quick.map((q) => (
                                <button key={q} onClick={() => send(q)} className="shrink-0 rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-800 hover:bg-brand-100">
                                    {q}
                                </button>
                            ))}
                        </div>
                    )}
                    {lastBot?.options?.login_required && !auth.user && (
                        <div className="flex gap-2 border-t border-slate-100 bg-white px-3 py-2">
                            <Link href={route('login')} className="btn-primary btn-sm flex-1">Masuk</Link>
                            <Link href={route('register')} className="btn-outline btn-sm flex-1">Daftar</Link>
                        </div>
                    )}

                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            send();
                        }}
                        className="flex items-center gap-2 border-t border-slate-200 bg-white p-2"
                    >
                        <input
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            maxLength={2000}
                            placeholder="Ketik pertanyaan Anda…"
                            className="input flex-1 border-transparent bg-slate-50 focus:bg-white"
                        />
                        <button disabled={!text.trim() || sending} className="btn-primary h-10 w-10 shrink-0 !p-0" aria-label="Kirim">
                            <Send className="h-4 w-4" />
                        </button>
                    </form>
                    <p className="flex items-center justify-center gap-1 bg-white pb-2 text-[10px] text-slate-400">
                        <ShieldCheck className="h-3 w-3" /> Percakapan tersimpan aman di sistem
                    </p>
                </div>
            )}
        </>
    );
}

function Message({ m }) {
    if (m.sender_type === 'system') {
        return <div className="mx-auto max-w-[90%] rounded-xl bg-gold-50 px-3 py-2 text-center text-xs text-gold-800 ring-1 ring-gold-200">{m.message}</div>;
    }
    const mine = m.sender_type === 'user';
    return (
        <div className={cx('flex flex-col', mine ? 'items-end' : 'items-start')}>
            {m.sender_type === 'admin' && <span className="mb-0.5 ml-1 text-[11px] font-semibold text-brand-700">{m.sender_name} · Admin</span>}
            <div
                className={cx(
                    'max-w-[85%] whitespace-pre-line rounded-2xl px-3.5 py-2 text-sm shadow-soft',
                    mine ? 'rounded-br-md bg-brand-700 text-white' : m.sender_type === 'admin' ? 'rounded-bl-md bg-white ring-1 ring-brand-200' : 'rounded-bl-md bg-white text-slate-700',
                )}
            >
                {m.message}
            </div>
            <span className="mx-1 mt-0.5 text-[10px] text-slate-400">{m.created_at}</span>
        </div>
    );
}
