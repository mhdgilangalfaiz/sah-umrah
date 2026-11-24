import { CalendarDays, Check, ChevronLeft, ChevronRight, Expand, Image as ImageIcon, MapPin, Share2, Video, X, ZoomIn, ZoomOut } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, TouchEvent } from 'react';
import AmbientAudio from './AmbientAudio';
import { cn } from './lib';
import type { GalleryPhoto } from './types';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from './ui/dialog';

interface GalleryLightboxProps {
    albums: GalleryPhoto[];
    album: number | null; // item yang dibuka
    onClose: () => void;
    audio?: { url: string; title: string | null } | null;
}

type Slide = { ai: number; pi: number; url: string; video: boolean };

const glassBtn = 'grid h-9 w-9 place-items-center rounded-full bg-white/85 text-primary-900 shadow-md backdrop-blur transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500';
const navBtn = 'absolute top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-primary-900 shadow-lg backdrop-blur transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500';

/**
 * Lightbox galeri bergaya website (panel putih-mint, aksen hijau & emas):
 * kiri = foto/video (hitungan, perbesar, layar penuh, ‹ ›, thumbnail), kanan = judul, subjudul, tanggal, lokasi, keterangan, Bagikan.
 * Geser (swipe) / tombol ‹ › / panah keyboard; setelah item terakhir lanjut ke item berikutnya.
 */
