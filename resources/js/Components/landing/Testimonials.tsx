import { CalendarDays, MapPin, PenLine, Quote, Star } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { useState } from 'react';
import { cn, formatMonth, initials } from './lib';
import { Reveal } from './motion';
import ReviewDialog from './ReviewDialog';
import { IslamicStar, SectionHeading } from './shared';
import type { Heading, RatingSummary, Testimonial } from './types';

interface TestimonialsProps {
    heading: Heading;
    testimonials: Testimonial[];
    rating: RatingSummary;
    packageOptions: string[];
}

export default function Testimonials({ heading, testimonials, rating, packageOptions }: TestimonialsProps) {
    const [writing, setWriting] = useState(false);
    const reduce = useReducedMotion();

    // Satu putaran minimal 6 kartu agar lintasan selalu penuh, lalu digandakan untuk geser -50% tanpa putus
    const loop: Testimonial[] = [];
    while (testimonials.length && loop.length < 6) loop.push(...testimonials);

    return (
        <section id="testimoni" className="relative scroll-mt-24 overflow-hidden bg-primary-50 py-16 sm:py-20">
            <IslamicStar className="absolute -left-16 bottom-6 h-56 w-56 text-primary-700 opacity-[0.07]" />
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <SectionHeading title={heading.title} subtitle={heading.subtitle} />

                <Reveal className="glassy mx-auto mb-10 flex max-w-xl flex-col items-center gap-4 rounded-3xl p-5 text-center sm:flex-row sm:text-left">
                    <p className="font-jakarta text-5xl font-extrabold tracking-tight text-primary-700">{rating.average.toFixed(1).replace('.', ',')}</p>
                    <div className="flex-1">
                        <Stars value={rating.average} size="h-5 w-5" center />
                        <p className="mt-1 text-sm text-neutral-600">dari {rating.count} ulasan jamaah</p>
                    </div>
                    <button type="button" onClick={() => setWriting(true)}
                        className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary-700 to-primary-900 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-primary-700/25 transition hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2">
                        <PenLine className="h-4 w-4" aria-hidden="true" /> Tulis Ulasan
                    </button>
                </Reveal>
            </div>

            {testimonials.length === 0 ? (
                <p className="mx-4 rounded-2xl border border-dashed border-primary-100 bg-white p-10 text-center text-neutral-600 sm:mx-auto sm:max-w-xl">
                    Belum ada ulasan. Jadilah jamaah pertama yang berbagi pengalaman.
                </p>
            ) : reduce ? (
                <ul className="mx-auto flex max-w-7xl snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-4 sm:px-6 lg:px-8" aria-label="Ulasan jamaah">
                    {testimonials.map((t) => <li key={t.id} className="w-[300px] shrink-0 snap-start sm:w-[360px]"><ReviewCard t={t} /></li>)}
                </ul>
            ) : (
                <div className="marquee-mask overflow-hidden" aria-label="Ulasan jamaah">
                    <ul className="flex w-max animate-marquee py-2 hover:[animation-play-state:paused] focus-within:[animation-play-state:paused]">
                        {[...loop, ...loop].map((t, i) => (
                            <li key={`${t.id}-${i}`} className="w-[300px] shrink-0 pr-5 sm:w-[380px]" aria-hidden={i >= loop.length || undefined}>
                                <ReviewCard t={t} />
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <ReviewDialog open={writing} onOpenChange={setWriting} packageOptions={packageOptions} />
        </section>
    );
}

function Stars({ value, size = 'h-4 w-4', center = false }: { value: number; size?: string; center?: boolean }) {
    return (
        <div className={cn('flex gap-0.5', center && 'justify-center sm:justify-start')} role="img" aria-label={`Rating ${value} dari 5`}>
            {[1, 2, 3, 4, 5].map((n) => (
                <Star key={n} aria-hidden="true" className={cn(size, n <= Math.round(value) ? 'fill-gold-500 text-gold-500' : 'fill-primary-100 text-primary-100')} />
            ))}
        </div>
    );
}

function ReviewCard({ t }: { t: Testimonial }) {
    const meta = [t.departure_month && formatMonth(t.departure_month), t.package_name].filter(Boolean).join(' · ');
    return (
        <figure className="relative flex h-full flex-col rounded-2xl border border-primary-100 bg-white p-6 shadow-[0_4px_20px_-8px_rgba(11,77,42,0.12)]">
            <Quote className="absolute right-5 top-5 h-8 w-8 fill-primary-100 text-primary-100" aria-hidden="true" />
            <Stars value={t.rating} />
            <blockquote className="mt-4 line-clamp-4 flex-1 text-sm leading-relaxed text-neutral-900/85">“{t.content}”</blockquote>
            <figcaption className="mt-5 flex items-center gap-3 border-t border-primary-100 pt-4">
                {t.photo_url
                    ? <img src={t.photo_url} alt="" loading="lazy" className="h-11 w-11 shrink-0 rounded-full object-cover" />
                    : <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-sm font-bold text-white" aria-hidden="true">{initials(t.name)}</span>}
                <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-neutral-900">{t.name}</p>
                    {t.city && <p className="flex items-center gap-1 text-xs text-neutral-600"><MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />{t.city}</p>}
                    {meta && <p className="flex items-center gap-1 truncate text-xs text-primary-700"><CalendarDays className="h-3 w-3 shrink-0" aria-hidden="true" /><span className="truncate">{meta}</span></p>}
                </div>
            </figcaption>
        </figure>
    );
}
