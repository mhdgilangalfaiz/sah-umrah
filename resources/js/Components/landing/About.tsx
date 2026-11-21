import { Check, Layers, Target } from 'lucide-react';
import { Reveal, Stagger, StaggerItem } from './motion';
import { IslamicStar } from './shared';
import type { AboutContent } from './types';

export default function About({ about }: { about: AboutContent }) {
    const vision = about.vision.split(/\n+/).filter(Boolean);
    return (
        <section id="tentang" className="scroll-mt-24 py-16 sm:py-20">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="relative grid overflow-hidden rounded-3xl border border-primary-100 bg-white shadow-[0_20px_50px_-24px_rgba(11,77,42,0.25)] lg:grid-cols-[0.95fr_1.3fr]">
                    <IslamicStar className="absolute -right-12 -top-12 h-48 w-48 text-primary-700 opacity-[0.09]" />
                    <IslamicStar className="absolute -bottom-10 right-1/3 h-32 w-32 text-gold-500 opacity-[0.12]" />

                    <Reveal variant="left" className="relative min-h-[240px] sm:min-h-[320px]">
                        <img src={about.image} alt={`Kantor & layanan ${about.title}`} loading="lazy" decoding="async"
                            className="about-slant absolute inset-0 h-full w-full object-cover object-[60%_70%]" />
                    </Reveal>

                    <Reveal variant="right" className="relative p-6 sm:p-10 lg:py-12 lg:pl-6 lg:pr-12">
                        <span className="inline-flex rounded-full bg-primary-100 px-4 py-1.5 text-sm font-bold text-primary-700">{about.label}</span>
                        <h2 className="mt-4 font-jakarta text-2xl font-extrabold tracking-tight text-neutral-900 sm:text-3xl">{about.title}</h2>
                        {about.lead && <p className="mt-3 font-semibold leading-relaxed text-neutral-900/80">{about.lead}</p>}
                        {about.body && <p className="mt-3 text-sm leading-relaxed text-neutral-600 sm:text-base">{about.body}</p>}

                        <div className="mt-8 grid gap-8 sm:grid-cols-2 sm:gap-0 sm:divide-x sm:divide-primary-100">
                            <div className="sm:pr-8">
                                <h3 className="flex items-center gap-2 font-jakarta text-lg font-extrabold text-primary-700">
                                    <span className="grid h-9 w-9 place-items-center rounded-full bg-primary-100"><Target className="h-5 w-5" aria-hidden="true" /></span> Visi
                                </h3>
                                {vision.map((v) => <p key={v} className="mt-3 text-sm leading-relaxed text-neutral-600">{v}</p>)}
                            </div>
                            <div className="sm:pl-8">
                                <h3 className="flex items-center gap-2 font-jakarta text-lg font-extrabold text-primary-700">
                                    <span className="grid h-9 w-9 place-items-center rounded-full bg-primary-100"><Layers className="h-5 w-5" aria-hidden="true" /></span> Misi
                                </h3>
                                <Stagger as="ul" gap={0.12} className="mt-3 space-y-2.5">
                                    {about.mission.map((m) => (
                                        <StaggerItem as="li" key={m} variant="right" className="flex gap-2.5 text-sm leading-relaxed text-neutral-600">
                                            <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary-500 text-white">
                                                <Check className="h-3 w-3" strokeWidth={3.5} aria-hidden="true" />
                                            </span>
                                            {m}
                                        </StaggerItem>
                                    ))}
                                </Stagger>
                            </div>
                        </div>
                    </Reveal>
                </div>
            </div>
        </section>
    );
}
