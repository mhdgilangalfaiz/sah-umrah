import { Link } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import type { MouseEvent, ReactNode } from 'react';
import { cn } from './lib';

export interface BottomNavItem {
    key: string;
    label: string;
    icon: LucideIcon;
    active: boolean;
    /** tujuan Inertia; bila tidak ada, onClick dipakai (mis. gulir ke section / buka menu) */
    href?: string;
    onClick?: (e: MouseEvent) => void;
    expanded?: boolean;
}

/**
 * Navigasi bawah khusus HP/tablet (disembunyikan mulai lg): bar kaca melayang dengan 5 menu.
 * Menu aktif: ikon putih di lingkaran hijau tua yang dikelilingi cincin neon hijau berputar.
 * `children` dirender tepat di atas bar (mis. popup "Layanan Kami").
 */
export default function BottomNav({ items, label, idPrefix, raised = false, children }: { items: BottomNavItem[]; label: string; idPrefix: string; /** true saat popup terbuka: di atas Chat Bot */ raised?: boolean; children?: ReactNode }) {
    const reduce = useReducedMotion();

    return (
        <div className={cn('pointer-events-none fixed inset-x-0 bottom-0 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden', raised ? 'z-[60]' : 'z-40')}>
            <div className="pointer-events-auto relative mx-auto max-w-md">
                {children}
                <nav aria-label={label}
                    className="rounded-[1.75rem] border border-white/70 bg-gradient-to-br from-white/75 via-white/60 to-primary-50/60 px-1.5 py-1.5 shadow-[0_18px_40px_-12px_rgba(11,77,42,0.45),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-xl backdrop-saturate-150">
                    <ul className="grid grid-cols-5">
                        {items.map((it) => {
                            const Icon = it.icon;
                            const inner = (
                                <>
                                    <span className="relative grid h-10 w-10 place-items-center">
                                        {it.active && (
                                            <motion.span layoutId={`${idPrefix}-glow`} className="absolute inset-0" transition={{ type: 'spring', stiffness: 420, damping: 32 }} aria-hidden="true">
                                                {/* cincin neon: gradasi kerucut berputar, dipotong jadi cincin oleh lingkaran dalam */}
                                                <span className={cn('absolute -inset-[3px] rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,#4ade80_80deg,#bbf7d0_120deg,#22c55e_170deg,transparent_230deg,transparent_360deg)] blur-[0.5px]',
                                                    !reduce && 'animate-[spin_2.2s_linear_infinite]')} />
                                                <span className="absolute -inset-[3px] rounded-full shadow-[0_0_14px_2px_rgba(74,222,128,0.55)] motion-safe:animate-pulse" />
                                                <span className="absolute inset-0 rounded-full bg-gradient-to-br from-primary-700 to-primary-900" />
                                            </motion.span>
                                        )}
                                        <Icon className={cn('relative h-5 w-5 transition-colors', it.active ? 'text-white drop-shadow-[0_0_6px_rgba(187,247,208,0.9)]' : 'text-primary-700')} aria-hidden="true" />
                                    </span>
                                    <span className={cn('mt-0.5 max-w-full truncate text-[10px] leading-tight', it.active ? 'font-extrabold text-primary-900' : 'font-semibold text-neutral-600')}>{it.label}</span>
                                </>
                            );
                            const cls = 'flex w-full flex-col items-center rounded-2xl px-0.5 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500';
                            return (
                                <li key={it.key} className="min-w-0">
                                    {it.href ? (
                                        <Link href={it.href} onClick={it.onClick} className={cls} aria-current={it.active ? 'page' : undefined}>{inner}</Link>
                                    ) : (
                                        <button type="button" onClick={it.onClick} className={cls} aria-expanded={it.expanded} aria-current={it.active ? 'page' : undefined}>{inner}</button>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </nav>
            </div>
        </div>
    );
}
