import { ArrowRight, Award, HeartHandshake, ShieldCheck, Sparkles } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { cn, scrollToSection } from './lib';
import { Stagger, StaggerItem } from './motion';
import { arrowShift, btnPrimary, btnSecondary, IslamicStar } from './shared';
import type { HeroContent } from './types';

const TRUST_ICONS = [ShieldCheck, Award, HeartHandshake];

/** Judul dipecah jadi 2 baris: pakai baris baru dari admin, atau dibagi dua sama rata per kata. */
function splitTitle(title: string): string[] {
    if (title.includes('\n')) return title.split('\n').map((l) => l.trim()).filter(Boolean);
    const words = title.split(/\s+/);
    const half = Math.floor(words.length / 2);
    return [words.slice(0, half).join(' '), words.slice(half).join(' ')].filter(Boolean);
}

export default function Hero({ hero }: { hero: HeroContent }) {
    const reduce = useReducedMotion();
    const lines = splitTitle(hero.title);

    return (
        <section id="beranda" className="relative scroll-mt-0 overflow-hidden bg-gradient-to-b from-primary-50 via-primary-50/60 to-white pt-36 lg:pt-40">
            <IslamicStar className="absolute -left-10 top-32 h-48 w-48 text-primary-700 opacity-[0.08]" />
            <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 pb-14 sm:px-6 lg:grid-cols-[1.25fr_1fr] lg:gap-8 lg:px-8 lg:pb-20">
                <Stagger immediate gap={0.1} className="relative z-10">
                    {hero.badge && (
                        <StaggerItem>
                            <span className="inline-flex items-center gap-2 rounded-full border border-primary-100 bg-white px-4 py-1.5 text-sm font-bold text-primary-700 shadow-sm">
                                <Sparkles className="h-4 w-4 text-gold-500" aria-hidden="true" /> {hero.badge}
                            </span>
                        </StaggerItem>
                    )}
                    <StaggerItem as="h1" className="mt-5 font-jakarta text-[2rem] font-extrabold leading-[1.15] tracking-tight text-neutral-900 sm:text-5xl lg:text-[2.05rem] xl:text-[2.6rem]">
                        {lines.map((l) => <span key={l} className="block">{l}</span>)}
                        {hero.highlight && <span className="block text-primary-700 lg:whitespace-nowrap">{hero.highlight}</span>}
                    </StaggerItem>
                    {hero.subtitle && (
                        <StaggerItem as="p" className="mt-5 max-w-xl text-base leading-relaxed text-neutral-600 sm:text-lg">{hero.subtitle}</StaggerItem>
                    )}
                    <StaggerItem className="mt-8 flex flex-col gap-3 sm:flex-row">
                        <a href="#paket" onClick={(e) => { e.preventDefault(); scrollToSection('paket'); }} className={btnPrimary}>
                            {hero.primary_label} <ArrowRight className={arrowShift} aria-hidden="true" />
                        </a>
                        <a href="#layanan" onClick={(e) => { e.preventDefault(); scrollToSection('layanan'); }} className={btnSecondary}>
                            {hero.secondary_label}
                        </a>
                    </StaggerItem>
                    <StaggerItem as="div" className="mt-9">
                        <ul className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-y-3">
                            {hero.points.map((label, i) => {
                                const Icon = TRUST_ICONS[i % TRUST_ICONS.length];
                                return (
                                    <li key={label} className={cn('flex flex-col items-center gap-1.5 text-center text-xs font-semibold text-neutral-900 sm:flex-row sm:gap-2 sm:text-left sm:text-sm',
                                        i > 0 && 'border-l border-primary-100 sm:pl-5', i < hero.points.length - 1 && 'sm:pr-5')}>
                                        <span className="grid h-9 w-9 place-items-center rounded-full bg-primary-100 text-primary-700"><Icon className="h-[18px] w-[18px]" aria-hidden="true" /></span>
                                        {label}
                                    </li>
                                );
                            })}
                        </ul>
                    </StaggerItem>
                </Stagger>

                <div className="hero-bleed relative ml-4 sm:ml-10 lg:ml-0">
                    {/* busur hijau di belakang foto */}
                    <motion.div aria-hidden="true" className="hero-arch absolute inset-y-[-14px] left-[-16px] right-0 bg-gradient-to-br from-primary-500 via-primary-700 to-primary-900"
                        initial={reduce ? false : { opacity: 0, x: -60 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, ease: 'easeOut', delay: 0.15 }} />
                    <motion.div className="hero-arch relative overflow-hidden bg-primary-100 shadow-2xl shadow-primary-900/20"
                        initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>
                        <motion.img src={hero.image} alt="Ka'bah dan Masjidil Haram" fetchPriority="high" decoding="async"
                            className="aspect-[5/4] w-full object-cover object-[45%_40%] lg:aspect-[4/4.1]"
                            initial={reduce ? false : { scale: 1.1 }} animate={{ scale: 1 }} transition={{ duration: 0.8, ease: 'easeOut' }} />
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
