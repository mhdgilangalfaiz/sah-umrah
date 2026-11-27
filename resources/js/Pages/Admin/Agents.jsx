import { router, useForm } from '@inertiajs/react';
import axios from 'axios';
import { AlertTriangle, CheckCheck, ChevronDown, Handshake, Loader2, MessageCircle, Pencil, Phone, Search, Send, Trash2, UserPlus, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Badge, Card, Empty, PageHeader, cx } from '@/Components/ui';

const STATUS_CLS = {
    antri: 'bg-slate-100 text-slate-600 ring-slate-300',
    terkirim: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    simulasi: 'bg-sky-50 text-sky-700 ring-sky-600/20',
    gagal: 'bg-red-50 text-red-700 ring-red-600/20',
};

/**
 * Agen: pelanggan yang ditandai admin (penanda internal — pengguna tidak tahu).
 * Pilih layanan (paket / tiket / visa / promo / pesan bebas) → pesan WA tersusun otomatis → kirim serentak ke semua agen.
 */
export default function Agents({ agents, filters, options, types, broadcasts, waActive }) {
    const reachable = agents.filter((a) => a.is_active && a.phone).length;

    return (
        <AdminLayout title="Agen" icon={Handshake}>
            <PageHeader title="Agen" subtitle="Pelanggan yang menjual kembali layanan SAH. Penanda ini hanya terlihat admin — pengguna tidak tahu dirinya ditandai sebagai agen." />

            {!waActive && (
                <div className="mb-5 flex gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
                    <AlertTriangle className="h-5 w-5 shrink-0" />
                    <p><b>WhatsApp belum aktif (mode simulasi).</b> Pesan belum benar-benar terkirim, hanya dicatat. Isi <code className="rounded bg-white px-1">WHATSAPP_TOKEN</code> (token Fonnte) di file .env untuk mengirim sungguhan.</p>
                </div>
            )}
            <WaTest active={waActive} />

            <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
                <Composer options={options} types={types} total={agents.length} reachable={reachable} />
                <AgentList agents={agents} filters={filters} />
            </div>

            <History broadcasts={broadcasts} />
        </AdminLayout>
    );
}

