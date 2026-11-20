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

const MISI = [
    'Memberikan layanan ibadah umrah yang aman & nyaman.',
    'Menyediakan paket perjalanan yang berkualitas.',
    'Memberikan pendampingan ibadah oleh tim berpengalaman.',
    'Menjaga kepercayaan dan kepuasan seluruh jamaah.',
];

const LAYANAN = [
    { title: 'Paket Umrah', text: 'Pilihan paket umrah terbaik dengan fasilitas lengkap.', route: 'packages.index', icon: KaabahIcon },
    { title: 'Tiket Pesawat Ibadah Umrah', text: 'Pemesanan tiket pesawat untuk keberangkatan umrah dengan harga kompetitif.', route: 'flights.index', icon: PlaneIcon },
    { title: 'Layanan Visa', text: 'Pengurusan visa umrah secara cepat, aman, dan sesuai ketentuan resmi.', route: 'visa.index', icon: VisaIcon },
];

// Foto bawaan bila admin belum mengunggah galeri. Ganti dengan foto asli resolusi tinggi di public/images/landing.
const DEFAULT_GALLERY = [
    'Jamaah berdoa di Masjidil Haram', 'Kubah Hijau Masjid Nabawi', 'Masjid Quba, Madinah', 'Payung raksasa Masjid Nabawi',
    'Interior Masjid Nabawi', 'Jabal Rahmah, Arafah', 'Kota Makkah di malam hari',
].map((title, i) => ({ id: `d${i + 1}`, title, type: 'foto', image_url: `/images/landing/galeri-${i + 1}.jpg` }));

