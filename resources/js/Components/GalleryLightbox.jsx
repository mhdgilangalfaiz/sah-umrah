import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useCallback, useEffect, useRef } from 'react';
import { cx } from './ui';

/**
 * Tampilan foto layar penuh untuk galeri.
 * Navigasi: tombol ‹ ›, tombol panah keyboard, geser (swipe) di layar sentuh, atau klik thumbnail.
 */
export default function GalleryLightbox({ photos, index, onIndex, onClose }) {
    const total = photos.length;
    const go = useCallback((step) => onIndex((index + step + total) % total), [index, total, onIndex]);
    const touchX = useRef(null);
    const thumbs = useRef(null);

    useEffect(() => {
        const key = (e) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowRight') go(1);
            if (e.key === 'ArrowLeft') go(-1);
        };
        document.addEventListener('keydown', key);
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.removeEventListener('keydown', key); document.body.style.overflow = prev; };
    }, [go, onClose]);

    // Thumbnail aktif selalu terlihat
    useEffect(() => {
        thumbs.current?.children[index]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }, [index]);

    const photo = photos[index];

    return (
        <div className="fixed inset-0 z-[60] flex flex-col bg-slate-950/95 text-white" role="dialog" aria-modal="true" aria-label="Galeri foto"
            onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
            onTouchEnd={(e) => {
                if (touchX.current === null) return;
                const dx = e.changedTouches[0].clientX - touchX.current;
                if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
                touchX.current = null;
            }}>
            <div className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="font-semibold tabular-nums">{index + 1} / {total}</span>
                <button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Tutup"><X className="h-5 w-5" /></button>
            </div>

            <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 sm:px-16" onClick={onClose}>
                <img key={photo.image_url} src={photo.image_url} alt={photo.title}
                    className="max-h-full max-w-full animate-pop rounded-lg object-contain shadow-2xl" onClick={(e) => e.stopPropagation()} />
                {total > 1 && (
                    <>
                        <NavButton side="left" onClick={(e) => { e.stopPropagation(); go(-1); }} label="Foto sebelumnya"><ChevronLeft className="h-6 w-6" /></NavButton>
                        <NavButton side="right" onClick={(e) => { e.stopPropagation(); go(1); }} label="Foto berikutnya"><ChevronRight className="h-6 w-6" /></NavButton>
                    </>
                )}
            </div>

            {photo.title && <p className="px-4 pt-3 text-center text-sm text-slate-200">{photo.title}</p>}

            {total > 1 && (
                <div ref={thumbs} className="flex gap-2 overflow-x-auto px-4 py-3 scrollbar-none sm:justify-center">
                    {photos.map((p, i) => (
                        <button key={p.id} onClick={() => onIndex(i)} aria-label={`Lihat foto ${i + 1}`}
                            className={cx('h-14 w-20 shrink-0 overflow-hidden rounded-md ring-2 transition', i === index ? 'ring-white' : 'opacity-50 ring-transparent hover:opacity-90')}>
                            <img src={p.image_url} alt="" className="h-full w-full object-cover" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

function NavButton({ side, onClick, label, children }) {
    return (
        <button onClick={onClick} aria-label={label}
            className={cx('absolute top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/15 backdrop-blur transition hover:bg-white/30', side === 'left' ? 'left-2 sm:left-4' : 'right-2 sm:right-4')}>
            {children}
        </button>
    );
}
