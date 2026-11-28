import { ArrowUp, Bot, X } from 'lucide-react';
import { router } from '@inertiajs/react';
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import ChatWidget from '@/Components/ChatWidget';

/*
 * Bertahan selama website terbuka (pindah halaman lewat Inertia tidak memuat ulang modul ini):
 *  - entered: tombol Chat Bot sudah pernah tampil → animasi "muncul dari bawah" hanya sekali di awal,
 *  - chatOpen: jendela chat tetap terbuka saat berpindah halaman.
 */
let entered = false;
let chatOpen = false;

/**
 * Kanan bawah: tombol "Kembali ke atas" (setelah 600px) dan pill "Chat Bot" yang membuka chatbot internal.
 * Bisa digeser (mouse/sentuh) ke mana saja di layar agar tidak menutupi isi halaman.
 * Setiap pindah halaman kembali ke posisi awal di kanan bawah.
 */
export default function FloatingActions({ showTop, chat }: { showTop: boolean; chat: boolean }) {
    const reduce = useReducedMotion();
    const firstEntrance = useRef(!entered).current; // true hanya pada tampilan pertama
    const [open, setOpenState] = useState(chatOpen);
    const setOpen = (next: boolean | ((o: boolean) => boolean)) => setOpenState((o) => {
        const v = typeof next === 'function' ? next(o) : next;
        chatOpen = v;
        return v;
    });

    useEffect(() => { entered = true; }, []);

    // geser: klik setelah menggeser tidak dianggap membuka chat
    const bounds = useRef<HTMLDivElement>(null);
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    // pindah halaman → kembali ke kanan bawah
    useEffect(() => router.on('navigate', () => {
        if (reduce) { x.set(0); y.set(0); return; }
        animate(x, 0, { duration: 0.3 });
        animate(y, 0, { duration: 0.3 });
    }), [x, y, reduce]);
    const moved = useRef(false);
    const guard = (fn: () => void) => () => { if (moved.current) return; fn(); };
    const toTop = () => window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });

    return (
        <>
            <div ref={bounds} className="pointer-events-none fixed inset-x-3 top-3 bottom-[6.25rem] z-40 sm:inset-x-4 sm:top-4 lg:bottom-4" aria-hidden="true" />
            <motion.div drag dragConstraints={bounds} dragMomentum={false} dragElastic={0.05} style={{ x, y, touchAction: 'none' }}
                onDragStart={() => { moved.current = true; }}
                onDragEnd={() => { setTimeout(() => { moved.current = false; }, 80); }}
                title="Geser untuk memindahkan"
                className="fixed bottom-[6.25rem] right-4 z-50 flex cursor-grab flex-col items-end gap-3 active:cursor-grabbing sm:right-6 lg:bottom-6">
                <AnimatePresence>
                    {showTop && !open && (
                        <motion.button type="button" onClick={guard(toTop)} aria-label="Kembali ke atas"
                            initial={reduce ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }} transition={{ duration: 0.25 }}
                            className="grid h-12 w-12 place-items-center rounded-full border border-primary-100 bg-white text-primary-700 shadow-lg transition-colors hover:bg-primary-700 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2">
                            <ArrowUp className="h-5 w-5" />
                        </motion.button>
                    )}
                </AnimatePresence>

                {chat && (
                    <motion.button type="button" onClick={guard(() => setOpen((o) => !o))} aria-label={open ? 'Tutup Chat Bot' : 'Buka Chat Bot'} aria-expanded={open}
                        initial={reduce || !firstEntrance ? false : { opacity: 0, y: 80, scale: 0.6 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={reduce || !firstEntrance ? undefined : { delay: 1, type: 'spring', stiffness: 420, damping: 14 }}
                        className="flex items-center gap-2.5 rounded-full bg-gradient-to-r from-primary-700 to-primary-900 py-3 pl-3.5 pr-5 text-sm font-bold text-white shadow-lg shadow-primary-900/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2">
                        <span className="relative grid h-8 w-8 place-items-center rounded-full bg-white/15">
                            {open ? <X className="h-4 w-4" aria-hidden="true" /> : <Bot className="h-5 w-5" aria-hidden="true" />}
                            {!open && (
                                <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3" aria-hidden="true">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75 motion-reduce:hidden" />
                                    <span className="relative inline-flex h-3 w-3 rounded-full bg-green-400 ring-2 ring-primary-900" />
                                </span>
                            )}
                        </span>
                        {open ? 'Tutup' : 'Chat Bot'}
                    </motion.button>
                )}
            </motion.div>
            {chat && <ChatWidget open={open} onOpenChange={setOpen} launcher={false} />}
        </>
    );
}
