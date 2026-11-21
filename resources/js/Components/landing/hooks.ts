import { useEffect, useState } from 'react';

export interface ScrollState {
    /** sudah digulir > 20px */
    scrolled: boolean;
    /** navbar disembunyikan (gulir ke bawah melewati 240px) */
    hidden: boolean;
    /** posisi > 600px (tombol kembali ke atas) */
    far: boolean;
}

/** Status gulir halaman, dihitung sekali per frame. */
export function useScrollState(): ScrollState {
    const [state, setState] = useState<ScrollState>({ scrolled: false, hidden: false, far: false });
    useEffect(() => {
        let last = window.scrollY;
        let frame = 0;
        const update = () => {
            frame = 0;
            const y = window.scrollY;
            const delta = y - last;
            setState((prev) => {
                // abaikan getaran kecil agar navbar tidak berkedip
                const hidden = y <= 240 ? false : Math.abs(delta) < 6 ? prev.hidden : delta > 0;
                const next = { scrolled: y > 20, hidden, far: y > 600 };
                return next.scrolled === prev.scrolled && next.hidden === prev.hidden && next.far === prev.far ? prev : next;
            });
            last = y;
        };
        const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
        update();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(frame); };
    }, []);
    return state;
}

/** Section yang sedang terlihat di tengah layar. */
export function useActiveSection(ids: string[]): string {
    const [active, setActive] = useState(ids[0]);
    const key = ids.join(',');
    useEffect(() => {
        const els = key.split(',').map((id) => document.getElementById(id)).filter((el): el is HTMLElement => !!el);
        const io = new IntersectionObserver(
            (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
            { rootMargin: '-45% 0px -50% 0px' },
        );
        els.forEach((el) => io.observe(el));
        return () => io.disconnect();
    }, [key]);
    return active;
}
