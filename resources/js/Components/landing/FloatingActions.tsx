import { ArrowUp, Bot, X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useState } from 'react';
import ChatWidget from '@/Components/ChatWidget';

/** Kanan bawah: tombol "Kembali ke atas" (setelah 600px) dan pill "Chat Bot" yang membuka chatbot internal. */
export default function FloatingActions({ showTop, chat }: { showTop: boolean; chat: boolean }) {
    const reduce = useReducedMotion();
    const [open, setOpen] = useState(false);
    const toTop = () => window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });

    return (
        <>
            <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
                <AnimatePresence>
                    {showTop && !open && (
                        <motion.button type="button" onClick={toTop} aria-label="Kembali ke atas"
                            initial={reduce ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }} transition={{ duration: 0.25 }}
                            className="grid h-12 w-12 place-items-center rounded-full border border-primary-100 bg-white text-primary-700 shadow-lg transition-colors hover:bg-primary-700 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2">
                            <ArrowUp className="h-5 w-5" />
                        </motion.button>
                    )}
                </AnimatePresence>

                {chat && (
                    <motion.button type="button" onClick={() => setOpen((o) => !o)} aria-label={open ? 'Tutup Chat Bot' : 'Buka Chat Bot'} aria-expanded={open}
                        initial={reduce ? false : { opacity: 0, y: 80, scale: 0.6 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={reduce ? undefined : { delay: 1, type: 'spring', stiffness: 420, damping: 14 }}
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
            </div>
            {chat && <ChatWidget open={open} onOpenChange={setOpen} launcher={false} />}
        </>
    );
}
