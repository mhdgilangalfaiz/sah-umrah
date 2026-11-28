import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/Components/landing/lib';

interface PortalCardProps {
    title: string;
    icon: LucideIcon;
    action?: ReactNode;
    children: ReactNode;
    className?: string;
}

/** Kartu kaca putih untuk blok dashboard. */
export default function PortalCard({ title, icon: Icon, action, children, className }: PortalCardProps) {
    return (
        <section className={cn('min-w-0 rounded-3xl border border-white bg-gradient-to-br from-white/85 via-white/70 to-white/55 p-4 shadow-[0_10px_30px_-16px_rgba(11,77,42,0.3),inset_0_1px_0_#fff] sm:p-5', className)}>
            <div className="mb-3 flex items-center justify-between gap-3 sm:mb-4">
                <h2 className="flex min-w-0 items-center gap-2 font-jakarta text-[15px] font-extrabold tracking-tight text-neutral-900 sm:gap-2.5 sm:text-lg">
                    <Icon className="h-5 w-5 shrink-0 text-primary-700" aria-hidden="true" /> <span className="truncate">{title}</span>
                </h2>
                {action && <div className="shrink-0">{action}</div>}
            </div>
            {children}
        </section>
    );
}
