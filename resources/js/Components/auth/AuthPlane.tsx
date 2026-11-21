import { CheckCircle2, XCircle } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion, type TargetAndTransition } from 'motion/react';
import { cn } from '@/Components/landing/lib';
import type { AuthMode, PlaneState } from './fields';

export const PLANE_SRC = '/images/auth/pesawat-sah.webp';

/** Gerakan pesawat per status. Hanya transform & opacity, tanpa filter. */
const MOTION: Record<PlaneState, TargetAndTransition> = {
    idle: {
        x: 0, y: [0, -12, 0], rotate: -6, scale: 1, opacity: 1,
        transition: { y: { duration: 4, repeat: Infinity, ease: 'easeInOut' }, default: { duration: 0.5 } },
    },
    // bergetar sebentar lalu menukik jatuh keluar bawah
    crash: {
        x: [0, -7, 7, -5, 5, 90], y: [0, 0, 0, 0, 0, 460], rotate: [-6, -11, -1, -9, -4, 75], opacity: [1, 1, 1, 1, 1, 0],
        transition: { duration: 1.4, times: [0, 0.07, 0.14, 0.21, 0.28, 1], ease: 'easeIn' },
    },
    // mundur sedikit lalu melesat ke kanan atas
    fly: {
        x: [0, -36, 760], y: [0, 14, -380], rotate: [-6, -2, -14], scale: [1, 1.02, 0.5], opacity: [1, 1, 0],
        transition: { duration: 1.15, times: [0, 0.22, 1], ease: 'easeIn' },
    },
};

interface AuthPlaneProps {
    state: PlaneState;
    mode: AuthMode;
    /** dipanggil saat animasi crash/fly selesai */
    onDone: () => void;
    className?: string;
}

/** Pesawat SAH dengan cincin orbit emas + badge status. */
export default function AuthPlane({ state, mode, onDone, className }: AuthPlaneProps) {
    const reduce = useReducedMotion();

    return (
        <div className={cn('pointer-events-none relative', className)}>
            {/* cincin orbit emas (border, bukan blur) */}
            <motion.span aria-hidden="true" animate={{ opacity: state === 'idle' ? 1 : 0 }}
                className="absolute left-[6%] top-1/2 h-[46%] w-[88%] -translate-y-1/2 -rotate-6 rounded-[50%] border-2 border-gold-500/70 shadow-[0_0_0_6px_rgba(232,185,35,0.12)]" />
            <motion.img src={PLANE_SRC} alt="Pesawat SAH" width={900} height={272} draggable={false}
                className="relative w-full select-none"
                initial={reduce ? false : { opacity: 0, x: -40, y: 0, rotate: -6 }}
                animate={reduce && state === 'idle' ? { rotate: -6 } : MOTION[state]}
                onAnimationComplete={() => { if (state !== 'idle') onDone(); }} />

            <AnimatePresence>
                {state !== 'idle' && (
                    <motion.p role="status" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className={cn('absolute left-1/2 top-full mt-2 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-bold text-white shadow-lg',
                            state === 'crash' ? 'bg-red-600' : 'bg-primary-700')}>
                        {state === 'crash'
                            ? <><XCircle className="h-4 w-4" aria-hidden="true" /> {mode === 'login' ? 'Login gagal - coba lagi' : 'Registrasi gagal - coba lagi'}</>
                            : <><CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Berhasil! Menuju dashboard...</>}
                    </motion.p>
                )}
            </AnimatePresence>
        </div>
    );
}
