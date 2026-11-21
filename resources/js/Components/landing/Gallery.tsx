import { ArrowRight, ZoomIn } from 'lucide-react';
import { useState } from 'react';
import GalleryLightbox from './GalleryLightbox';
import { Stagger, StaggerItem } from './motion';
import { arrowShift, SectionHeading } from './shared';
import type { GalleryPhoto, Heading } from './types';

export default function Gallery({ heading, photos }: { heading: Heading; photos: GalleryPhoto[] }) {
    const [index, setIndex] = useState<number | null>(null);
    const shown = photos.slice(0, 5);

    const action = (
        <button type="button" onClick={() => setIndex(0)} disabled={!photos.length}
            className="group hidden shrink-0 items-center gap-2 rounded-full border-2 border-primary-700 bg-white px-5 py-2 text-sm font-bold text-primary-700 transition hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 sm:inline-flex">
            Lihat Galeri <ArrowRight className={arrowShift} aria-hidden="true" />
        </button>
    );

    return (
        <section id="galeri" className="scroll-mt-24 py-16 sm:py-20">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <SectionHeading align="left" title={heading.title} subtitle={heading.subtitle} action={action} />

                {shown.length ? (
                    <Stagger gap={0.08} className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 scrollbar-none sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-5 lg:overflow-visible lg:px-0 lg:pb-0">
                        {shown.map((g, i) => (
                            <StaggerItem key={g.id} className="w-[72%] shrink-0 snap-start sm:w-[42%] lg:w-auto">
                                <button type="button" onClick={() => setIndex(i)} aria-label={`Perbesar foto: ${g.title ?? 'galeri kegiatan'}`}
                                    className="group relative block aspect-[4/3] w-full overflow-hidden rounded-2xl bg-primary-100 shadow-[0_4px_20px_-8px_rgba(11,77,42,0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2">
                                    <img src={g.image_url} alt={g.title ?? ''} loading="lazy" decoding="async"
                                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                    <span className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-neutral-900/80 via-neutral-900/20 to-transparent p-3 text-left opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
                                        {g.title && <span className="line-clamp-2 text-sm font-semibold text-white">{g.title}</span>}
                                    </span>
                                    <span className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-primary-700 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden="true">
                                        <ZoomIn className="h-4 w-4" />
                                    </span>
                                </button>
                            </StaggerItem>
                        ))}
                    </Stagger>
                ) : (
                    <p className="rounded-2xl border border-dashed border-primary-100 p-10 text-center text-neutral-600">Belum ada foto kegiatan.</p>
                )}

                {photos.length > 0 && (
                    <div className="mt-6 flex justify-center sm:hidden">
                        <button type="button" onClick={() => setIndex(0)} className="group inline-flex items-center gap-2 rounded-full border-2 border-primary-700 bg-white px-5 py-2 text-sm font-bold text-primary-700">
                            Lihat Galeri <ArrowRight className={arrowShift} aria-hidden="true" />
                        </button>
                    </div>
                )}
            </div>

            <GalleryLightbox photos={photos} index={index} onIndex={setIndex} />
        </section>
    );
}
