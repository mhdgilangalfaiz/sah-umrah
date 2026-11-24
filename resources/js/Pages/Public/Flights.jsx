import { Link, router } from '@inertiajs/react';
import { ArrowLeftRight, Info, LayoutGrid, List, Search, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import PublicLayout from '@/Layouts/PublicLayout';
import { FlightCard, SeatUpdated, seatStatus } from '@/Components/FlightOffer';
import { Empty, cx } from '@/Components/ui';
import { date, rupiah, time } from '@/lib/format';

const REFRESH_MS = 30000; // ketersediaan seat dicek ulang otomatis tiap 30 detik

export default function Flights({ criteria, results, searched, airports, checkedAt }) {
    const [f, setF] = useState({
        asal: criteria.asal ?? 'KNO', tujuan: criteria.tujuan ?? 'JED', tanggal: criteria.tanggal ?? '', penumpang: criteria.penumpang ?? 1,
        kelas: criteria.kelas ?? 'ekonomi', jenis: criteria.jenis ?? '', transit: criteria.transit ?? '',
    });
    const [policy, setPolicy] = useState(null);
    const [view, setView] = useState(() => { try { return localStorage.getItem('flights.view') || 'kartu'; } catch { return 'kartu'; } });
    const pax = Number(criteria.penumpang ?? 1);

    const changeView = (v) => { setView(v); try { localStorage.setItem('flights.view', v); } catch { /* abaikan */ } };

    const search = (e) => {
        e.preventDefault();
        router.get(route('flights.index'), Object.fromEntries(Object.entries(f).filter(([, v]) => v !== '')), { preserveState: true });
    };

    // Seat berkurang realtime saat ada pembelian — muat ulang daftar secara berkala tanpa mengganggu pengguna
    useEffect(() => {
        const id = setInterval(() => {
            if (document.visibilityState === 'visible') router.reload({ only: ['results', 'checkedAt'], preserveScroll: true, preserveState: true });
        }, REFRESH_MS);
        return () => clearInterval(id);
    }, []);

    return (
        <PublicLayout title="Tiket Pesawat">
            <section className="relative overflow-hidden bg-brand-900 pb-28 pt-12 text-white">
                <div className="absolute inset-0 bg-pattern opacity-40" />
                <div className="container-app relative">
                    <h1 className="text-3xl text-white sm:text-4xl">Tiket Pesawat Umrah</h1>
                    <p className="mt-2 max-w-2xl text-brand-100">Pesan tiket keberangkatan umrah ke Jeddah dan Madinah dengan mudah. Tersedia pilihan sekali jalan maupun pulang-pergi, penerbangan langsung maupun transit, lengkap dengan informasi sisa kursi dan harga terkini.</p>
                </div>
            </section>

            <div className="container-app relative -mt-20">
                <form onSubmit={search} className="card grid gap-3 p-4 sm:p-5 md:grid-cols-[1fr_auto_1fr_1fr] lg:grid-cols-[1fr_auto_1fr_1fr_110px]">
                    <Airport label="Dari" value={f.asal} onChange={(v) => setF({ ...f, asal: v })} airports={airports} />
                    <button type="button" onClick={() => setF({ ...f, asal: f.tujuan, tujuan: f.asal })} className="btn-outline mx-auto h-10 w-10 self-end !p-0 md:mb-0.5" aria-label="Tukar asal dan tujuan"><ArrowLeftRight className="h-4 w-4" /></button>
                    <Airport label="Ke" value={f.tujuan} onChange={(v) => setF({ ...f, tujuan: v })} airports={airports} />
                    <div><label className="label">Tanggal berangkat</label><input type="date" className="input" value={f.tanggal} onChange={(e) => setF({ ...f, tanggal: e.target.value })} /></div>
                    <div><label className="label">Jumlah seat</label><input type="number" min={1} max={999} inputMode="numeric" className="input" value={f.penumpang} onChange={(e) => setF({ ...f, penumpang: e.target.value })} /></div>
                    <div className="grid grid-cols-2 gap-3 md:col-span-4 lg:col-span-5 lg:grid-cols-[1fr_1fr_1fr_auto]">
                        <div><label className="label">Jenis perjalanan</label><select className="input" value={f.jenis} onChange={(e) => setF({ ...f, jenis: e.target.value })}><option value="">Semua</option><option value="oneway">Sekali jalan</option><option value="pp">Pulang-pergi (PP)</option></select></div>
                        <div><label className="label">Rute</label><select className="input" value={f.transit} onChange={(e) => setF({ ...f, transit: e.target.value })}><option value="">Langsung & transit</option><option value="langsung">Langsung saja</option><option value="transit">Transit saja</option></select></div>
                        <div><label className="label">Kelas</label><select className="input" value={f.kelas} onChange={(e) => setF({ ...f, kelas: e.target.value })}><option value="ekonomi">Ekonomi</option><option value="bisnis">Bisnis</option></select></div>
                        <button className="btn-primary h-[42px] self-end px-6"><Search className="h-4 w-4" />Cari Seat</button>
                    </div>
                </form>

                <div className="mt-8 flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <h2 className="font-sans text-lg font-semibold">{searched ? `${results.length} seat penerbangan ditemukan` : 'Seat penerbangan terdekat'}</h2>
                        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                            <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" /></span>
                            Sisa seat diperbarui otomatis · dicek {time(checkedAt)} WIB
                        </p>
                    </div>
                    <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 text-sm">
                        {[['kartu', LayoutGrid, 'Kartu'], ['tabel', List, 'Tabel']].map(([k, Icon, l]) => (
                            <button key={k} type="button" onClick={() => changeView(k)} className={cx('inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium', view === k ? 'bg-brand-700 text-white' : 'text-slate-600 hover:bg-slate-100')}>
                                <Icon className="h-4 w-4" />{l}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="mt-4">
                    {results.length === 0 ? (
                        <div className="card"><Empty title="Tidak ada seat tersedia" text="Coba ubah tanggal (kami mencari ±3 hari), jenis perjalanan, atau rute lain. Anda juga dapat bertanya melalui Pusat Bantuan." /></div>
                    ) : view === 'tabel' ? (
                        <SeatTable rows={results} pax={pax} />
                    ) : (
                        <div className="space-y-4">
                            {results.map((fl) => (
                                <div key={fl.id}>
                                    <FlightCard f={fl} pax={pax}
                                        action={<PickButton f={fl} pax={pax} className="w-full py-2.5" />}
                                        footer={<button type="button" onClick={() => setPolicy(policy === fl.id ? null : fl.id)} className="ml-auto inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline"><Info className="h-3.5 w-3.5" />Kebijakan refund & reschedule</button>} />
                                    {policy === fl.id && (
                                        <div className="mt-2 grid animate-fade-up gap-3 rounded-2xl bg-gold-50 p-4 text-sm ring-1 ring-gold-200 sm:grid-cols-2">
                                            <div><p className="font-semibold text-gold-900">Kebijakan Refund</p><p className="mt-1 text-gold-900/80">{fl.refund_policy || '-'}</p></div>
                                            <div><p className="font-semibold text-gold-900">Kebijakan Reschedule</p><p className="mt-1 text-gold-900/80">{fl.reschedule_policy || '-'}</p></div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </PublicLayout>
    );
}

function PickButton({ f, pax, className = '' }) {
    if (f.seats_available <= 0) return <button disabled className={cx('btn cursor-not-allowed bg-slate-200 text-slate-500', className)}>Seat habis</button>;
    if (f.seats_available < pax) return <button disabled className={cx('btn cursor-not-allowed bg-slate-200 text-slate-500', className)}>Sisa {f.seats_available} seat</button>;
    return <Link href={route('checkout.flight', { flight: f.id, penumpang: pax })} className={cx('btn-primary', className)}><Zap className="h-4 w-4" />Pilih Seat</Link>;
}

/** Tampilan ringkas untuk agen: bandingkan tanggal, rute, sisa seat & harga dalam satu tabel. */
function SeatTable({ rows, pax }) {
    return (
        <div className="card overflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                    <thead className="bg-brand-800 text-left text-xs uppercase tracking-wide text-white">
                        <tr>
                            <th className="px-4 py-3">Berangkat</th><th className="px-4 py-3">Maskapai</th><th className="px-4 py-3">Rute</th>
                            <th className="px-4 py-3">Kembali</th><th className="px-4 py-3 text-center">Sisa seat</th><th className="px-4 py-3 text-right">Harga / org</th><th className="px-4 py-3" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {rows.map((f) => {
                            const s = seatStatus(f.seats_available, pax);
                            const out = f.itinerary?.outbound;
                            const back = f.itinerary?.inbound;
                            return (
                                <tr key={f.id} className={cx('align-top hover:bg-brand-50/40', f.seats_available <= 0 && 'opacity-60')}>
                                    <td className="whitespace-nowrap px-4 py-3">
                                        <p className="font-semibold">{date(f.depart_at, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                        <p className="text-xs text-slate-500">{time(f.depart_at)} – {time(f.arrive_at)}{out?.next_day > 0 && ` (+${out.next_day})`} · {f.duration_label}</p>
                                    </td>
                                    <td className="px-4 py-3"><p className="font-semibold">{f.airline}</p><p className="text-xs text-slate-500">{f.flight_number}</p></td>
                                    <td className="px-4 py-3">
                                        <p className="whitespace-nowrap font-bold text-brand-800">{out?.path.join(' → ')}</p>
                                        <p className="mt-0.5 flex flex-wrap gap-1 text-[11px]">
                                            <span className={cx('rounded px-1.5 py-0.5 font-semibold', f.trip_type === 'pp' ? 'bg-brand-700 text-white' : 'bg-slate-100 text-slate-600')}>{f.trip_type === 'pp' ? 'PP' : 'Sekali jalan'}</span>
                                            <span className={cx('rounded px-1.5 py-0.5 font-semibold', out?.stops ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-700')}>{out?.stops ? out.layovers.map((l) => `via ${l.code}`).join(', ') : 'Langsung'}</span>
                                        </p>
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-3">
                                        {back ? (<><p className="font-semibold">{date(back.depart_at, { day: '2-digit', month: 'short', year: 'numeric' })}</p><p className="text-xs text-slate-500">{back.path.join(' → ')}</p></>) : <span className="text-slate-400">—</span>}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <p className={cx('text-2xl font-extrabold leading-none tabular-nums', s.text)}>{Math.max(0, f.seats_available)}{f.seats_total ? <span className="text-xs font-semibold text-slate-400">/{f.seats_total}</span> : null}</p>
                                        <span className={cx('mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ring-1', s.tone)}>{s.label}</span>
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-3 text-right">
                                        <p className="text-base font-extrabold text-brand-800">{rupiah(f.price)}</p>
                                        {pax > 1 && <p className="text-[11px] text-slate-500">Total {rupiah(f.price * pax)}</p>}
                                        <SeatUpdated at={f.seats_updated_at} className="mt-0.5 justify-end text-[10px] text-slate-400" />
                                    </td>
                                    <td className="px-4 py-3 text-right"><PickButton f={f} pax={pax} className="btn-sm whitespace-nowrap" /></td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function Airport({ label, value, onChange, airports }) {
    return (
        <div>
            <label className="label">{label}</label>
            <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
                {airports.map((a) => <option key={a.code} value={a.code}>{a.city} ({a.code})</option>)}
            </select>
        </div>
    );
}
