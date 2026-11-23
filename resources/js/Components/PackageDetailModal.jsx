import { Link, usePage } from '@inertiajs/react';
import { BedDouble, CalendarDays, CheckCircle2, ExternalLink, Info, MapPin, Plane, Star, Wallet, X, XCircle } from 'lucide-react';
import { useEffect } from 'react';
import { cx } from './ui';
import { date, rupiah } from '@/lib/format';

const TYPE_LABEL = { hemat: 'Hemat', reguler: 'Reguler', plus: 'Plus', vip: 'VIP' };

/** Popup berisi seluruh detail paket (poster + harga, hotel, jadwal, fasilitas, catatan). */
export default function PackageDetailModal({ p, onClose }) {
    const { auth } = usePage().props;

    useEffect(() => {
        const esc = (e) => e.key === 'Escape' && onClose();
        document.addEventListener('keydown', esc);
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.removeEventListener('keydown', esc); document.body.style.overflow = prev; };
    }, [onClose]);

    const deps = p.upcoming_departures ?? [];
    const firstOpen = deps.find((d) => d.remaining > 0);
    const samePrice = p.price_quad === p.price_triple && p.price_triple === p.price_double;

    return (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/70 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose} role="dialog" aria-modal="true" aria-label={`Detail ${p.name}`}>
            <div className="relative flex max-h-[94vh] w-full max-w-6xl animate-pop flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
                <button onClick={onClose} className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-slate-700 shadow hover:bg-white" aria-label="Tutup">
                    <X className="h-5 w-5" />
                </button>

                <div className="grid min-h-0 flex-1 overflow-y-auto md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] md:grid-rows-[minmax(0,1fr)] md:overflow-hidden">
                    {/* Poster */}
                    <div className="flex items-center justify-center bg-slate-100 p-4 md:min-h-0 md:overflow-hidden">
                        {p.cover_url ? (
                            <a href={p.cover_url} target="_blank" rel="noopener noreferrer" title="Buka poster ukuran penuh" className="flex h-full max-h-[60vh] w-full items-center justify-center md:max-h-none">
                                <img src={p.cover_url} alt={`Poster ${p.name}`} className="block max-h-full max-w-full rounded-xl object-contain shadow-md" />
                            </a>
                        ) : (
                            <div className="grid aspect-[4/5] place-items-center rounded-2xl bg-brand-800"><img src="/images/logo-sah-footer.png" alt="" className="h-20" /></div>
                        )}
                    </div>

                    {/* Detail */}
                    <div className="min-w-0 p-5 sm:p-7 md:overflow-y-auto">
                        <div className="flex flex-wrap gap-2 pr-10 text-xs font-semibold">
                            <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-800 ring-1 ring-amber-200">{TYPE_LABEL[p.type] ?? p.type}</span>
                            <span className="rounded-full bg-brand-50 px-3 py-1 text-brand-800 ring-1 ring-brand-200">{p.duration_days} Hari</span>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">Berangkat dari {p.departure_city}</span>
                        </div>
                        <h2 className="mt-3 font-sans text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{p.name}</h2>
                        {p.summary && <p className="mt-2 text-sm leading-relaxed text-slate-600">{p.summary}</p>}

                        {/* Harga */}
                        <Section title="Harga per jamaah" icon={Wallet}>
                            {samePrice ? (
                                <p className="text-2xl font-extrabold text-brand-800">{rupiah(p.price_quad)}<span className="text-sm font-medium text-slate-500"> /pax</span></p>
                            ) : (
                                <div className="grid grid-cols-3 gap-2">
                                    {[['Quad', '4 orang', p.price_quad], ['Triple', '3 orang', p.price_triple], ['Double', '2 orang', p.price_double]].map(([l, s, v]) => (
                                        <div key={l} className="rounded-xl border border-brand-100 bg-brand-50/60 p-3 text-center">
                                            <p className="text-xs font-bold uppercase text-brand-800">{l}</p>
                                            <p className="text-[11px] text-slate-500">{s}</p>
                                            <p className="mt-1 text-sm font-extrabold text-slate-900 sm:text-base">{rupiah(v)}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <p className="mt-2 text-sm text-slate-600">DP / booking kuota: <b className="text-slate-900">{rupiah(p.min_deposit)}</b> per jamaah</p>
                        </Section>

                        {/* Penerbangan & hotel */}
                        <Section title="Penerbangan & hotel" icon={Plane}>
                            <ul className="space-y-3 text-sm">
                                <li className="flex items-center gap-3">{p.airline_logo ? <img src={p.airline_logo} alt="" className="h-6 w-auto max-w-[96px] shrink-0 object-contain" /> : <Plane className="h-4 w-4 shrink-0 text-brand-700" />}<span><b>{p.airline}</b> — start {p.departure_city}</span></li>
                                <HotelRow city="Makkah" name={p.hotel_makkah} star={p.hotel_makkah_star} distance={p.hotel_makkah_distance} />
                                <HotelRow city="Madinah" name={p.hotel_madinah} star={p.hotel_madinah_star} distance={p.hotel_madinah_distance} />
                            </ul>
                        </Section>

                        {/* Jadwal */}
                        <Section title="Jadwal keberangkatan" icon={CalendarDays}>
                            {deps.length ? (
                                <div className="flex flex-wrap gap-2">
                                    {deps.map((d) => (
                                        <span key={d.id} className={cx('rounded-lg px-2.5 py-1.5 text-xs font-semibold ring-1', d.remaining > 0 ? 'bg-white text-slate-700 ring-slate-200' : 'bg-slate-100 text-slate-400 line-through ring-slate-200')}>
                                            {date(d.departure_date, { day: '2-digit', month: 'short', year: 'numeric' })}
                                            {d.remaining > 0 && <span className={cx('ml-1.5', d.remaining <= 10 ? 'text-red-600' : 'text-brand-700')}>· sisa {d.remaining}</span>}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Belum ada jadwal keberangkatan yang dibuka. Hubungi kami melalui Pusat Bantuan untuk info jadwal terbaru.</p>
                            )}
                        </Section>

                        {/* Fasilitas */}
                        {(p.facilities ?? []).length > 0 && (
                            <Section title="Termasuk dalam paket" icon={CheckCircle2}>
                                <ul className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
                                    {p.facilities.map((f) => <li key={f} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />{f}</li>)}
                                </ul>
                            </Section>
                        )}
                        {(p.excludes ?? []).length > 0 && (
                            <Section title="Tidak termasuk" icon={XCircle}>
                                <ul className="space-y-2 text-sm">
                                    {p.excludes.map((f) => <li key={f} className="flex gap-2"><XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />{f}</li>)}
                                </ul>
                            </Section>
                        )}
                        {p.description && p.description !== p.summary && (
                            <Section title="Keterangan" icon={Info}>
                                <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">{p.description}</p>
                            </Section>
                        )}
                    </div>
                </div>

                {/* Aksi */}
                <div className="flex flex-col gap-2 border-t border-slate-100 bg-white p-4 sm:flex-row sm:items-center sm:justify-end sm:px-7">
                    <Link href={route('packages.show', p.slug)} className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-brand-600 px-5 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-50">
                        Halaman Paket <ExternalLink className="h-4 w-4" />
                    </Link>
                    {firstOpen ? (
                        <Link href={route('checkout.package', { package: p.slug, departure: firstOpen.id })} className="inline-flex items-center justify-center rounded-xl bg-brand-700 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-800">
                            {auth.user ? 'Pesan Sekarang' : 'Masuk untuk Memesan'}
                        </Link>
                    ) : (
                        <button disabled className="inline-flex cursor-not-allowed items-center justify-center rounded-xl bg-slate-200 px-6 py-3 text-sm font-semibold text-slate-500">Belum ada jadwal keberangkatan</button>
                    )}
                </div>
            </div>
        </div>
    );
}

function Section({ title, icon: Icon, children }) {
    return (
        <section className="mt-6 border-t border-slate-100 pt-5">
            <h3 className="mb-3 flex items-center gap-2 font-sans text-sm font-bold uppercase tracking-wide text-brand-800"><Icon className="h-4 w-4" />{title}</h3>
            {children}
        </section>
    );
}

function HotelRow({ city, name, star, distance }) {
    if (!name) return null;
    return (
        <li className="flex gap-3">
            <BedDouble className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
            <span className="min-w-0">
                <span className="text-slate-500">Hotel {city}: </span><b>{name}</b>
                <span className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="flex text-amber-400">{Array.from({ length: star ?? 0 }).map((_, i) => <Star key={i} className="h-3 w-3 fill-current" />)}</span>
                    {distance && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{distance}</span>}
                </span>
            </span>
        </li>
    );
}
