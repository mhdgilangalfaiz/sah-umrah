import { Volume2, VolumeX } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from './lib';

const PREF = 'sah.gallery.audio'; // '1' = pengunjung pernah menyalakan
const VOLUME = 0.45;
const FADE_MS = 1200;

function readPref(): boolean {
    try { return window.localStorage.getItem(PREF) === '1'; } catch { return false; }
}
function writePref(on: boolean): void {
    try { window.localStorage.setItem(PREF, on ? '1' : '0'); } catch { /* penyimpanan tidak tersedia */ }
}

interface AmbientAudioProps {
    src: string;
    title?: string | null;
    /** lightbox sedang terbuka */
    active: boolean;
}

/**
 * Audio suasana galeri. Tidak pernah berbunyi tanpa aksi pengunjung:
 * diputar saat tombol 🔊 ditekan (atau saat lightbox dibuka bila sebelumnya ia menyalakannya),
 * volume naik pelan (fade-in), berulang, dan berhenti begitu lightbox ditutup.
 */
export default function AmbientAudio({ src, title, active }: AmbientAudioProps) {
    const audio = useRef<HTMLAudioElement | null>(null);
    const fade = useRef<number>(0);
    const [playing, setPlaying] = useState(false);

    const fadeTo = (target: number, done?: () => void) => {
        const el = audio.current;
        if (!el) return;
        window.clearInterval(fade.current);
        const step = (target - el.volume) / (FADE_MS / 50);
        fade.current = window.setInterval(() => {
            const next = el.volume + step;
            if ((step >= 0 && next >= target) || (step < 0 && next <= target)) {
                el.volume = target;
                window.clearInterval(fade.current);
                done?.();
            } else {
                el.volume = Math.min(1, Math.max(0, next));
            }
        }, 50);
    };

    const play = () => {
        const el = audio.current ?? (audio.current = Object.assign(new Audio(src), { loop: true, preload: 'none' }));
        el.volume = 0;
        el.play().then(() => { setPlaying(true); fadeTo(VOLUME); }).catch(() => setPlaying(false));
    };
    const stop = (remember = true) => {
        if (remember) writePref(false);
        setPlaying(false);
        fadeTo(0, () => audio.current?.pause());
    };

    // lightbox dibuka (klik pengunjung) → lanjutkan bila ia pernah menyalakan; ditutup → berhenti
    useEffect(() => {
        if (active && readPref()) play();
        if (!active && audio.current && !audio.current.paused) stop(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active]);

    // bersihkan saat halaman ditinggal
    useEffect(() => () => { window.clearInterval(fade.current); audio.current?.pause(); }, []);

    return (
        <button type="button" onClick={() => (playing ? stop() : (writePref(true), play()))}
            aria-pressed={playing} aria-label={playing ? 'Matikan audio suasana' : 'Putar audio suasana'}
            title={title ?? 'Audio suasana'}
            className={cn('inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-bold shadow-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500',
                playing ? 'bg-gold-500 text-neutral-900' : 'bg-white/90 text-primary-900 hover:bg-white')}>
            {playing ? <Volume2 className="h-4 w-4 animate-pulse" aria-hidden="true" /> : <VolumeX className="h-4 w-4" aria-hidden="true" />}
            <span className="max-w-[160px] truncate">{playing ? (title ?? 'Sedang diputar') : 'Putar suasana'}</span>
        </button>
    );
}
