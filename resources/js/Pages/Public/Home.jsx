import { Link } from '@inertiajs/react';
import {
    ArrowRight, BedDouble, ChevronLeft, ChevronRight, Building2, CalendarDays, Check, ChevronDown, Clock, Goal, Headset, Layers, MapPin, Plane, Quote, ShieldCheck, Star, Stamp, UserCheck, UserRound, ZoomIn,
    Film, Image as ImageIcon, Play,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import PublicLayout from '@/Layouts/PublicLayout';
import PackageDetailModal from '@/Components/PackageDetailModal';
import GalleryLightbox from '@/Components/GalleryLightbox';
import { cx } from '@/Components/ui';
import { date, rupiah } from '@/lib/format';

// Tujuan & ikon bawaan kartu layanan; judul, keterangan, dan ikon gambar diatur admin (Konten Beranda).
const LAYANAN = [
    { route: 'packages.index', icon: KaabahIcon },
    { route: 'flights.index', icon: PlaneIcon },
    { route: 'visa.index', icon: VisaIcon },
];
const POINT_ICONS = [ShieldCheck, UserCheck, Star, Check];

// Foto bawaan bila admin belum mengunggah galeri. Ganti dengan foto asli resolusi tinggi di public/images/landing.
const DEFAULT_GALLERY = [
    ['Jamaah berdoa di Masjidil Haram', 'makkah'], ['Kubah Hijau Masjid Nabawi', 'madinah'], ['Masjid Quba, Madinah', 'madinah'], ['Payung raksasa Masjid Nabawi', 'madinah'],
    ['Interior Masjid Nabawi', 'madinah'], ['Jabal Rahmah, Arafah', 'makkah'], ['Kota Makkah di malam hari', 'makkah'],
].map(([title, category], i) => ({ id: `d${i + 1}`, title, category, type: 'foto', image_url: `/images/landing/galeri-${i + 1}.jpg` }));

export default function Home({ content: c, featured, galleries, galleryCategories = {}, testimonials, faqs }) {
    const [faqOpen, setFaqOpen] = useState(0);
    const [selected, setSelected] = useState(null); // paket yang detailnya sedang dibuka (popup)
    // Datang dari halaman lain lewat link "/#galeri" dsb → gulir ke section yang dimaksud.
    useEffect(() => {
        const id = window.location.hash.slice(1);
        if (id) requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: 'start' }));
    }, []);

    const uploadedPhotos = galleries.filter((g) => g.type !== 'video');
    const photos = uploadedPhotos.length ? uploadedPhotos : DEFAULT_GALLERY;
    const videos = galleries.filter((g) => g.type === 'video');
    const [galleryTab, setGalleryTab] = useState('foto'); // 'foto' | 'video'
    const tabItems = galleryTab === 'video' ? videos : photos;
    // Satu kartu per kategori (Umum, Makkah, Hotel, …); isi kategori baru tampil saat kartunya diklik.
    const catKeys = Object.keys(galleryCategories);
    const albums = [...catKeys, ...new Set(tabItems.map((g) => g.category).filter((k) => !catKeys.includes(k)))]
        .map((k) => ({ key: k, label: galleryCategories[k] ?? 'Lainnya', items: tabItems.filter((g) => (g.category ?? 'umum') === k) }))
        .filter((a) => a.items.length);
    const [viewer, setViewer] = useState(null); // { items, index } — album yang sedang dibuka

    return (
        <PublicLayout title="Biro Perjalanan Umrah Terpercaya di Medan">
            {/* ============ HERO / BERANDA ============ */}
            <section id="beranda" className="landing-section relative -mt-[76px] overflow-hidden bg-gradient-to-b from-brand-50/70 via-white to-white pt-[76px] lg:-mt-[80px] lg:pt-[80px]">
                <Bubble className="left-6 top-28 h-10 w-10" />
                <Bubble className="left-24 top-44 h-4 w-4" />
                <Bubble className="right-10 top-24 hidden h-8 w-8 lg:block" />

                <div className="container-app relative grid items-center gap-10 py-10 lg:grid-cols-[1fr_1.1fr] lg:py-14">
                    <div className="animate-fade-up">
                        {c.hero.badge && <span className="inline-flex rounded-lg border border-brand-200 bg-white px-3 py-1.5 text-sm font-semibold text-brand-800 shadow-sm">{c.hero.badge}</span>}
                        <h1 className="mt-5 font-sans text-[2rem] font-extrabold leading-[1.15] tracking-tight text-slate-900 sm:text-5xl lg:text-[3.25rem]">
                            {c.hero.title}{c.hero.highlight && <> <span className="text-brand-700">{c.hero.highlight}</span></>}
                        </h1>
                        {c.hero.subtitle && <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">{c.hero.subtitle}</p>}
                        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                            <Link href={route('packages.index')} className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-700 px-6 py-3.5 font-semibold text-white shadow-lift transition hover:bg-brand-800">
                                <Layers className="h-5 w-5" /> {c.hero.primary_label} <ArrowRight className="h-4 w-4" />
                            </Link>
                            <a href="#tentang" className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-brand-600 bg-white px-6 py-3 font-semibold text-brand-700 transition hover:bg-brand-50">
                                <UserRound className="h-5 w-5" /> {c.hero.secondary_label}
                            </a>
                        </div>
                        <ul className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm font-medium text-slate-700">
                            {c.hero.points.map((label, i) => [POINT_ICONS[i % POINT_ICONS.length], label]).map(([Icon, label], i) => (
                                <li key={i} className={cx('flex items-center gap-2', i > 0 && 'sm:border-l sm:border-slate-200 sm:pl-6')}>
                                    <Icon className="h-5 w-5 text-brand-700" /> {label}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="relative lg:-mr-[max(2rem,calc((100vw-80rem)/2+2rem))]">
                        {/* lengkung hijau khas desain */}
                        <div className="absolute -left-3 -top-3 bottom-6 right-0 rounded-bl-[48px] rounded-tl-[180px] border-l-[10px] border-t-[10px] border-brand-500/90 sm:rounded-tl-[220px]" />
                        <div className="absolute -left-6 -top-6 bottom-10 right-0 rounded-tl-[200px] border-l-4 border-t-4 border-brand-200 sm:rounded-tl-[240px]" />
                        <div className="relative overflow-hidden rounded-bl-[40px] rounded-tl-[170px] shadow-2xl sm:rounded-tl-[210px]">
                            <img src={c.hero.image} alt="Ka'bah dan Masjidil Haram" className="aspect-[16/11] w-full object-cover object-[45%_40%]" />
                        </div>
                    </div>
                </div>
            </section>

            {/* ============ TENTANG KAMI ============ */}
            <section id="tentang" className="landing-section py-14 sm:py-20">
                <div className="container-app grid items-center gap-10 lg:grid-cols-[0.9fr_1.3fr]">
                    <div className="relative">
                        <div className="absolute -bottom-3 -left-3 h-24 w-24 rounded-3xl bg-brand-100" />
                        <img src={c.about.image} alt={c.about.title}
                            className="relative aspect-[5/3] w-full rounded-3xl object-cover object-[60%_80%] shadow-xl [clip-path:polygon(0_0,100%_0,88%_100%,0_100%)]" />
                    </div>
                    <div>
                        <span className="chip-green">{c.about.label}</span>
                        <h2 className="mt-4 font-sans text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{c.about.title}</h2>
                        {c.about.lead && <p className="mt-3 text-base leading-relaxed text-slate-600">{c.about.lead}</p>}
                        {c.about.body && <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-600 sm:text-base">{c.about.body}</p>}
                        <div className="mt-8 grid gap-8 sm:grid-cols-2 sm:divide-x sm:divide-slate-200">
                            <div>
                                <h3 className="flex items-center gap-2 font-sans text-xl font-extrabold text-brand-700"><Goal className="h-6 w-6" /> Visi</h3>
                                {(c.about.vision || '').split(/\n+/).filter(Boolean).map((v, i) => (
                                    <p key={i} className={cx('text-sm leading-relaxed text-slate-600', i ? 'mt-2' : 'mt-3')}>{v}</p>
                                ))}
                            </div>
                            <div className="sm:pl-8">
                                <h3 className="flex items-center gap-2 font-sans text-xl font-extrabold text-brand-700"><Layers className="h-6 w-6" /> Misi</h3>
                                <ul className="mt-3 space-y-2 text-sm text-slate-600">
                                    {c.about.mission.map((m) => <li key={m} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" strokeWidth={3} />{m}</li>)}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ============ LAYANAN UTAMA ============ */}
            <section id="layanan" className="landing-section pb-14 sm:pb-20">
                <div className="container-app">
                    <Heading title={c.services_heading.title} subtitle={c.services_heading.subtitle} />
                    <div className="grid gap-5 md:grid-cols-3">
                        {LAYANAN.map(({ route: r, icon }, i) => ({ r, Icon: icon, ...c.services[i] })).map(({ title, text, image, r, Icon }) => (
                            <Link key={r} href={route(r)} className="group flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-soft transition hover:-translate-y-1 hover:border-brand-200 hover:shadow-lift">
                                <span className="grid h-24 w-24 shrink-0 place-items-center rounded-full bg-[radial-gradient(circle,#fff7d6_0%,#fdf3c4_45%,#ffffff_72%)]">{image ? <img src={image} alt="" className="h-14 w-14 object-contain" /> : <Icon />}</span>
                                <span className="min-w-0 flex-1">
                                    <span className="block text-lg font-bold leading-snug text-slate-900">{title}</span>
                                    {text && <span className="mt-1 block text-sm leading-relaxed text-slate-600">{text}</span>}
                                </span>
                                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-700 text-white transition group-hover:translate-x-1"><ArrowRight className="h-4 w-4" /></span>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            {/* ============ PILIHAN PAKET ============ */}
            <section id="paket" className="landing-section pb-14 sm:pb-20">
                <div className="container-app">
                    <Heading title={c.packages.title} subtitle={c.packages.subtitle}
                        action={<Link href={route('packages.index')} className="inline-flex items-center gap-2 rounded-full border-2 border-brand-600 px-5 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-50">Lihat Semua Paket <ArrowRight className="h-4 w-4" /></Link>} />
                    {featured.length ? (
                        <div className={cx('grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4', c.packages.count % 5 === 0 && 'xl:grid-cols-5')}>
                            {featured.map((p, i) => <LandingPackageCard key={p.id} p={p} badge={i === 0 ? c.packages.badge : null} onSelect={() => setSelected(p)} />)}
                        </div>
                    ) : (
                        <p className="rounded-2xl border border-dashed border-slate-200 p-10 text-center text-slate-500">Paket umrah segera hadir.</p>
                    )}
                </div>
            </section>

            {/* ============ GALERI ============ */}
            <section id="galeri" className="landing-section pb-14 sm:pb-20">
                <div className="container-app">
                    <Heading title={c.gallery.title} subtitle={c.gallery.subtitle} />
                    <GalleryTabs value={galleryTab} onChange={(t) => { setGalleryTab(t); setViewer(null); }} counts={{ foto: photos.length, video: videos.length }} />
                    {albums.length ? (
                        <GalleryCarousel key={galleryTab} albums={albums} onOpen={(a) => setViewer({ items: a.items, index: 0 })} />
                    ) : (
                        <p className="rounded-2xl border border-dashed border-slate-200 p-10 text-center text-slate-500">
                            {galleryTab === 'video' ? 'Belum ada video kegiatan.' : 'Belum ada foto kegiatan.'}
                        </p>
                    )}
                </div>
            </section>
            {viewer && <GalleryLightbox items={viewer.items} index={viewer.index} onIndex={(i) => setViewer((v) => ({ ...v, index: i }))} onClose={() => setViewer(null)} />}

            {/* ============ TESTIMONI ============ */}
            <section id="testimoni" className="landing-section bg-brand-50/60 py-14 sm:py-20">
                <div className="container-app">
                    <Heading title={c.testimonials.title} subtitle={c.testimonials.subtitle} />
                    {testimonials.length ? (
                        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                            {testimonials.map((t) => (
                                <figure key={t.id} className="relative flex flex-col rounded-2xl border border-slate-100 bg-white p-6 shadow-soft">
                                    <Quote className="absolute right-5 top-5 h-8 w-8 text-brand-100" fill="currentColor" strokeWidth={0} />
                                    <div className="flex gap-0.5 text-amber-400">
                                        {Array.from({ length: 5 }).map((_, i) => <Star key={i} className={cx('h-4 w-4', i < t.rating ? 'fill-current' : 'text-slate-200')} />)}
                                    </div>
                                    <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-slate-700">“{t.content}”</blockquote>
                                    <figcaption className="mt-5 flex items-center gap-3 border-t border-slate-100 pt-4">
                                        {t.photo_url
                                            ? <img src={t.photo_url} alt={t.name} className="h-11 w-11 rounded-full object-cover" />
                                            : <span className="grid h-11 w-11 place-items-center rounded-full bg-brand-700 font-bold text-white">{t.name.replace(/^(Hj?\.|Bapak|Ibu)\s*/i, '').charAt(0)}</span>}
                                        <div>
                                            <p className="text-sm font-bold text-slate-900">{t.name}</p>
                                            {t.city && <p className="flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3 w-3" />{t.city}</p>}
                                        </div>
                                    </figcaption>
                                </figure>
                            ))}
                        </div>
                    ) : (
                        <p className="rounded-2xl border border-dashed border-brand-200 bg-white p-10 text-center text-slate-500">Testimoni jamaah segera hadir.</p>
                    )}
                </div>
            </section>

            {/* ============ FAQ (tanpa menu navbar) ============ */}
            {faqs.length > 0 && (
                <section id="faq" className="landing-section py-14 sm:py-20">
                    <div className="container-app max-w-4xl">
                        <Heading title={c.faq.title} subtitle={c.faq.subtitle} />
                        <div className="space-y-3">
                            {faqs.map((f, i) => {
                                const open = faqOpen === i;
                                return (
                                    <div key={f.id} className={cx('overflow-hidden rounded-2xl border bg-white transition', open ? 'border-brand-200 shadow-soft' : 'border-slate-200')}>
                                        <button type="button" onClick={() => setFaqOpen(open ? -1 : i)} aria-expanded={open}
                                            className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-semibold text-slate-900 hover:text-brand-700">
                                            {f.question}
                                            <span className={cx('grid h-8 w-8 shrink-0 place-items-center rounded-full transition', open ? 'rotate-180 bg-brand-700 text-white' : 'bg-brand-50 text-brand-700')}>
                                                <ChevronDown className="h-4 w-4" />
                                            </span>
                                        </button>
                                        {open && <p className="animate-fade-up px-5 pb-5 text-sm leading-relaxed text-slate-600">{f.answer}</p>}
                                    </div>
                                );
                            })}
                        </div>
                        {c.faq.note && (
                            <div className="mt-6 flex items-start gap-3 rounded-2xl bg-brand-50 p-4 text-sm text-brand-900">
                                <Headset className="mt-0.5 h-5 w-5 shrink-0" />
                                <p>{c.faq.note}</p>
                            </div>
                        )}
                    </div>
                </section>
            )}

            {selected && <PackageDetailModal p={selected} onClose={() => setSelected(null)} />}
        </PublicLayout>
    );
}

/** Pemisah galeri: Foto | Video */
function GalleryTabs({ value, onChange, counts }) {
    const tabs = [['foto', 'Foto', ImageIcon], ['video', 'Video', Film]];
    return (
        <div className="mb-7 flex justify-center">
            <div role="tablist" aria-label="Jenis galeri" className="inline-flex items-center rounded-full border border-brand-100 bg-white p-1 shadow-soft">
                {tabs.map(([key, label, Icon], i) => (
                    <div key={key} className="flex items-center">
                        {i > 0 && <span className="mx-1 h-5 w-px bg-slate-300" aria-hidden />}
                        <button type="button" role="tab" aria-selected={value === key} onClick={() => onChange(key)}
                            className={cx('flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition sm:px-7',
                                value === key ? 'bg-brand-700 text-white shadow' : 'text-slate-600 hover:text-brand-700')}>
                            <Icon className="h-4 w-4" />{label}
                            <span className={cx('rounded-full px-1.5 text-xs tabular-nums', value === key ? 'bg-white/20' : 'bg-slate-100 text-slate-500')}>{counts[key]}</span>
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}

/**
 * Galeri satu baris yang bisa digulir dengan tombol kiri/kanan; klik untuk membuka detail.
 * Tinggi seragam, lebar mengikuti bentuk asli file — hasil crop admin tampil utuh tanpa terpotong lagi.
 */
function GalleryCarousel({ albums, onOpen }) {
    const track = useRef(null);
    const [edge, setEdge] = useState({ start: true, end: false });

    const update = useCallback(() => {
        const el = track.current;
        if (!el) return;
        setEdge({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
    }, []);

    useEffect(() => {
        update();
        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, [update, albums.length]);

    // Lebar item berbeda-beda, jadi geser ±80% lebar area per klik
    const slide = (dir) => {
        const el = track.current;
        if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' });
    };

    return (
        <div className="relative">
            <div ref={track} onScroll={update} className="flex snap-x gap-3 overflow-x-auto scroll-smooth scrollbar-none">
                {albums.map((a) => {
                    const g = a.items[0]; // sampul album = item terbaru
                    return (
                        <button key={a.key} type="button" onClick={() => onOpen(a)} aria-label={`Buka galeri ${a.label}`}
                            className="group relative h-48 shrink-0 snap-start overflow-hidden rounded-2xl bg-slate-100 shadow-soft sm:h-60">
                            {g.type === 'video' ? (
                                <video src={`${g.image_url}#t=0.1`} preload="metadata" muted playsInline
                                    className="pointer-events-none h-full w-auto min-w-[180px] max-w-[85vw] object-cover transition duration-500 group-hover:scale-105" />
                            ) : (
                                <img src={g.image_url} alt={a.label} loading="lazy"
                                    className="h-full w-auto min-w-[180px] max-w-[85vw] object-cover transition duration-500 group-hover:scale-105" />
                            )}
                            <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/75 via-black/30 to-transparent px-4 pb-3 pt-10 text-left text-white">
                                <span className="text-base font-bold leading-tight">{a.label}</span>
                                <span className="shrink-0 rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold backdrop-blur">{a.items.length} {g.type === 'video' ? 'video' : 'foto'}</span>
                            </span>
                            <span className="absolute inset-0 grid place-items-center opacity-0 transition group-hover:bg-black/20 group-hover:opacity-100">
                                {g.type === 'video'
                                    ? <span className="grid h-14 w-14 place-items-center rounded-full bg-white/90 text-brand-800 shadow-lg"><Play className="ml-1 h-6 w-6 fill-current" /></span>
                                    : <ZoomIn className="h-7 w-7 text-white drop-shadow" />}
                            </span>
                        </button>
                    );
                })}
            </div>
            {!(edge.start && edge.end) && (
                <>
                    <CarouselArrow side="left" disabled={edge.start} onClick={() => slide(-1)} />
                    <CarouselArrow side="right" disabled={edge.end} onClick={() => slide(1)} />
                </>
            )}
        </div>
    );
}

function CarouselArrow({ side, disabled, onClick }) {
    const Icon = side === 'left' ? ChevronLeft : ChevronRight;
    return (
        <button type="button" onClick={onClick} disabled={disabled} aria-label={side === 'left' ? 'Foto sebelumnya' : 'Foto berikutnya'}
            className={cx('absolute top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white text-brand-700 shadow-lg ring-1 ring-slate-200 transition hover:bg-brand-700 hover:text-white disabled:pointer-events-none disabled:opacity-0',
                side === 'left' ? 'left-1 sm:-left-5' : 'right-1 sm:-right-5')}>
            <Icon className="h-5 w-5" />
        </button>
    );
}

function Heading({ title, subtitle, action }) {
    return (
        <div className="mb-8">
            <div className="flex items-center gap-4">
                <span className="hidden h-px flex-1 bg-gradient-to-r from-transparent to-brand-200 sm:block" />
                <h2 className="landing-title text-center">{title}</h2>
                <span className="hidden h-px flex-1 bg-gradient-to-l from-transparent to-brand-200 sm:block" />
            </div>
            <div className={cx('mt-2 flex flex-col items-center gap-4', action && 'lg:relative')}>
                <p className="text-center text-sm text-slate-600 sm:text-base">{subtitle}</p>
                {action && <div className="lg:absolute lg:right-0 lg:top-1/2 lg:-translate-y-1/2">{action}</div>}
            </div>
        </div>
    );
}

function LandingPackageCard({ p, badge, onSelect }) {
    const next = p.upcoming_departures?.[0];
    return (
        <div className="relative flex flex-col rounded-2xl border border-slate-100 bg-white p-3 shadow-soft transition hover:-translate-y-1 hover:shadow-lift">
            {badge && (
                <span className="absolute -top-3 left-4 z-10 inline-flex items-center gap-1 rounded-full bg-amber-400 px-3 py-1 text-xs font-bold text-white shadow">
                    <Star className="h-3 w-3 fill-current" /> {badge}
                </span>
            )}
            {/* Poster paket — tinggi mengikuti rasio poster */}
            <button type="button" onClick={onSelect} className="block overflow-hidden rounded-xl bg-slate-100" aria-label={`Lihat detail ${p.name}`}>
                {p.cover_url
                    ? <img src={p.cover_url} alt={`Poster ${p.name}`} loading="lazy" className="block h-auto w-full transition duration-500 hover:scale-[1.03]" />
                    : <div className="grid aspect-[4/5] place-items-center bg-brand-800"><img src="/images/logo-sah-footer.png" alt="" className="h-16" /></div>}
            </button>
            <div className="flex flex-1 flex-col px-1 pt-3">
            <p className="text-sm font-semibold text-slate-500">Paket Umrah</p>
            <h3 className="font-sans text-base font-bold leading-snug text-slate-900">{p.name}</h3>
            <p className="mt-1.5 text-xl font-extrabold text-brand-800">{rupiah(p.price_quad)}<span className="text-xs font-medium text-slate-500"> /Pax</span></p>

            <p className="my-2.5 flex items-center justify-center gap-2 rounded-xl bg-slate-50 py-1.5 text-xs font-bold text-slate-700">
                <Plane className="h-4 w-4 text-brand-600" /> {p.airline}
            </p>

            <ul className="space-y-1 text-xs text-slate-700">
                <li className="flex items-center gap-2"><Clock className="h-4 w-4 text-brand-700" />{p.duration_days} Hari</li>
                <li className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-brand-700" />{next ? date(next.departure_date, { day: '2-digit', month: 'long', year: 'numeric' }) : 'Jadwal segera hadir'}</li>
                <li className="flex items-center gap-2"><Building2 className="h-4 w-4 shrink-0 text-brand-700" /><span className="truncate">{p.hotel_makkah}</span></li>
                <li className="flex items-center gap-2"><BedDouble className="h-4 w-4 shrink-0 text-brand-700" /><span className="truncate">{p.hotel_madinah}</span></li>
            </ul>
            <div className="min-h-4 flex-1" />

            <button type="button" onClick={onSelect} className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-700 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800">
                Pilih Paket <ArrowRight className="h-4 w-4" />
            </button>
            </div>
        </div>
    );
}

function Bubble({ className }) {
    return <span aria-hidden="true" className={cx('pointer-events-none absolute rounded-full bg-gradient-to-br from-brand-200 to-brand-400/60 opacity-70 shadow-inner', className)} />;
}

/* ---- Ilustrasi ikon layanan (SVG sederhana) ---- */
function KaabahIcon() {
    return (
        <svg viewBox="0 0 64 64" className="h-14 w-14" aria-hidden="true">
            <path d="M8 20 32 10l24 10v30L32 58 8 50z" fill="#1f2937" />
            <path d="M8 20 32 30l24-10L32 10z" fill="#374151" />
            <path d="M8 27l24 10 24-10v5L32 42 8 32z" fill="#d4a63a" />
            <path d="M32 37v21" stroke="#111827" strokeWidth="1.5" />
            <path d="M39 41l6-2.5v11L39 52z" fill="#d4a63a" />
        </svg>
    );
}
function PlaneIcon() {
    return <Plane className="h-14 w-14 -rotate-12 fill-amber-400 text-amber-500" strokeWidth={1.25} />;
}
function VisaIcon() {
    return (
        <span className="relative grid h-14 w-12 rotate-[-8deg] place-items-center rounded-md bg-brand-700 text-white shadow-md">
            <Stamp className="h-6 w-6" />
            <span className="absolute bottom-1.5 text-[9px] font-bold tracking-widest">VISA</span>
        </span>
    );
}
