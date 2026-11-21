import { Link } from '@inertiajs/react';
import { ArrowRight, Layers } from 'lucide-react';
import { Stagger, StaggerItem } from './motion';
import { card, SectionHeading } from './shared';
import type { Heading, Service } from './types';

export default function Services({ heading, services }: { heading: Heading; services: Service[] }) {
    return (
        <section id="layanan" className="scroll-mt-24 bg-primary-50 py-16 sm:py-20">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <SectionHeading title={heading.title} subtitle={heading.subtitle} />
                <Stagger gap={0.1} className="grid gap-5 lg:grid-cols-3">
                    {services.map((s) => (
                        <StaggerItem key={s.url}>
                            <Link href={s.url} className={`${card} group flex h-full items-center gap-4 p-5 lg:p-4 xl:p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500`}>
                                {/* gambar cut-out sedikit keluar dari lingkaran emas */}
                                <span className="relative grid h-24 w-24 shrink-0 place-items-center rounded-full bg-gold-100 lg:h-20 lg:w-20 xl:h-24 xl:w-24">
                                    {s.image
                                        ? <img src={s.image} alt="" loading="lazy" decoding="async"
                                            className={`${s.icon === 'plane' ? 'w-[130%] max-w-none' : 'w-[88%]'} h-auto object-contain transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110`} />
                                        : <Layers className="h-9 w-9 text-primary-700" aria-hidden="true" />}
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block font-jakarta text-lg font-extrabold leading-snug tracking-tight text-neutral-900">{s.title}</span>
                                    {s.text && <span className="mt-1 block text-sm leading-relaxed text-neutral-600">{s.text}</span>}
                                </span>
                                <span aria-hidden="true"
                                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-primary-700 text-primary-700 transition group-hover:bg-primary-700 group-hover:text-white lg:h-8 lg:w-8 xl:h-10 xl:w-10">
                                    <ArrowRight className="h-4 w-4" />
                                </span>
                            </Link>
                        </StaggerItem>
                    ))}
                </Stagger>
            </div>
        </section>
    );
}
