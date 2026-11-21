import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { KeyboardEvent } from 'react';
import type { GalleryPhoto } from './types';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog';

interface GalleryLightboxProps {
    photos: GalleryPhoto[];
    index: number | null;
    onIndex: (index: number | null) => void;
}

const navBtn = 'absolute top-1/2 z-10 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-primary-900 shadow-lg transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500';

/** Foto galeri layar penuh. Navigasi: tombol ‹ ›, panah keyboard. Esc / klik luar untuk menutup. */
export default function GalleryLightbox({ photos, index, onIndex }: GalleryLightboxProps) {
    const total = photos.length;
    const photo = index !== null ? photos[index] : null;
    const go = (step: number) => index !== null && onIndex((index + step + total) % total);
    const onKey = (e: KeyboardEvent) => {
        if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    };

    return (
        <Dialog open={photo !== null} onOpenChange={(o) => !o && onIndex(null)}>
            <DialogContent onKeyDown={onKey} overlayClassName="bg-neutral-900/85" className="max-w-5xl">
                {photo && (
                    <figure>
                        <div className="relative">
                            <img key={photo.image_url} src={photo.image_url} alt={photo.title ?? 'Foto galeri'}
                                className="mx-auto max-h-[75vh] w-auto animate-pop rounded-2xl object-contain shadow-2xl" />
                            {total > 1 && (
                                <>
                                    <button type="button" onClick={() => go(-1)} aria-label="Foto sebelumnya" className={`${navBtn} left-2 sm:-left-6`}>
                                        <ChevronLeft className="h-6 w-6" />
                                    </button>
                                    <button type="button" onClick={() => go(1)} aria-label="Foto berikutnya" className={`${navBtn} right-2 sm:-right-6`}>
                                        <ChevronRight className="h-6 w-6" />
                                    </button>
                                </>
                            )}
                        </div>
                        <figcaption className="mt-4 flex items-center justify-center gap-3 text-center text-white">
                            <DialogTitle className="font-jakarta text-base font-bold sm:text-lg">{photo.title ?? 'Galeri Kegiatan'}</DialogTitle>
                            {total > 1 && <DialogDescription className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold tabular-nums">{(index ?? 0) + 1} / {total}</DialogDescription>}
                        </figcaption>
                    </figure>
                )}
            </DialogContent>
        </Dialog>
    );
}
