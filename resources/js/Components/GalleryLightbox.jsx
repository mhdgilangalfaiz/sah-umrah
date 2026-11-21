import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useCallback, useEffect, useRef } from 'react';
import { cx } from './ui';

/**
 * Tampilan detail galeri (foto atau video) layar penuh.
 * Latar biru gelap, media bersudut bulat, dan judul dalam kapsul bergaris emas.
 * Navigasi: tombol ‹ ›, panah keyboard, atau geser (swipe) di layar sentuh. Esc untuk menutup.
 */
export default function GalleryLightbox({ items, index, onIndex, onClose }) {
    const total = items.length;
    const go = useCallback((step) => onIndex((index + step + total) % total), [index, total, onIndex]);
    const touchX = useRef(null);

    useEffect(() => {
        const key = (e) => {
            if (e.key === 'Escape') onClose();
            if (e.target?.tagName === 'VIDEO') return; // panah dipakai video untuk maju/mundur
            if (e.key === 'ArrowRight') go(1);
            if (e.key === 'ArrowLeft') go(-1);
        };
        document.addEventListener('keydown', key);
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.removeEventListener('keydown', key); document.body.style.overflow = prev; };
    }, [go, onClose]);

    const item = items[index];
    const isVideo = item.type === 'video';
    const stop = (e) => e.stopPropagation();
    const media = 'max-h-full max-w-full animate-pop rounded-2xl ring-1 ring-white/20 shadow-[0_30px_80px_-20px_rgba(0,0,0,.85)]';

    return (
        <div className="fixed inset-0 z-[60] flex animate-page-in flex-col bg-slate-900/40 text-white backdrop-blur-xl" role="dialog" aria-modal="true" aria-label={isVideo ? 'Video galeri' : 'Foto galeri'}
            onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
            onTouchEnd={(e) => {
                if (touchX.current === null) return;
                const dx = e.changedTouches[0].clientX - touchX.current;
                if (Math.abs(dx) > 60 && total > 1) go(dx < 0 ? 1 : -1);
                touchX.current = null;
            }}>
            {/* cahaya lembut di tengah */}

            {total > 1 && <span className="absolute left-5 top-6 z-10 rounded-full bg-black/30 px-3 py-1 text-sm font-medium tabular-nums text-white">{index + 1} / {total}</span>}
            <button onClick={onClose} aria-label="Tutup"
                className="absolute right-4 top-4 z-10 grid h-12 w-12 place-items-center rounded-full bg-white/10 ring-1 ring-white/15 transition hover:bg-white/20 sm:right-6 sm:top-5">
                <X className="h-6 w-6" />
            </button>

            <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-4 pt-20 sm:px-24" onClick={onClose}>
                {isVideo ? (
                    <video key={item.image_url} src={item.image_url} controls autoPlay playsInline className={cx(media, 'bg-black')} onClick={stop} />
                ) : (
                    <img key={item.image_url} src={item.image_url} alt={item.title} className={cx(media, 'object-contain')} onClick={stop} />
                )}
                {total > 1 && (
                    <>
                        <NavButton side="left" onClick={(e) => { stop(e); go(-1); }} label="Sebelumnya"><ChevronLeft className="h-6 w-6" /></NavButton>
                        <NavButton side="right" onClick={(e) => { stop(e); go(1); }} label="Berikutnya"><ChevronRight className="h-6 w-6" /></NavButton>
                    </>
                )}
            </div>

            <div className="relative flex items-center justify-center gap-4 px-4 pb-8 pt-3 sm:gap-8 sm:pb-10">
                {item.title && (
                    <>
                        <span className="h-px w-12 shrink-0 bg-gradient-to-r from-transparent to-gold-400 sm:w-36" />
                        <p className="max-w-[70vw] truncate rounded-full border border-gold-400/80 bg-brand-900/80 px-7 py-2 text-lg font-bold capitalize tracking-wide text-white shadow-[0_0_28px_-8px_rgba(201,162,75,.55)] sm:px-12 sm:text-2xl">
                            {item.title}
                        </p>
                        <span className="h-px w-12 shrink-0 bg-gradient-to-l from-transparent to-gold-400 sm:w-36" />
                    </>
                )}
            </div>
        </div>
    );
}

function NavButton({ side, onClick, label, children }) {
    return (
        <button onClick={onClick} aria-label={label}
            className={cx('absolute top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 ring-1 ring-white/15 backdrop-blur transition hover:bg-white/25',
                side === 'left' ? 'left-2 sm:left-6' : 'right-2 sm:right-6')}>
            {children}
        </button>
    );
}
