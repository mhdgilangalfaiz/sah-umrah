import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, TouchEvent } from 'react';
import type { GalleryPhoto } from './types';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog';

interface GalleryLightboxProps {
    albums: GalleryPhoto[];
    album: number | null; // album yang dibuka
    onClose: () => void;
}

const navBtn = 'absolute top-1/2 z-10 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-primary-900 shadow-lg transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500';

/**
 * Lightbox album: foto, judul, subjudul, posisi foto dalam album.
 * Geser (swipe) / tombol ‹ › / panah keyboard. Setelah foto terakhir lanjut ke album berikutnya.
 */
export default function GalleryLightbox({ albums, album, onClose }: GalleryLightboxProps) {
    // Semua foto dari semua album diratakan → navigasi bisa terus lanjut antar album
    const slides = useMemo(() => albums.flatMap((a, ai) => a.photos.map((url, pi) => ({ url, ai, pi }))), [albums]);
    const [pos, setPos] = useState(0);
    const touch = useRef<number | null>(null);

    useEffect(() => {
        if (album !== null) setPos(Math.max(0, slides.findIndex((s) => s.ai === album)));
    }, [album, slides]);

    const open = album !== null && slides.length > 0;
    const slide = slides[pos];
    const current = slide ? albums[slide.ai] : null;
    const total = slides.length;
    const go = (step: number) => setPos((p) => (p + step + total) % total);
    const onKey = (e: KeyboardEvent) => {
        if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    };
    const onTouchStart = (e: TouchEvent) => { touch.current = e.touches[0].clientX; };
    const onTouchEnd = (e: TouchEvent) => {
        if (touch.current === null) return;
        const dx = e.changedTouches[0].clientX - touch.current;
        touch.current = null;
        if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
    };

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent onKeyDown={onKey} overlayClassName="bg-neutral-900/85" className="max-w-5xl">
                {slide && current && (
                    <figure>
                        <div className="relative select-none" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
                            <img key={slide.url} src={slide.url} alt={current.title ?? 'Foto galeri'} draggable={false}
                                className="mx-auto max-h-[70vh] w-auto animate-pop rounded-2xl object-contain shadow-2xl" />
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
                        <figcaption className="mt-4 text-center text-white">
                            <div className="flex items-center justify-center gap-3">
                                <DialogTitle className="font-jakarta text-base font-bold sm:text-lg">{current.title ?? 'Galeri Kegiatan'}</DialogTitle>
                                {current.photos.length > 1 && (
                                    <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold tabular-nums">{slide.pi + 1} / {current.photos.length}</span>
                                )}
                            </div>
                            <DialogDescription className="mx-auto mt-1 max-w-2xl text-sm text-white/80">{current.subtitle ?? ''}</DialogDescription>
                            {current.photos.length > 1 && (
                                <div className="mt-3 flex justify-center gap-1.5" aria-hidden="true">
                                    {current.photos.map((u, i) => (
                                        <span key={u + i} className={`h-1.5 rounded-full transition-all ${i === slide.pi ? 'w-5 bg-gold-400' : 'w-1.5 bg-white/40'}`} />
                                    ))}
                                </div>
                            )}
                        </figcaption>
                    </figure>
                )}
            </DialogContent>
        </Dialog>
    );
}
