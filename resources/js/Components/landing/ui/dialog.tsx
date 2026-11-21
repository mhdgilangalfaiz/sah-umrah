import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { cn } from '../lib';

/** Dialog bergaya shadcn/ui di atas Radix (fokus terkunci, Esc menutup, aria otomatis). */
export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
export const DialogTitle = DialogPrimitive.Title;
export const DialogDescription = DialogPrimitive.Description;

interface DialogContentProps extends ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
    children: ReactNode;
    overlayClassName?: string;
    hideClose?: boolean;
}

export function DialogContent({ className, overlayClassName, children, hideClose, ...props }: DialogContentProps) {
    return (
        <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className={cn('fixed inset-0 z-[70] animate-page-in bg-neutral-900/60', overlayClassName)} />
            <DialogPrimitive.Content
                className={cn('landing-ds fixed left-1/2 top-1/2 z-[71] w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 font-jakarta [color-scheme:light] focus:outline-none', className)}
                {...props}
            >
                {children}
                {!hideClose && (
                    <DialogPrimitive.Close aria-label="Tutup"
                        className="absolute right-3 top-3 z-20 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-neutral-600 shadow-sm transition hover:bg-primary-100 hover:text-primary-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
                        <X className="h-5 w-5" />
                    </DialogPrimitive.Close>
                )}
            </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
    );
}
