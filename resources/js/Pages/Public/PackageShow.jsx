import { Link, usePage } from '@inertiajs/react';
import { BedDouble, Calculator, CalendarDays, CheckCircle2, Clock, FileText, MapPin, Plane, Star, X, XCircle, ZoomIn } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import PublicLayout from '@/Layouts/PublicLayout';
import { Badge, CoverImage, cx } from '@/Components/ui';
import { date, daysUntil, rupiah } from '@/lib/format';

export default function PackageShow({ package: p, roomTypes, payment }) {
    const { auth } = usePage().props;
    const hasItinerary = (p.itinerary ?? []).length > 0;
    const [tab, setTab] = useState(hasItinerary ? 'itinerary' : 'fasilitas');
    const [zoom, setZoom] = useState(false);
    const [room, setRoom] = useState('quad');
    const [pax, setPax] = useState(1);
    const [depId, setDepId] = useState(p.upcoming_departures[0]?.id);
    const [img, setImg] = useState(0);

    const price = { quad: p.price_quad, triple: p.price_triple, double: p.price_double }[room];
    const dep = p.upcoming_departures.find((d) => d.id === depId);

    // Simulasi cicilan
    const sim = useMemo(() => {
        const total = price * pax;
        const deposit = Math.min(total, p.min_deposit * (payment.deposit_per_pax ? pax : 1));
        const days = dep ? daysUntil(dep.departure_date) - payment.settlement_days : 0;
        const months = Math.max(1, Math.min(6, Math.floor(days / 30)));
        const per = Math.floor((total - deposit) / months / 1000) * 1000;
        return { total, deposit, months, per, last: total - deposit - per * (months - 1), canInstall: days > 7 };
    }, [price, pax, dep, p.min_deposit, payment]);

    const images = [p.cover_url, ...(p.gallery_urls ?? [])].filter(Boolean);

    return (
        <PublicLayout title={p.name}>
            <div className="container-app py-8">
                <nav className="mb-4 text-sm text-slate-500"><Link href={route('packages.index')} className="hover:text-brand-700">Paket Umrah</Link> / <span className="text-slate-800">{p.name}</span></nav>
                <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
                    <div className="min-w-0 space-y-6">
                        {/* Poster paket — ukuran kartu mengikuti rasio poster (potret, persegi, maupun lanskap) */}
                        <div>
                            {images[img] ? (
                                <button type="button" onClick={() => setZoom(true)} className="group relative mx-auto block w-fit max-w-full cursor-zoom-in overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-soft">
                                    <img src={images[img]} alt={`Poster ${p.name}`} className="block h-auto max-h-[85vh] w-auto max-w-full" />
                                    <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-slate-900/70 px-3 py-1.5 text-xs font-medium text-white opacity-0 transition group-hover:opacity-100">
                                        <ZoomIn className="h-3.5 w-3.5" /> Perbesar
                                    </span>
                                </button>
                            ) : (
                                <div className="card overflow-hidden"><div className="aspect-[16/8]"><CoverImage src={null} alt={p.name} /></div></div>
                            )}
                            {images.length > 1 && (
                                <div className="mt-3 flex justify-center gap-2 overflow-x-auto scrollbar-none">
                                    {images.map((src, i) => <button key={i} onClick={() => setImg(i)} className={cx('h-20 shrink-0 overflow-hidden rounded-lg ring-2', img === i ? 'ring-brand-600' : 'ring-transparent opacity-70 hover:opacity-100')}><img src={src} alt="" className="h-full w-auto" /></button>)}
                                </div>
                            )}
                        </div>
                        {zoom && images[img] && <Lightbox src={images[img]} alt={`Poster ${p.name}`} onClose={() => setZoom(false)} />}

                        <div>
                            <div className="flex flex-wrap gap-2"><Badge className="bg-gold-50 text-gold-800 ring-gold-200">{p.type.toUpperCase()}</Badge><Badge className="bg-brand-50 text-brand-800 ring-brand-200">{p.duration_days} Hari</Badge></div>
                            <h1 className="mt-3 text-3xl sm:text-4xl">{p.name}</h1>
                            <p className="mt-3 whitespace-pre-line leading-relaxed text-slate-600">{p.description || p.summary}</p>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <Hotel city="Makkah" name={p.hotel_makkah} star={p.hotel_makkah_star} distance={p.hotel_makkah_distance} />
                            <Hotel city="Madinah" name={p.hotel_madinah} star={p.hotel_madinah_star} distance={p.hotel_madinah_distance} />
                        </div>

                        <div className="card">
                            <div className="flex overflow-x-auto border-b border-slate-100 scrollbar-none">
                                {[hasItinerary && ['itinerary', 'Itinerary'], ['fasilitas', 'Fasilitas'], ['dokumen', 'Syarat Dokumen'], ['jadwal', 'Jadwal & Kuota']].filter(Boolean).map(([k, l]) => (
                                    <button key={k} onClick={() => setTab(k)} className={cx('shrink-0 border-b-2 px-5 py-3.5 text-sm font-semibold', tab === k ? 'border-gold-400 text-brand-800' : 'border-transparent text-slate-500')}>{l}</button>
                                ))}
                            </div>
                            <div className="card-pad">
                                {tab === 'itinerary' && (
                                    <ol className="relative space-y-6 border-l-2 border-gold-200 pl-6">
                                        {(p.itinerary ?? []).map((it) => (
                                            <li key={it.day} className="relative">
                                                <span className="absolute -left-[37px] grid h-7 w-7 place-items-center rounded-full bg-brand-700 text-xs font-bold text-white">{it.day}</span>
                                                <p className="font-semibold text-slate-900">Hari {it.day} — {it.title}</p>
                                                <p className="mt-1 text-sm text-slate-600">{it.description}</p>
                                            </li>
                                        ))}
                                    </ol>
                                )}
                                {tab === 'fasilitas' && (
                                    <div className="grid gap-6 sm:grid-cols-2">
                                        <div><p className="mb-3 font-semibold">Termasuk</p><ul className="space-y-2">{(p.facilities ?? []).map((f) => <li key={f} className="flex gap-2 text-sm"><CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />{f}</li>)}</ul></div>
                                        <div><p className="mb-3 font-semibold">Tidak termasuk</p><ul className="space-y-2">{(p.excludes ?? []).map((f) => <li key={f} className="flex gap-2 text-sm"><XCircle className="h-4 w-4 shrink-0 text-red-500" />{f}</li>)}</ul></div>
                                    </div>
                                )}
                                {tab === 'dokumen' && <ul className="space-y-2">{(p.document_requirements ?? []).map((d) => <li key={d} className="flex gap-2 text-sm"><FileText className="h-4 w-4 shrink-0 text-gold-500" />{d}</li>)}</ul>}
                                {tab === 'jadwal' && (
                                    <div className="space-y-2">
                                        {p.upcoming_departures.length === 0 && <p className="text-sm text-slate-500">Belum ada jadwal keberangkatan yang dibuka. Silakan hubungi kami melalui Pusat Bantuan untuk info jadwal terbaru.</p>}
                                        {p.upcoming_departures.map((d) => (
                                            <div key={d.id} className="flex items-center justify-between rounded-xl border border-slate-100 p-3 text-sm">
                                                <span className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-gold-500" />{date(d.departure_date)} – {date(d.return_date)}</span>
                                                <span className={cx('font-semibold', d.remaining <= 10 ? 'text-red-600' : 'text-emerald-700')}>{d.remaining > 0 ? `Sisa ${d.remaining} / ${d.quota}` : 'Penuh'}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Panel pemesanan */}
                    <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
                        <div className="card card-pad">
                            <p className="text-xs text-slate-500">Harga per jamaah</p>
                            <p className="text-3xl font-bold text-brand-700">{rupiah(price)}</p>
                            <div className="mt-5 space-y-4">
                                <div>
                                    <p className="label">Jadwal keberangkatan</p>
                                    <select className="input" value={depId ?? ''} onChange={(e) => setDepId(Number(e.target.value))}>
                                        {p.upcoming_departures.length === 0 && <option>Belum ada jadwal</option>}
                                        {p.upcoming_departures.map((d) => <option key={d.id} value={d.id} disabled={d.remaining <= 0}>{date(d.departure_date)} — {d.remaining > 0 ? `sisa ${d.remaining} kursi` : 'penuh'}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <p className="label">Tipe kamar</p>
                                    <div className="grid grid-cols-3 gap-2">
                                        {Object.entries(roomTypes).map(([k, l]) => (
                                            <button key={k} onClick={() => setRoom(k)} className={cx('rounded-xl border p-2 text-center text-xs', room === k ? 'border-brand-600 bg-brand-50 font-semibold text-brand-800' : 'border-slate-200 text-slate-600')}>
                                                {l.split(' ')[0]}<span className="block text-[10px] text-slate-500">{l.match(/\((.*)\)/)?.[1]}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <p className="label">Jumlah jamaah</p>
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => setPax(Math.max(1, pax - 1))} className="btn-outline h-10 w-10 !p-0">−</button>
                                        <span className="w-10 text-center text-lg font-bold">{pax}</span>
                                        <button onClick={() => setPax(Math.min(10, pax + 1, dep?.remaining ?? 10))} className="btn-outline h-10 w-10 !p-0">+</button>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                                <span className="text-sm text-slate-600">Total</span>
                                <span className="text-xl font-bold">{rupiah(sim.total)}</span>
                            </div>
                            {dep && dep.remaining > 0 ? (
                                <Link href={route('checkout.package', { package: p.slug, departure: depId, kamar: room, jamaah: pax })} className="btn-primary mt-4 w-full py-3">
                                    {auth.user ? 'Pesan Sekarang' : 'Masuk untuk Memesan'}
                                </Link>
                            ) : (
                                <button disabled className="btn-primary mt-4 w-full py-3">{dep ? 'Kuota penuh' : 'Belum ada jadwal keberangkatan'}</button>
                            )}
                            <p className="mt-2 text-center text-xs text-slate-500">Wajib login — semua transaksi tercatat di akun Anda.</p>
                        </div>

                        <div className="card card-pad">
                            <p className="flex items-center gap-2 font-semibold"><Calculator className="h-4 w-4 text-gold-500" />Simulasi cicilan</p>
                            {!dep ? (
                                <p className="mt-2 text-sm text-slate-500">Simulasi tersedia setelah jadwal keberangkatan dibuka.</p>
                            ) : sim.canInstall ? (
                                <div className="mt-3 space-y-2 text-sm">
                                    <Row k={`Deposit awal${payment.deposit_per_pax ? ` (${pax} × ${rupiah(p.min_deposit)})` : ''}`} v={rupiah(sim.deposit)} strong />
                                    <Row k="Sisa tagihan" v={rupiah(sim.total - sim.deposit)} />
                                    <Row k={`Contoh ${sim.months}× cicilan`} v={`± ${rupiah(sim.per)}/bln`} />
                                    <p className="rounded-lg bg-sand-100 p-2 text-xs text-slate-600">Nominal cicilan bebas (min. {rupiah(payment.min_installment)}) — wajib lunas H-{payment.settlement_days} sebelum keberangkatan ({dep && date(new Date(new Date(dep.departure_date).getTime() - payment.settlement_days * 864e5))}).</p>
                                </div>
                            ) : (
                                <p className="mt-2 text-sm text-amber-700">Keberangkatan sudah dekat — hanya tersedia pembayaran lunas.</p>
                            )}
                        </div>
                        <div className="card flex items-center gap-3 p-4 text-sm text-slate-600"><Plane className="h-5 w-5 text-gold-500" />{p.airline} · berangkat dari {p.departure_city}</div>
                    </aside>
                </div>
            </div>
        </PublicLayout>
    );
}

const Row = ({ k, v, strong }) => <div className="flex justify-between gap-3"><span className="text-slate-500">{k}</span><span className={strong ? 'font-bold text-brand-700' : 'font-semibold'}>{v}</span></div>;

function Hotel({ city, name, star, distance }) {
    return (
        <div className="card flex gap-4 p-5">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gold-50 text-gold-600"><BedDouble className="h-6 w-6" /></div>
            <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Hotel {city}</p>
                <p className="font-semibold text-slate-900">{name}</p>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500"><span className="flex text-gold-400">{Array.from({ length: star }).map((_, i) => <Star key={i} className="h-3 w-3 fill-current" />)}</span>{distance && <><MapPin className="h-3 w-3" />{/pelataran|dari|ke /i.test(distance) ? distance : `${distance} dari ${city === 'Makkah' ? 'Masjidil Haram' : 'Masjid Nabawi'}`}</>}</p>
            </div>
        </div>
    );
}

function Lightbox({ src, alt, onClose }) {
    useEffect(() => {
        const esc = (e) => e.key === 'Escape' && onClose();
        document.addEventListener('keydown', esc);
        document.body.style.overflow = 'hidden';
        return () => { document.removeEventListener('keydown', esc); document.body.style.overflow = ''; };
    }, [onClose]);
    return (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/85 p-4 animate-pop" onClick={onClose} role="dialog" aria-modal="true">
            <button onClick={onClose} className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" aria-label="Tutup"><X className="h-6 w-6" /></button>
            <img src={src} alt={alt} className="max-h-[94vh] max-w-full rounded-lg shadow-2xl" onClick={(e) => e.stopPropagation()} />
        </div>
    );
}
