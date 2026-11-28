import { motion, useReducedMotion, type Variants } from 'motion/react';
import type { ReactNode } from 'react';

/** Arah masuk elemen: fade-up (bawaan), dari kiri/kanan, atau zoom. */
export type RevealVariant = 'up' | 'left' | 'right' | 'zoom';

const HIDDEN: Record<RevealVariant, { opacity: number; x?: number; y?: number; scale?: number }> = {
    up: { opacity: 0, y: 24 },
    left: { opacity: 0, x: -40 },
    right: { opacity: 0, x: 40 },
    zoom: { opacity: 0, scale: 0.92 },
};

export const revealVariants = (variant: RevealVariant = 'up'): Variants => ({
    hidden: HIDDEN[variant],
    show: { opacity: 1, x: 0, y: 0, scale: 1, transition: { duration: 0.6, ease: 'easeOut' } },
});

/* 'some' + margin: cukup sebagian kecil masuk layar. Angka persen (mis. 0.2) membuat grid yang lebih tinggi dari
   layar HP (4 kartu paket bertumpuk ±3.900px) tidak pernah terpicu sehingga kartunya tetap transparan. */
const VIEWPORT = { once: true, amount: 'some', margin: '0px 0px -12% 0px' } as const;

interface RevealProps {
    children: ReactNode;
    variant?: RevealVariant;
    delay?: number;
    className?: string;
    as?: 'div' | 'li' | 'section' | 'figure';
}

/** Muncul saat masuk layar (sekali). Animasi mati bila pengguna memilih reduced motion. */
export function Reveal({ children, variant = 'up', delay = 0, className, as = 'div' }: RevealProps) {
    const reduce = useReducedMotion();
    if (reduce) {
        const Tag = as;
        return <Tag className={className}>{children}</Tag>;
    }
    const Tag = motion[as];
    const v = revealVariants(variant);
    return (
        <Tag className={className} initial="hidden" whileInView="show" viewport={VIEWPORT}
            variants={{ ...v, show: { ...(v.show as object), transition: { duration: 0.6, ease: 'easeOut', delay } } }}>
            {children}
        </Tag>
    );
}

interface StaggerProps {
    children: ReactNode;
    className?: string;
    gap?: number;
    as?: 'div' | 'ul';
    /** true: langsung jalan saat dimuat (hero), bukan menunggu terlihat */
    immediate?: boolean;
}

/** Wadah daftar; anak <StaggerItem> muncul berurutan. */
export function Stagger({ children, className, gap = 0.1, as = 'div', immediate = false }: StaggerProps) {
    const reduce = useReducedMotion();
    if (reduce) {
        const Tag = as;
        return <Tag className={className}>{children}</Tag>;
    }
    const Tag = motion[as];
    const trigger = immediate ? { animate: 'show' } : { whileInView: 'show', viewport: VIEWPORT };
    return (
        <Tag className={className} initial="hidden" {...trigger} variants={{ hidden: {}, show: { transition: { staggerChildren: gap } } }}>
            {children}
        </Tag>
    );
}

interface StaggerItemProps {
    children: ReactNode;
    className?: string;
    variant?: RevealVariant;
    as?: 'div' | 'li' | 'span' | 'p' | 'h1';
}

export function StaggerItem({ children, className, variant = 'up', as = 'div' }: StaggerItemProps) {
    const reduce = useReducedMotion();
    if (reduce) {
        const Tag = as;
        return <Tag className={className}>{children}</Tag>;
    }
    const Tag = motion[as];
    return <Tag className={className} variants={revealVariants(variant)}>{children}</Tag>;
}
