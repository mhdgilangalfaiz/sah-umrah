import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
import { cn } from '../lib';

/** Sheet (panel samping) bergaya shadcn/ui: Radix Dialog + animasi geser dari kanan. */
interface SheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    children: ReactNode;
    className?: string;
    side?: 'left' | 'right';
}

export function Sheet({ open, onOpenChange, title, children, className, side = 'right' }: SheetProps) {
    const reduce = useReducedMotion();
    const off = side === 'right' ? '100%' : '-100%';
    return (
        <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
            <AnimatePresence>
                {open && (
                    <DialogPrimitive.Portal forceMount>
                        <DialogPrimitive.Overlay asChild forceMount>
                            <motion.div className="fixed inset-0 z-[70] bg-neutral-900/50"
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} />
                        </DialogPrimitive.Overlay>
                        <DialogPrimitive.Content asChild forceMount aria-describedby={undefined}>
                            <motion.div
                                className={cn('landing-ds fixed inset-y-0 z-[71] flex w-[86%] max-w-sm flex-col bg-white font-jakarta shadow-2xl [color-scheme:light] focus:outline-none', side === 'right' ? 'right-0' : 'left-0', className)}
                                initial={reduce ? { opacity: 0 } : { x: off }} animate={reduce ? { opacity: 1 } : { x: 0 }} exit={reduce ? { opacity: 0 } : { x: off }}
                                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
                                <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>
                                <DialogPrimitive.Close aria-label="Tutup menu"
                                    className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-full text-neutral-600 transition hover:bg-primary-100 hover:text-primary-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
                                    <X className="h-5 w-5" />
                                </DialogPrimitive.Close>
                                {children}
                            </motion.div>
                        </DialogPrimitive.Content>
                    </DialogPrimitive.Portal>
                )}
            </AnimatePresence>
        </DialogPrimitive.Root>
    );
}
