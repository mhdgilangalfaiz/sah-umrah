import { Link } from '@inertiajs/react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { cn } from '@/Components/landing/lib';
import AuthPlane from './AuthPlane';
import type { AuthMode, AuthSlide, PlaneState } from './fields';

interface VisualPanelProps {
    slides: AuthSlide[];
    mode: AuthMode;
    plane: PlaneState;
    planeKey: number;
    onPlaneDone: () => void;
}

/** Awan lembut dari radial-gradient (tanpa blur). */
const CLOUD = 'radial-gradient(closest-side, rgba(255,255,255,0.95), rgba(255,255,255,0.6) 55%, rgba(255,255,255,0) 100%)';

/** Panel kiri: logo, judul slide, foto Masjidil Haram memudar ke atas, awan, pesawat & titik carousel. */
export default function VisualPanel({ slides, mode, plane, planeKey, onPlaneDone }: VisualPanelProps) {
    const [index, setIndex] = useState(0);
    const [paused, setPaused] = useState(false);
    const slide = slides[index];

    // ganti otomatis tiap 6 detik, berhenti saat hover
    useEffect(() => {
        if (paused || slides.length < 2) return undefined;
        const t = window.setTimeout(() => setIndex((i) => (i + 1) % slides.length), 6000);
        return () => window.clearTimeout(t);
    }, [index, paused, slides.length]);

    return (
        <div className="relative flex h-full min-h-[380px] flex-col rounded-[1.4rem]"
            onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
            {/* lapisan latar dipotong sendiri, supaya pesawat bebas keluar panel saat jatuh / terbang */}
            <div aria-hidden="true" className="absolute inset-0 overflow-hidden rounded-[1.4rem] bg-gradient-to-b from-[#EEF7F1] via-[#F4FAF6] to-[#E1EFE6]">
                <AnimatePresence initial={false}>
                    <motion.img key={slide.image} src={slide.image} alt="" decoding="async"
                        className="absolute inset-x-0 bottom-0 h-[52%] w-full object-cover object-[50%_30%] [mask-image:linear-gradient(to_top,#000_40%,transparent)] lg:h-[48%]"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.8 }} />
                </AnimatePresence>
                <span className="absolute -left-10 bottom-10 h-28 w-64" style={{ backgroundImage: CLOUD }} />
                <span className="absolute -right-12 bottom-2 h-32 w-72" style={{ backgroundImage: CLOUD }} />
                <span className="absolute right-6 top-[38%] h-14 w-36 opacity-80" style={{ backgroundImage: CLOUD }} />
            </div>

            <div className="relative z-10 p-6 sm:p-7">
                <Link href={route('home')} className="hidden w-fit rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 lg:block">
                    <img src="/images/logo-sah.png" alt="SAH - kembali ke beranda" className="h-12 w-auto" />
                </Link>
                <span className="mt-0 inline-flex rounded-full border border-white bg-white/80 px-3.5 py-1 text-xs font-bold text-primary-700 shadow-sm lg:mt-5">PT. Sumatera Andalan Haramain</span>
                <AnimatePresence mode="wait" initial={false}>
                    <motion.div key={index} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.45 }}>
                        <h2 className="mt-3 font-jakarta text-[1.7rem] font-extrabold leading-[1.12] tracking-tight text-primary-900 sm:text-[2rem]">
                            {slide.title.map((line) => <span key={line} className="block">{line}</span>)}
                        </h2>
                        <p className="mt-2 max-w-[22rem] text-sm font-medium text-neutral-900/75">{slide.subtitle}</p>
                    </motion.div>
                </AnimatePresence>
            </div>

            <AuthPlane key={planeKey} state={plane} mode={mode} onDone={onPlaneDone}
                className="relative z-20 mx-auto -mt-2 w-[78%] max-w-[380px] lg:absolute lg:left-[18%] lg:top-[53%] lg:mt-0 lg:w-[68%]" />

            <div className="relative z-10 mt-auto flex justify-center gap-2 pb-5 pt-16" role="tablist" aria-label="Pilih slide">
                {slides.map((s, i) => (
                    <button key={s.image} type="button" role="tab" aria-selected={i === index} aria-label={`Slide ${i + 1}`} onClick={() => setIndex(i)}
                        className={cn('h-2.5 rounded-full bg-white shadow ring-1 ring-primary-900/10 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white', i === index ? 'w-7' : 'w-2.5 opacity-70')} />
                ))}
            </div>
        </div>
    );
}