export default function GalleryLightbox({ albums, album, onClose, audio }: GalleryLightboxProps) {
    const slides = useMemo<Slide[]>(() => albums.flatMap((a, ai): Slide[] => (a.type === 'video'
        ? (a.video_url ? [{ ai, pi: 0, url: a.video_url, video: true }] : [])
        : a.photos.map((url, pi) => ({ ai, pi, url, video: false })))), [albums]);
    const [pos, setPos] = useState(0);
    const [zoom, setZoom] = useState(false);
    const [shared, setShared] = useState(false);
    const touch = useRef<number | null>(null);
    const stage = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (album !== null) setPos(Math.max(0, slides.findIndex((s) => s.ai === album)));
    }, [album, slides]);
    useEffect(() => { setZoom(false); }, [pos]);

    const open = album !== null && slides.length > 0;
    const slide = slides[pos];
    const current = slide ? albums[slide.ai] : null;
    const total = slides.length;
    const go = (step: number) => setPos((p) => (p + step + total) % total);
    const jump = (pi: number) => setPos(slides.findIndex((s) => s.ai === slide?.ai && s.pi === pi));

    const onKey = (e: KeyboardEvent) => {
        if ((e.target as HTMLElement).tagName === 'VIDEO') return;
        if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    };
    const onTouchStart = (e: TouchEvent) => { touch.current = e.touches[0].clientX; };
    const onTouchEnd = (e: TouchEvent) => {
        if (touch.current === null || zoom) return;
        const dx = e.changedTouches[0].clientX - touch.current;
        touch.current = null;
        if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
    };
    const fullscreen = () => {
        const el = stage.current;
        if (!el) return;
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        else el.requestFullscreen?.().catch(() => {});
    };
    const share = async () => {
        const url = `${window.location.origin}/#galeri`;
        const title = current?.title ?? 'Galeri Kegiatan SAH';
        try {
            if (navigator.share) await navigator.share({ title, text: current?.subtitle ?? title, url });
            else { await navigator.clipboard.writeText(url); setShared(true); window.setTimeout(() => setShared(false), 2000); }
        } catch { /* dibatalkan pengguna */ }
    };

    const isVideo = !!slide?.video;
    const count = current ? (current.type === 'video' ? 1 : current.photos.length) : 0;

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent hideClose onKeyDown={onKey} overlayClassName="bg-brand-950/60 backdrop-blur-sm"
                className="max-h-[92vh] max-w-[1080px] overflow-y-auto rounded-[1.75rem] border border-white bg-gradient-to-br from-white via-[#F7FBF8] to-[#EAF5EE] text-neutral-900 shadow-[0_30px_80px_-20px_rgba(11,77,42,0.55)] lg:overflow-hidden">
                {slide && current && (
                    <div className="relative grid gap-5 p-4 pb-12 sm:p-5 sm:pb-14 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-7 lg:p-6 lg:pb-14">
                        {/* ---------- media ---------- */}
                        <div className="min-w-0">
                            <div ref={stage} className="relative h-[42vh] select-none overflow-hidden rounded-2xl bg-brand-950 shadow-[0_12px_30px_-14px_rgba(11,77,42,0.6)] ring-1 ring-primary-900/10 sm:h-[52vh] lg:h-[56vh]"
                                onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
                                {isVideo ? (
                                    <video key={slide.url} src={slide.url} controls autoPlay playsInline className="h-full w-full bg-black object-contain" />
                                ) : (
                                    <>
                                        {/* latar buram agar foto tegak/miring tetap utuh tanpa ruang kosong hitam */}
                                        <img src={slide.url} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-60 blur-xl" />
                                        <div className={cn('relative h-full w-full', zoom && 'cursor-zoom-out overflow-auto')} onClick={() => zoom && setZoom(false)}>
                                            <img key={slide.url} src={slide.url} alt={current.title ?? 'Foto galeri'} draggable={false}
                                                className={cn('animate-pop', zoom ? 'h-auto w-[200%] max-w-none' : 'h-full w-full object-contain')} />
                                        </div>
                                    </>
                                )}

                                <span className="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/85 px-3 py-1 text-xs font-bold tabular-nums text-primary-900 shadow-md backdrop-blur">
                                    {isVideo ? <Video className="h-3.5 w-3.5" /> : <ImageIcon className="h-3.5 w-3.5" />}
                                    {isVideo ? 'Video' : `${slide.pi + 1} / ${count}`}
                                </span>
                                <span className="absolute right-3 top-3 flex gap-2">
                                    {!isVideo && (
                                        <button type="button" onClick={() => setZoom((z) => !z)} aria-label={zoom ? 'Perkecil' : 'Perbesar'} className={glassBtn}>
                                            {zoom ? <ZoomOut className="h-4 w-4" /> : <ZoomIn className="h-4 w-4" />}
                                        </button>
                                    )}
                                    <button type="button" onClick={fullscreen} aria-label="Layar penuh" className={glassBtn}><Expand className="h-4 w-4" /></button>
                                </span>

                                {total > 1 && (
                                    <>
                                        <button type="button" onClick={() => go(-1)} aria-label="Sebelumnya" className={`${navBtn} left-3`}><ChevronLeft className="h-5 w-5" /></button>
                                        <button type="button" onClick={() => go(1)} aria-label="Berikutnya" className={`${navBtn} right-3`}><ChevronRight className="h-5 w-5" /></button>
                                    </>
                                )}
                            </div>

                            {/* thumbnail foto dalam album yang sama */}
                            {!isVideo && count > 1 && (
                                <div className="mt-3 flex justify-center gap-2 overflow-x-auto p-1 scrollbar-none">
                                    {current.photos.map((u, i) => (
                                        <button key={u + i} type="button" onClick={() => jump(i)} aria-label={`Foto ${i + 1}`} aria-current={i === slide.pi}
                                            className={cn('h-12 w-[4.5rem] shrink-0 overflow-hidden rounded-lg ring-2 ring-offset-2 ring-offset-white transition sm:h-14 sm:w-20',
                                                i === slide.pi ? 'ring-primary-700' : 'opacity-60 ring-transparent hover:opacity-100')}>
                                            <img src={u} alt="" loading="lazy" className="h-full w-full object-cover" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* ---------- detail ---------- */}
                        <div className="flex min-w-0 flex-col lg:pt-12">
                            <span className="mb-2 inline-flex w-fit items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary-700 ring-1 ring-primary-100">
                                {isVideo ? <Video className="h-3.5 w-3.5" /> : <ImageIcon className="h-3.5 w-3.5" />}Galeri Kegiatan
                            </span>
                            <DialogTitle className="font-jakarta text-xl font-extrabold uppercase leading-tight tracking-tight text-primary-900 sm:text-2xl">{current.title ?? 'Galeri Kegiatan'}</DialogTitle>
                            {current.subtitle && <p className="mt-1.5 text-sm font-semibold text-gold-600">{current.subtitle}</p>}
                            {(current.date || current.location) && (
                                <div className="mt-4 space-y-2 text-sm text-slate-700">
                                    {current.date && (
                                        <p className="flex items-center gap-2.5"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary-50 text-primary-700"><CalendarDays className="h-3.5 w-3.5" /></span>{current.date}</p>
                                    )}
                                    {current.location && (
                                        <p className="flex items-center gap-2.5"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary-50 text-primary-700"><MapPin className="h-3.5 w-3.5" /></span>{current.location}</p>
                                    )}
                                </div>
                            )}
                            <div className="my-4 h-px bg-gradient-to-r from-gold-400/70 via-primary-900/10 to-transparent" />
                            <DialogDescription className="max-h-40 overflow-y-auto whitespace-pre-line text-sm leading-relaxed text-slate-700 lg:max-h-[30vh]">
                                {current.description || 'Dokumentasi perjalanan ibadah umrah bersama jamaah SAH.'}
                            </DialogDescription>
                            <div className="mt-5 flex flex-wrap items-center gap-2">
                                <button type="button" onClick={share}
                                    className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary-700 to-primary-900 px-5 text-sm font-bold text-white shadow-md shadow-primary-700/25 transition hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2">
                                    {shared ? <><Check className="h-4 w-4" />Tautan disalin</> : <><Share2 className="h-4 w-4" />Bagikan</>}
                                </button>
                                {audio && <AmbientAudio src={audio.url} title={audio.title} active={open} />}
                            </div>
                        </div>

                        <DialogClose aria-label="Tutup"
                            className="absolute right-3 top-3 z-20 grid h-9 w-9 place-items-center rounded-full border border-primary-100 bg-white text-primary-900 shadow-sm transition hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 lg:right-4 lg:top-4">
                            <X className="h-4 w-4" />
                        </DialogClose>

                        <Ornament />
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

/** Hiasan bawah khas website: gelombang hijau + garis emas, siluet masjid tipis di kanan */
function Ornament() {
    return (
        <svg aria-hidden="true" viewBox="0 0 1200 90" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 bottom-0 h-10 w-full sm:h-12">
            <path d="M0 70 C 220 40, 400 95, 620 66 S 1000 30, 1200 58 L1200 90 L0 90Z" fill="#0b4d2a" opacity="0.9" />
            <path d="M0 66 C 220 36, 400 91, 620 62 S 1000 26, 1200 54" fill="none" stroke="#e8b923" strokeWidth="3" />
        </svg>
    );
}