export default function Home({ featured, galleries, testimonials, faqs }) {
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
    const galleryItems = galleryTab === 'video' ? videos : photos;
    const [viewer, setViewer] = useState(null); // index item galeri yang sedang dibuka

    return (
        <PublicLayout title="Biro Perjalanan Umrah Terpercaya di Medan">
            {/* ============ HERO / BERANDA ============ */}
            <section id="beranda" className="landing-section relative -mt-[76px] overflow-hidden bg-gradient-to-b from-brand-50/70 via-white to-white pt-[76px] lg:-mt-[80px] lg:pt-[80px]">
                <Bubble className="left-6 top-28 h-10 w-10" />
                <Bubble className="left-24 top-44 h-4 w-4" />
                <Bubble className="right-10 top-24 hidden h-8 w-8 lg:block" />

                <div className="container-app relative grid items-center gap-10 py-10 lg:grid-cols-[1fr_1.1fr] lg:py-14">
                    <div className="animate-fade-up">
                        <span className="inline-flex rounded-lg border border-brand-200 bg-white px-3 py-1.5 text-sm font-semibold text-brand-800 shadow-sm">PT. Sumatera Andalan Haramain</span>
                        <h1 className="mt-5 font-sans text-[2rem] font-extrabold leading-[1.15] tracking-tight text-slate-900 sm:text-5xl lg:text-[3.25rem]">
                            Melayani Perjalanan Ibadah Umrah Anda <span className="text-brand-700">dengan Amanah &amp; Profesional</span>
                        </h1>
                        <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
                            Solusi lengkap kebutuhan umrah Anda, mulai dari paket umrah terbaik, tiket pesawat, visa, hingga pembimbing yang berpengalaman.
                        </p>
                        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                            <Link href={route('packages.index')} className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-700 px-6 py-3.5 font-semibold text-white shadow-lift transition hover:bg-brand-800">
                                <Layers className="h-5 w-5" /> Lihat Paket Umrah <ArrowRight className="h-4 w-4" />
                            </Link>
                            <a href="#tentang" className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-brand-600 bg-white px-6 py-3 font-semibold text-brand-700 transition hover:bg-brand-50">
                                <UserRound className="h-5 w-5" /> Pelayanan Profesional
                            </a>
                        </div>
                        <ul className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm font-medium text-slate-700">
                            {[[ShieldCheck, 'Terpercaya'], [UserCheck, 'Berpengalaman'], [Star, 'Aman & Nyaman']].map(([Icon, label], i) => (
                                <li key={label} className={cx('flex items-center gap-2', i > 0 && 'sm:border-l sm:border-slate-200 sm:pl-6')}>
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
                            <img src="/images/landing/hero-kaabah.jpg" alt="Ka'bah dan Masjidil Haram" className="aspect-[16/11] w-full object-cover object-[45%_40%]" />
                        </div>
                    </div>
                </div>
            </section>

            {/* ============ TENTANG KAMI ============ */}
            <section id="tentang" className="landing-section py-14 sm:py-20">
                <div className="container-app grid items-center gap-10 lg:grid-cols-[0.9fr_1.3fr]">
                    <div className="relative">
                        <div className="absolute -bottom-3 -left-3 h-24 w-24 rounded-3xl bg-brand-100" />
                        <img src="/images/landing/nabawi.jpg" alt="Masjid Nabawi, Madinah"
                            className="relative aspect-[5/3] w-full rounded-3xl object-cover object-[60%_80%] shadow-xl [clip-path:polygon(0_0,100%_0,88%_100%,0_100%)]" />
                    </div>
                    <div>
                        <span className="chip-green">Tentang Kami</span>
                        <h2 className="mt-4 font-sans text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">PT. Sumatera Andalan Haramain</h2>
                        <p className="mt-3 text-base leading-relaxed text-slate-600">Perusahaan penyelenggara perjalanan ibadah umrah yang berkomitmen memberikan layanan terbaik, amanah, dan profesional.</p>
                        <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
                            Berkantor pusat di Kota Medan, kami melayani jamaah dengan keberangkatan dari Bandara Kualanamu, hotel dekat Masjidil Haram dan Masjid Nabawi,
                            serta pendampingan pembimbing ibadah berpengalaman. Seluruh pendaftaran dan pembayaran dilakukan melalui sistem resmi sehingga setiap transaksi tercatat dengan aman.
                        </p>
                        <div className="mt-8 grid gap-8 sm:grid-cols-2 sm:divide-x sm:divide-slate-200">
                            <div>
                                <h3 className="flex items-center gap-2 font-sans text-xl font-extrabold text-brand-700"><Goal className="h-6 w-6" /> Visi</h3>
                                <p className="mt-3 text-sm leading-relaxed text-slate-600">Menjadi penyelenggara perjalanan ibadah umrah yang terpercaya, profesional, dan unggul di Indonesia.</p>
                                <p className="mt-2 text-sm leading-relaxed text-slate-600">Kami ingin setiap jamaah dapat beribadah dengan tenang dan khusyuk, didukung pelayanan yang amanah sejak persiapan keberangkatan, selama di Tanah Suci, hingga kembali ke tanah air.</p>
                            </div>
                            <div className="sm:pl-8">
                                <h3 className="flex items-center gap-2 font-sans text-xl font-extrabold text-brand-700"><Layers className="h-6 w-6" /> Misi</h3>
                                <ul className="mt-3 space-y-2 text-sm text-slate-600">
                                    {MISI.map((m) => <li key={m} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" strokeWidth={3} />{m}</li>)}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ============ LAYANAN UTAMA ============ */}
            <section id="layanan" className="landing-section pb-14 sm:pb-20">
                <div className="container-app">
                    <Heading title="Layanan Utama Kami" subtitle="Tiga layanan utama untuk memenuhi kebutuhan perjalanan ibadah umrah Anda." />
                    <div className="grid gap-5 md:grid-cols-3">
                        {LAYANAN.map(({ title, text, route: r, icon: Icon }) => (
                            <Link key={r} href={route(r)} className="group flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-soft transition hover:-translate-y-1 hover:border-brand-200 hover:shadow-lift">
                                <span className="grid h-24 w-24 shrink-0 place-items-center rounded-full bg-[radial-gradient(circle,#fff7d6_0%,#fdf3c4_45%,#ffffff_72%)]"><Icon /></span>
                                <span className="min-w-0 flex-1">
                                    <span className="block text-lg font-bold leading-snug text-slate-900">{title}</span>
                                    <span className="mt-1 block text-sm leading-relaxed text-slate-600">{text}</span>
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
                    <Heading title="Pilihan Paket Umrah Terbaik" subtitle="Berbagai pilihan paket dengan fasilitas lengkap, maskapai terpercaya, dan harga kompetitif."
                        action={<Link href={route('packages.index')} className="inline-flex items-center gap-2 rounded-full border-2 border-brand-600 px-5 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-50">Lihat Semua Paket <ArrowRight className="h-4 w-4" /></Link>} />
                    {featured.length ? (
                        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                            {featured.map((p, i) => <LandingPackageCard key={p.id} p={p} best={i === 0} onSelect={() => setSelected(p)} />)}
                        </div>
                    ) : (
                        <p className="rounded-2xl border border-dashed border-slate-200 p-10 text-center text-slate-500">Paket umrah segera hadir.</p>
                    )}
                </div>
            </section>

            {/* ============ GALERI ============ */}
            <section id="galeri" className="landing-section pb-14 sm:pb-20">
                <div className="container-app">
                    <Heading title="Galeri Kegiatan" subtitle="Dokumentasi perjalanan ibadah umrah bersama jamaah kami." />
                    <GalleryTabs value={galleryTab} onChange={(t) => { setGalleryTab(t); setViewer(null); }} counts={{ foto: photos.length, video: videos.length }} />
                    {galleryItems.length ? (
                        <GalleryCarousel key={galleryTab} items={galleryItems} onOpen={setViewer} />
                    ) : (
                        <p className="rounded-2xl border border-dashed border-slate-200 p-10 text-center text-slate-500">
                            {galleryTab === 'video' ? 'Belum ada video kegiatan.' : 'Belum ada foto kegiatan.'}
                        </p>
                    )}
                </div>
            </section>
            {viewer !== null && galleryItems[viewer] && <GalleryLightbox items={galleryItems} index={viewer} onIndex={setViewer} onClose={() => setViewer(null)} />}

            {/* ============ TESTIMONI ============ */}
            <section id="testimoni" className="landing-section bg-brand-50/60 py-14 sm:py-20">
                <div className="container-app">
                    <Heading title="Testimoni Jamaah" subtitle="Cerita dan pengalaman jamaah yang telah berangkat bersama kami." />
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
                        <Heading title="Pertanyaan yang Sering Diajukan" subtitle="Informasi seputar layanan umrah PT. Sumatera Andalan Haramain." />
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
                        <div className="mt-6 flex items-start gap-3 rounded-2xl bg-brand-50 p-4 text-sm text-brand-900">
                            <Headset className="mt-0.5 h-5 w-5 shrink-0" />
                            <p>Masih ada pertanyaan? Klik tombol <b>Butuh Bantuan?</b> di pojok kanan bawah untuk berkonsultasi langsung dengan tim kami.</p>
                        </div>
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
function GalleryCarousel({ items, onOpen }) {
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
    }, [update, items.length]);

    // Lebar item berbeda-beda, jadi geser ±80% lebar area per klik
    const slide = (dir) => {
        const el = track.current;
        if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' });
    };

    return (
        <div className="relative">
            <div ref={track} onScroll={update} className="flex snap-x gap-3 overflow-x-auto scroll-smooth scrollbar-none">
                {items.map((g, i) => (
                    <button key={g.id} type="button" onClick={() => onOpen(i)} aria-label={`${g.type === 'video' ? 'Putar video' : 'Perbesar foto'}: ${g.title}`}
                        className={cx('group relative h-48 shrink-0 snap-start overflow-hidden rounded-2xl bg-slate-100 shadow-soft sm:h-60', g.type === 'video' ? 'cursor-pointer' : 'cursor-zoom-in')}>
                        {g.type === 'video' ? (
                            <video src={`${g.image_url}#t=0.1`} preload="metadata" muted playsInline
                                className="pointer-events-none h-full w-auto max-w-[85vw] object-contain transition duration-500 group-hover:scale-105" />
                        ) : (
                            <img src={g.image_url} alt={g.title} loading="lazy"
                                className="h-full w-auto max-w-[85vw] object-contain transition duration-500 group-hover:scale-105" />
                        )}
                        {g.type === 'video' ? (
                            <span className="absolute inset-0 grid place-items-center bg-black/15 transition group-hover:bg-black/30">
                                <span className="grid h-14 w-14 place-items-center rounded-full bg-white/90 text-brand-800 shadow-lg transition group-hover:scale-110">
                                    <Play className="ml-1 h-6 w-6 fill-current" />
                                </span>
                            </span>
                        ) : (
                            <span className="absolute inset-0 grid place-items-center opacity-0 transition group-hover:bg-black/25 group-hover:opacity-100">
                                <ZoomIn className="h-7 w-7 text-white drop-shadow" />
                            </span>
                        )}
                    </button>
                ))}
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

function LandingPackageCard({ p, best, onSelect }) {
    const next = p.upcoming_departures?.[0];
    return (
        <div className="relative flex flex-col rounded-2xl border border-slate-100 bg-white p-3 shadow-soft transition hover:-translate-y-1 hover:shadow-lift">
            {best && (
                <span className="absolute -top-3 left-4 z-10 inline-flex items-center gap-1 rounded-full bg-amber-400 px-3 py-1 text-xs font-bold text-white shadow">
                    <Star className="h-3 w-3 fill-current" /> Best Seller
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
            <p className="mt-2 text-2xl font-extrabold text-brand-800">{rupiah(p.price_quad)}<span className="text-xs font-medium text-slate-500"> /Pax</span></p>

            <p className="my-3 flex items-center justify-center gap-2 rounded-xl bg-slate-50 py-2 text-sm font-bold text-slate-700">
                <Plane className="h-4 w-4 text-brand-600" /> {p.airline}
            </p>

            <ul className="space-y-1.5 text-sm text-slate-700">
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