/* ---------------- Kirim informasi ---------------- */
function Composer({ options, types, total, reachable }) {
    const form = useForm({ item_type: 'paket', item_id: '', title: '', message: '' });
    const [loading, setLoading] = useState(false);
    const list = options[form.data.item_type] ?? [];

    const load = async (type, id) => {
        if (type !== 'bebas' && !id) { form.setData((d) => ({ ...d, item_type: type, item_id: '', title: '', message: '' })); return; }
        setLoading(true);
        try {
            const { data } = await axios.post(route('admin.agents.preview'), { item_type: type, item_id: id || null });
            form.setData((d) => ({ ...d, item_type: type, item_id: id, title: data.title, message: data.message }));
        } finally { setLoading(false); }
    };

    const submit = (e) => {
        e.preventDefault();
        if (!confirm(`Kirim pesan WhatsApp ini ke ${reachable} agen sekarang?`)) return;
        form.post(route('admin.agents.send'), { preserveScroll: true, onSuccess: () => form.reset() });
    };

    const sample = (form.data.message || '').replaceAll('{nama}', 'Bapak Ahmad');

    return (
        <Card title="Kirim informasi ke semua agen">
            <form onSubmit={submit} className="space-y-4">
                <div>
                    <label className="label">1. Pilih jenis informasi</label>
                    <div className="flex flex-wrap gap-2">
                        {Object.entries(types).map(([k, l]) => (
                            <button key={k} type="button" onClick={() => load(k, '')}
                                className={cx('rounded-full px-4 py-1.5 text-sm font-semibold ring-1 transition', form.data.item_type === k ? 'bg-brand-700 text-white ring-brand-700' : 'bg-white text-slate-700 ring-slate-200 hover:ring-brand-400')}>
                                {l}
                            </button>
                        ))}
                    </div>
                </div>

                {form.data.item_type !== 'bebas' && (
                    <div>
                        <label className="label">2. Pilih {types[form.data.item_type].toLowerCase()} yang akan disebarkan</label>
                        {list.length === 0 ? <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">Belum ada {types[form.data.item_type].toLowerCase()} yang aktif.</p> : (
                            <select className="input" value={form.data.item_id} onChange={(e) => load(form.data.item_type, e.target.value)}>
                                <option value="">— pilih —</option>
                                {list.map((o) => <option key={o.id} value={o.id}>{o.label} · {o.sub}</option>)}
                            </select>
                        )}
                        {form.errors.item_id && <p className="error">{form.errors.item_id}</p>}
                    </div>
                )}

                {(form.data.message || form.data.item_type === 'bebas' || loading) && (
                    <div className="grid gap-4 lg:grid-cols-2">
                        <div>
                            <label className="label flex items-center justify-between">{form.data.item_type === 'bebas' ? '2' : '3'}. Isi pesan (bisa diedit) {loading && <Loader2 className="h-4 w-4 animate-spin" />}</label>
                            <input className="input mb-2" value={form.data.title} onChange={(e) => form.setData('title', e.target.value)} placeholder="Judul (untuk riwayat)" maxLength={200} />
                            <textarea className="input min-h-[300px] font-mono text-[13px]" value={form.data.message} onChange={(e) => form.setData('message', e.target.value)} maxLength={4000} />
                            <p className="hint"><code>{'{nama}'}</code> otomatis diganti nama tiap agen · <code>*tebal*</code> · <code>_miring_</code></p>
                            {form.errors.message && <p className="error">{form.errors.message}</p>}
                            {form.errors.title && <p className="error">{form.errors.title}</p>}
                        </div>
                        <div>
                            <label className="label">Pratinjau di WhatsApp</label>
                            <div className="min-h-[300px] rounded-2xl bg-[#e5ddd5] p-3">
                                <div className="ml-auto max-w-[92%] whitespace-pre-wrap break-words rounded-xl rounded-tr-sm bg-[#dcf8c6] px-3 py-2 text-[13px] leading-relaxed text-slate-900 shadow-sm"
                                    dangerouslySetInnerHTML={{ __html: waFormat(sample) }} />
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                    <p className="text-sm text-slate-600">
                        Dikirim ke <b>{reachable}</b> agen{total - reachable > 0 && <span className="text-amber-700"> · {total - reachable} agen dilewati (nonaktif / tanpa nomor WA)</span>}
                    </p>
                    <button disabled={form.processing || loading || !form.data.message || !reachable} className="btn-primary">
                        {form.processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Kirim ke semua agen
                    </button>
                </div>
            </form>
        </Card>
    );
}

/** Format WA sederhana untuk pratinjau: *tebal*, _miring_, ~coret~ (teks di-escape dulu) */
function waFormat(text) {
    const esc = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return esc.replace(/\*([^*\n]+)\*/g, '<b>$1</b>').replace(/_([^_\n]+)_/g, '<i>$1</i>').replace(/~([^~\n]+)~/g, '<s>$1</s>');
}

/* ---------------- Daftar agen ---------------- */
function AgentList({ agents, filters }) {
    const [q, setQ] = useState(filters.q ?? '');
    const [adding, setAdding] = useState(false);

    return (
        <Card title={`Daftar agen (${agents.length})`} pad={false}>
            <div className="space-y-3 border-b border-slate-100 p-4">
                <form onSubmit={(e) => { e.preventDefault(); router.get(route('admin.agents.index'), q ? { q } : {}, { preserveState: true, preserveScroll: true }); }} className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input className="input pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari agen: nama / HP / kode" />
                </form>
                {adding ? <AddAgent onClose={() => setAdding(false)} /> : (
                    <button onClick={() => setAdding(true)} className="btn-outline btn-sm w-full"><UserPlus className="h-4 w-4" />Tandai pelanggan sebagai agen</button>
                )}
            </div>
            {agents.length === 0 ? <Empty icon={Handshake} title="Belum ada agen" text="Tandai pelanggan yang sering memesan banyak / menjual kembali layanan SAH." /> : (
                <ul className="max-h-[560px] divide-y divide-slate-100 overflow-y-auto">
                    {agents.map((a) => <AgentRow key={a.id} a={a} />)}
                </ul>
            )}
        </Card>
    );
}

function AgentRow({ a }) {
    const [editing, setEditing] = useState(false);
    const [note, setNote] = useState(a.note ?? '');
    const save = () => router.put(route('admin.agents.note', a.id), { note }, { preserveScroll: true, onSuccess: () => setEditing(false) });

    return (
        <li className="px-4 py-3">
            <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{a.name} {!a.is_active && <Badge className="bg-red-50 text-red-700 ring-red-600/20">Nonaktif</Badge>}</p>
                    <p className="flex items-center gap-1 text-xs text-slate-500">
                        <span className="font-mono text-brand-700">{a.code}</span> ·
                        {a.phone ? <><Phone className="h-3 w-3" />{a.phone}</> : <span className="font-semibold text-amber-700">tanpa nomor WA</span>}
                        · {a.orders} pesanan
                    </p>
                    {!editing && a.note && <p className="mt-0.5 text-xs italic text-slate-500">“{a.note}”</p>}
                </div>
                <button onClick={() => setEditing((e) => !e)} className="btn-ghost btn-sm px-1.5" title="Catatan"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => confirm(`Hapus tanda agen untuk ${a.name}?`) && router.delete(route('admin.agents.unmark', a.id), { preserveScroll: true })}
                    className="btn-ghost btn-sm px-1.5 text-red-600" title="Hapus dari agen"><Trash2 className="h-4 w-4" /></button>
            </div>
            {editing && (
                <div className="mt-2 flex gap-1.5">
                    <input className="input py-1.5 text-sm" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Catatan internal, mis. agen wilayah Binjai" maxLength={255} autoFocus />
                    <button onClick={save} className="btn-primary btn-sm">Simpan</button>
                </div>
            )}
        </li>
    );
}

function AddAgent({ onClose }) {
    const [q, setQ] = useState('');
    const [results, setResults] = useState([]);
    const [busy, setBusy] = useState(false);
    const timer = useRef(null);

    useEffect(() => {
        window.clearTimeout(timer.current);
        if (q.trim().length < 2) { setResults([]); return undefined; }
        timer.current = window.setTimeout(async () => {
            setBusy(true);
            try { setResults((await axios.get(route('admin.agents.search'), { params: { q } })).data); } finally { setBusy(false); }
        }, 300);
        return () => window.clearTimeout(timer.current);
    }, [q]);

    const mark = (u) => router.post(route('admin.agents.mark', u.id), {}, { preserveScroll: true, onSuccess: () => { setQ(''); setResults([]); } });

    return (
        <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-3">
            <div className="flex items-center gap-2">
                <input className="input py-1.5 text-sm" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ketik nama / email / HP / kode pelanggan" />
                {busy && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-brand-700" />}
                <button onClick={onClose} className="btn-ghost btn-sm px-1.5" aria-label="Tutup"><X className="h-4 w-4" /></button>
            </div>
            {q.trim().length >= 2 && !busy && results.length === 0 && <p className="mt-2 text-xs text-slate-500">Tidak ada pelanggan yang cocok (atau sudah menjadi agen).</p>}
            <ul className="mt-2 space-y-1">
                {results.map((u) => (
                    <li key={u.id} className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-sm">
                        <span className="min-w-0"><span className="block truncate font-medium">{u.name}</span><span className="block truncate text-xs text-slate-500">{u.customer_code} · {u.phone ?? 'tanpa HP'} · {u.email}</span></span>
                        <button onClick={() => mark(u)} className="btn-primary btn-sm shrink-0">Jadikan agen</button>
                    </li>
                ))}
            </ul>
        </div>
    );
}

/* ---------------- Riwayat siaran ---------------- */
function History({ broadcasts }) {
    return (
        <Card title="Riwayat siaran" className="mt-6" pad={false}>
            {broadcasts.length === 0 ? <Empty icon={MessageCircle} title="Belum ada siaran" text="Pesan yang dikirim ke agen akan tercatat di sini beserta status tiap agen." /> : (
                <ul className="divide-y divide-slate-100">{broadcasts.map((b) => <HistoryRow key={b.id} b={b} />)}</ul>
            )}
        </Card>
    );
}

function HistoryRow({ b }) {
    const [open, setOpen] = useState(false);
    const [rows, setRows] = useState(null);

    // pantau status selama masih ada yang dalam antrean
    useEffect(() => {
        if (!open) return undefined;
        let stop = false;
        let t;
        const tick = async () => {
            const { data } = await axios.get(route('admin.agents.status', b.id));
            if (stop) return;
            setRows(data);
            if (data.some((r) => r.status === 'antri')) t = window.setTimeout(tick, 3000);
        };
        tick();
        return () => { stop = true; window.clearTimeout(t); };
    }, [open, b.id]);

    const done = rows ? rows.filter((r) => r.status !== 'antri').length : b.recipients - b.queued;

    return (
        <li className="px-5 py-3">
            <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 text-left">
                <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{b.title}</span>
                    <span className="block text-xs text-slate-500">{b.type} · {b.at} · oleh {b.by ?? '-'}</span>
                </span>
                <span className="flex shrink-0 items-center gap-1.5 text-xs">
                    <Badge className={STATUS_CLS.terkirim}><CheckCheck className="mr-0.5 h-3 w-3" />{b.sent}/{b.recipients}</Badge>
                    {b.failed > 0 && <Badge className={STATUS_CLS.gagal}>{b.failed} gagal</Badge>}
                    {done < b.recipients && <Badge className={STATUS_CLS.antri}><Loader2 className="mr-0.5 h-3 w-3 animate-spin" />mengirim</Badge>}
                </span>
                <ChevronDown className={cx('h-4 w-4 shrink-0 text-slate-400 transition', open && 'rotate-180')} />
            </button>
            {open && (
                <div className="mt-3 grid gap-4 lg:grid-cols-2">
                    <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-3 font-sans text-xs text-slate-700">{b.message}</pre>
                    <div className="max-h-64 overflow-auto rounded-xl border border-slate-100">
                        {!rows ? <p className="p-3 text-sm text-slate-500"><Loader2 className="inline h-4 w-4 animate-spin" /> Memuat…</p> : (
                            <table className="table-app text-xs">
                                <thead><tr><th>Agen</th><th>Nomor</th><th>Status</th></tr></thead>
                                <tbody className="divide-y divide-slate-100">
                                    {rows.map((r) => (
                                        <tr key={r.id}><td>{r.name}</td><td className="font-mono">{r.phone ?? '-'}</td>
                                            <td><Badge className={STATUS_CLS[r.status]}>{r.status_label}</Badge>{r.error && <span className="block text-[11px] text-red-600">{r.error}</span>}{r.sent_at && <span className="block text-[11px] text-slate-400">{r.sent_at}</span>}</td></tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}
        </li>
    );
}

/** Cek sambungan WhatsApp: kirim satu pesan tes ke nomor sendiri */
function WaTest({ active }) {
    const form = useForm({ phone: '' });
    return (
        <form onSubmit={(e) => { e.preventDefault(); form.post(route('admin.agents.test'), { preserveScroll: true }); }}
            className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-white bg-white/90 p-4 shadow-sm">
            <span className={cx('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ring-1', active ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' : 'bg-amber-50 text-amber-800 ring-amber-600/20')}>
                <MessageCircle className="h-3.5 w-3.5" />{active ? 'WhatsApp aktif (Fonnte)' : 'Mode simulasi'}
            </span>
            <span className="text-sm text-slate-600">Cek sambungan sebelum mengirim ke semua agen:</span>
            <input className="input w-52 py-1.5 text-sm" inputMode="tel" placeholder="0856xxxxxxxx" value={form.data.phone} onChange={(e) => form.setData('phone', e.target.value.replace(/[^0-9+]/g, ''))} />
            <button disabled={!form.data.phone || form.processing} className="btn-outline btn-sm">{form.processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Kirim pesan tes</button>
            {form.errors.phone && <p className="error w-full">{form.errors.phone}</p>}
        </form>
    );
}
