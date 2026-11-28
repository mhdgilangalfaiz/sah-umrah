import { Link } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
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

/** Lingkaran aktif 46px menyembul ±20px di atas bar; lekukan radius 30px. */
const NOTCH_R = 30;

/**
 * Navigasi bawah khusus HP/tablet (disembunyikan mulai lg) bergaya "liquid navigation" yang glossy:
 * bar kaca putih mengilap; menu aktif jadi lingkaran hijau (warna website) yang menyembul keluar bar dengan
 * lekukan di bawahnya, label tampil di bawah lingkaran. Saat menu lain dipilih, lingkaran & lekukan meluncur.
 * `children` dirender tepat di atas bar (mis. popup "Layanan Kami").
 */
export default function BottomNav({ items, label, idPrefix, raised = false, children }: { items: BottomNavItem[]; label: string; idPrefix: string; /** true saat popup terbuka: di atas Chat Bot */ raised?: boolean; children?: ReactNode }) {
    const reduce = useReducedMotion();
    const activeIndex = items.findIndex((it) => it.active);
    const active = activeIndex >= 0 ? items[activeIndex] : null;
    const x = `${((activeIndex + 0.5) / items.length) * 100}%`;
    const spring = reduce ? { duration: 0 } : { type: 'spring' as const, stiffness: 380, damping: 32 };

    // lekukan = lingkaran transparan pada mask bar, posisinya mengikuti menu aktif
    const mask = `radial-gradient(circle ${NOTCH_R}px at var(--notch-x) 0px, transparent ${NOTCH_R - 0.5}px, #000 ${NOTCH_R}px)`;
    const ActiveIcon = active?.icon;

    return (
        <div className={cn('pointer-events-none fixed inset-x-0 bottom-0 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden', raised ? 'z-[60]' : 'z-40')}>
            <div className="pointer-events-auto relative mx-auto max-w-md pt-6">
                {children}
                <nav aria-label={label} className="relative">
                    {/* bar kaca glossy dengan lekukan */}
                    <motion.div aria-hidden="true" initial={false}
                        animate={{ '--notch-x': active ? x : '-20%' } as never} transition={spring}
                        style={{ WebkitMaskImage: mask, maskImage: mask } as never}
                        className="absolute inset-0 overflow-hidden rounded-[1.4rem] border border-white/80 bg-gradient-to-b from-white/90 via-white/75 to-primary-50/80 shadow-[0_18px_38px_-14px_rgba(11,77,42,0.45),inset_0_1px_0_#fff] backdrop-blur-xl backdrop-saturate-150">
                        {/* kilap kaca di separuh atas */}
                        <span className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/80 to-transparent" />
                    </motion.div>

                    {/* lingkaran hijau menu aktif, menyembul di atas bar */}
                    {active && ActiveIcon && (
                        <motion.span aria-hidden="true" initial={false} animate={{ left: x }} transition={spring}
                            className="pointer-events-none absolute -top-[21px] z-10 grid h-[46px] w-[46px] -translate-x-1/2 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-primary-500 via-primary-700 to-primary-900 shadow-[0_10px_20px_-6px_rgba(11,77,42,0.7)]">
                            {/* kilap pada lingkaran */}
                            <span className="absolute inset-x-1.5 top-1 h-1/2 rounded-full bg-gradient-to-b from-white/45 to-transparent" />
                            <AnimatePresence mode="popLayout" initial={false}>
                                <motion.span key={active.key} className="relative" initial={reduce ? false : { opacity: 0, scale: 0.5, y: 6 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.5 }} transition={{ duration: 0.22 }}>
                                    <ActiveIcon className="h-5 w-5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)]" />
                                </motion.span>
                            </AnimatePresence>
                        </motion.span>
                    )}

                    <ul className="relative grid h-[60px]" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
                        {items.map((it) => {
                            const Icon = it.icon;
                            const inner = it.active ? (
                                // ikon menu aktif ada di lingkaran di atas; di bar cukup labelnya (boleh melebar melewati kolom)
                                <motion.span layoutId={`${idPrefix}-label`} transition={spring}
                                    className="mt-[26px] whitespace-nowrap text-[11px] font-extrabold leading-tight text-primary-800">{it.label}</motion.span>
                            ) : (
                                <Icon className="h-[21px] w-[21px] text-primary-700/80 transition group-hover:text-primary-800" aria-hidden="true" />
                            );
                            const cls = 'group flex h-[60px] w-full flex-col items-center justify-center rounded-2xl px-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500';
                            return (
                                <li key={it.key} className="flex min-w-0 justify-center">
                                    {it.href ? (
                                        <Link href={it.href} onClick={it.onClick} className={cls} aria-label={it.label} aria-current={it.active ? 'page' : undefined}>{inner}</Link>
                                    ) : (
                                        <button type="button" onClick={it.onClick} className={cls} aria-label={it.label} aria-expanded={it.expanded} aria-current={it.active ? 'page' : undefined}>{inner}</button>
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
