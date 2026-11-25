import { Images, Play, Video } from 'lucide-react';
import { useState } from 'react';
import GalleryLightbox from './GalleryLightbox';
import { cn } from './lib';
import { Stagger, StaggerItem } from './motion';
import { SectionHeading } from './shared';
import type { GalleryPhoto, Heading } from './types';

type Tab = 'foto' | 'video';

/**
 * Galeri kegiatan dengan pilihan Foto | Video.
 * Klik item → lightbox: foto/video, judul, subjudul, tanggal, lokasi, keterangan (foto album bisa digeser).
 */
export default function Gallery({ heading, photos, videos = [], audio = null }: {
    heading: Heading; photos: GalleryPhoto[]; videos?: GalleryPhoto[]; audio?: { url: string; title: string | null } | null;
}) {
    const [tab, setTab] = useState<Tab>('foto');
    const [index, setIndex] = useState<number | null>(null);
    const items = tab === 'foto' ? photos : videos;

    const tabs = (
        <div role="tablist" aria-label="Jenis galeri" className="inline-flex shrink-0 rounded-full border border-primary-100 bg-white p-1 shadow-sm">
            {([['foto', 'Foto', Images, photos.length], ['video', 'Video', Video, videos.length]] as const).map(([key, label, Icon, n]) => (
                <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => { setTab(key); setIndex(null); }}
                    className={cn('inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
                        tab === key ? 'bg-gradient-to-r from-primary-700 to-primary-900 text-white shadow' : 'text-primary-800 hover:bg-primary-50')}>
                    <Icon className="h-4 w-4" aria-hidden="true" />{label}
                    <span className={cn('rounded-full px-1.5 text-[11px]', tab === key ? 'bg-white/20' : 'bg-primary-50 text-primary-700')}>{n}</span>
                </button>
            ))}
        </div>
    );

    return (
        <section id="galeri" className="scroll-mt-24 py-16 sm:py-20">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <SectionHeading align="left" title={heading.title} subtitle={heading.subtitle} action={<span className="hidden sm:block">{tabs}</span>} />
                <div className="-mt-4 mb-6 flex justify-center sm:hidden">{tabs}</div>

                {items.length ? (
                    <Stagger key={tab} gap={0.06} className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 scrollbar-none sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-5 lg:overflow-visible lg:px-0 lg:pb-0">
                        {items.map((g, i) => (
                            <StaggerItem key={g.id} className="w-[72%] shrink-0 snap-start sm:w-[42%] lg:w-auto">
                                <button type="button" onClick={() => setIndex(i)} aria-label={`Buka ${tab === 'video' ? 'video' : 'album'}: ${g.title ?? 'galeri kegiatan'}`}
                                    className="group relative block aspect-[4/3] w-full overflow-hidden rounded-2xl bg-primary-900 shadow-[0_4px_20px_-8px_rgba(11,77,42,0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2">
                                    {g.type === 'video' && g.video_url ? (
                                        <video src={`${g.video_url}#t=0.5`} preload="metadata" muted playsInline className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                    ) : (
                                        <img src={g.image_url ?? ''} alt={g.title ?? ''} loading="lazy" decoding="async"
                                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                    )}
                                    <span className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-neutral-900/80 via-neutral-900/20 to-transparent p-3 text-left opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
                                        {g.title && <span className="line-clamp-2 text-sm font-semibold text-white">{g.title}</span>}
                                        {g.subtitle && <span className="mt-0.5 line-clamp-2 text-xs text-white/80">{g.subtitle}</span>}
                                    </span>
                                    {g.type === 'video' ? (
                                        <span className="absolute inset-0 grid place-items-center" aria-hidden="true">
                                            <span className="grid h-12 w-12 place-items-center rounded-full bg-white/90 text-primary-800 shadow-lg transition group-hover:scale-110"><Play className="ml-0.5 h-5 w-5 fill-current" /></span>
                                        </span>
                                    ) : (
                                        <>
                                            {g.photos.length > 1 && (
                                                <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-neutral-900/70 px-2 py-0.5 text-xs font-semibold text-white">
                                                    <Images className="h-3.5 w-3.5" aria-hidden="true" />{g.photos.length}
                                                </span>
                                            )}                                        </>
                                    )}
                                </button>
                            </StaggerItem>
                        ))}
                    </Stagger>
                ) : (
                    <p className="rounded-2xl border border-dashed border-primary-100 p-10 text-center text-neutral-600">Belum ada {tab === 'video' ? 'video' : 'foto'} kegiatan.</p>
                )}
            </div>

            <GalleryLightbox albums={items} album={index} onClose={() => setIndex(null)} audio={tab === 'foto' ? audio : null} />
        </section>
    );
}
