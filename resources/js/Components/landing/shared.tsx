import type { ReactNode } from 'react';
import { cn } from './lib';
import { Reveal } from './motion';

/** Kelas tombol design system. */
export const btnPrimary = 'group inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary-700 to-primary-900 px-6 py-3.5 text-sm font-bold text-white shadow-md shadow-primary-700/25 transition hover:shadow-lg hover:shadow-primary-700/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 sm:text-base';
export const btnSecondary = 'group inline-flex items-center justify-center gap-2 rounded-full border-2 border-primary-700 bg-white px-6 py-3 text-sm font-bold text-primary-700 transition hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 sm:text-base';
export const arrowShift = 'h-4 w-4 transition-transform duration-200 group-hover:translate-x-1';
export const card = 'rounded-2xl border border-primary-100 bg-white shadow-[0_4px_20px_-8px_rgba(11,77,42,0.12)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_-14px_rgba(11,77,42,0.25)]';

/** Bintang islami geometris 8 sudut (garis tipis). Warna mengikuti currentColor. */
export function IslamicStar({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true" className={cn('pointer-events-none', className)}>
            <rect x="20" y="20" width="60" height="60" />
            <rect x="20" y="20" width="60" height="60" transform="rotate(45 50 50)" />
            <circle cx="50" cy="50" r="17" />
            <rect x="33" y="33" width="34" height="34" />
            <rect x="33" y="33" width="34" height="34" transform="rotate(45 50 50)" />
            <circle cx="50" cy="50" r="44" strokeDasharray="2 4" />
        </svg>
    );
}

interface SectionHeadingProps {
    title: string;
    subtitle?: string;
    align?: 'center' | 'left';
    action?: ReactNode;
    className?: string;
}

/** Judul section hijau diapit garis tipis (tengah) atau diikuti garis (kiri). */
export function SectionHeading({ title, subtitle, align = 'center', action, className }: SectionHeadingProps) {
    if (align === 'left') {
        return (
            <Reveal className={cn('mb-8', className)}>
                <div className="flex items-center gap-4">
                    <h2 className="shrink-0 font-jakarta text-2xl font-extrabold tracking-tight text-primary-700 sm:text-3xl">{title}</h2>
                    <span className="h-px flex-1 bg-gradient-to-r from-primary-500/40 to-transparent" />
                    {action}
                </div>
                {subtitle && <p className="mt-2 text-sm text-neutral-600 sm:text-base">{subtitle}</p>}
            </Reveal>
        );
    }
    return (
        <Reveal className={cn('relative mb-10', className)}>
            <div className="flex items-center justify-center gap-4">
                <span className="h-px w-10 bg-gradient-to-r from-transparent to-primary-500/50 sm:w-24" />
                <h2 className="text-center font-jakarta text-2xl font-extrabold tracking-tight text-primary-700 sm:text-3xl">{title}</h2>
                <span className="h-px w-10 bg-gradient-to-l from-transparent to-primary-500/50 sm:w-24" />
            </div>
            {subtitle && <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-neutral-600 sm:text-base">{subtitle}</p>}
            {action && <div className="absolute right-0 top-1/2 hidden -translate-y-1/2 xl:block">{action}</div>}
        </Reveal>
    );
}

export function WhatsAppIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
            <path d="M17.5 14.4c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.4-.5c.2-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.2-.3-.3-.6-.4zM12 21.8c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.7 1 1-3.6-.2-.4A9.8 9.8 0 1112 21.8zm8.4-18.2A11.8 11.8 0 002 17.8L.3 24l6.4-1.7A11.8 11.8 0 0024 12c0-3.2-1.2-6.1-3.6-8.4z" />
        </svg>
    );
}

export const SOCIAL_PATHS: Record<string, string> = {
    instagram: 'M12 2.2c3.2 0 3.6 0 4.8.1 1.2.1 1.8.2 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.4 1.1.4 2.2.1 1.3.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 1.2-.2 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1.1.4-2.2.4-1.3.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-1.2-.1-1.8-.2-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1.1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8c.1-1.2.2-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1.1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2zm0 4.7a5.1 5.1 0 100 10.2 5.1 5.1 0 000-10.2zm0 8.4a3.3 3.3 0 110-6.6 3.3 3.3 0 010 6.6zm5.3-9.8a1.2 1.2 0 100 2.4 1.2 1.2 0 000-2.4z',
    facebook: 'M22 12a10 10 0 10-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.3v7A10 10 0 0022 12z',
    youtube: 'M23.5 6.2a3 3 0 00-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 00.5 6.2 31 31 0 000 12a31 31 0 00.5 5.8 3 3 0 002.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 002.1-2.1A31 31 0 0024 12a31 31 0 00-.5-5.8zM9.6 15.6V8.4l6.2 3.6-6.2 3.6z',
    tiktok: 'M19.6 6.7a4.8 4.8 0 01-3.8-4.2V2h-3.4v13.4a2.9 2.9 0 11-2-2.7V9.2a6.3 6.3 0 105.4 6.2V8.7a8.2 8.2 0 004.8 1.5V6.8a4.8 4.8 0 01-1-.1z',
};
